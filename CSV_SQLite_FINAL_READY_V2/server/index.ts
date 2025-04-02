import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import logger, { LogLevel } from "./logger";

const app = express();
// Увеличиваем лимит размера запроса до 50 МБ для обработки больших CSV файлов
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Инициализируем логирование
logger.info('Приложение запускается', 'app');
logger.cleanOldLogs(7); // Удаляем логи старше 7 дней

// Добавляем middleware для логирования запросов
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      // Логируем в консоль и файл
      log(logLine);
      
      // Выбираем уровень логирования в зависимости от статуса ответа
      if (res.statusCode >= 500) {
        logger.error(logLine, null, 'http');
      } else if (res.statusCode >= 400) {
        logger.warn(logLine, 'http');
      } else {
        logger.info(logLine, 'http');
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Извлекаем дополнительную информацию из запроса для более информативного логирования
    const requestInfo = {
      method: req.method,
      path: req.path,
      query: req.query,
      // Не логируем полное тело запроса, так как оно может быть очень большим (CSV данные)
      // Вместо этого логируем его размер
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      contentType: req.headers['content-type'],
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
    
    // Логируем ошибку с деталями запроса
    logger.error(
      `Ошибка при обработке запроса ${req.method} ${req.path}: ${message}\nRequest info: ${JSON.stringify(requestInfo, null, 2)}`, 
      err, 
      'error-handler'
    );
    
    // Отправляем клиенту только сообщение об ошибке без деталей
    res.status(status).json({ 
      message,
      status,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    // В режиме разработки выводим stacktrace в консоль, но не выбрасываем исключение
    if (app.get("env") === "development") {
      console.error(err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0", // Используем 0.0.0.0 для доступа с других устройств в сети
  }, () => {
    log(`serving on port ${port}`);
    logger.info(`Сервер запущен на порту ${port}`, 'server');
    
    // Логируем информацию о режиме хранилища
    if (process.env.USE_MYSQL === 'true') {
      logger.info('Используется MySQL хранилище данных', 'storage');
    } else {
      logger.warn('Используется in-memory хранилище данных - данные будут потеряны при перезапуске', 'storage');
    }
  });
})();