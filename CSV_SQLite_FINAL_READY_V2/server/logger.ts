import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

// Создаем директорию для логов, если её нет
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Путь к файлу логов
const logFilePath = path.join(logsDir, 'log.txt');

// Типы логов
export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

/**
 * Записывает сообщение в файл логов
 * @param message Сообщение для записи
 * @param level Уровень логирования
 * @param source Источник сообщения (модуль/компонент)
 */
export function logToFile(message: string, level: LogLevel = LogLevel.INFO, source: string = 'app'): void {
  try {
    // Форматирование даты и времени с миллисекундами для точного логирования
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS');
    
    // Добавляем информацию о памяти и процессе для диагностики утечек памяти
    const memoryUsage = process.memoryUsage();
    const memoryInfo = `mem=${Math.round(memoryUsage.rss / 1024 / 1024)}MB`;
    
    // Учитываем многострочные сообщения для лучшей читаемости
    const messageLines = message.split('\n');
    const firstLine = messageLines[0];
    
    // Формируем основную строку лога
    let logMessage = `${timestamp} [${level}] [${source}] [${memoryInfo}] ${firstLine}\n`;
    
    // Если сообщение многострочное, добавляем отступы для остальных строк
    if (messageLines.length > 1) {
      const indent = ' '.repeat(timestamp.length + level.length + source.length + memoryInfo.length + 7); // +7 для скобок и пробелов
      for (let i = 1; i < messageLines.length; i++) {
        logMessage += `${indent}${messageLines[i]}\n`;
      }
    }
    
    // Выводим в консоль только в режиме разработки или для важных сообщений
    if (process.env.NODE_ENV !== 'production' || level === LogLevel.ERROR || level === LogLevel.WARNING) {
      // В консоли используем цвета для разных уровней логирования
      let consoleMessage = logMessage.trim();
      switch (level) {
        case LogLevel.ERROR:
          console.error(consoleMessage);
          break;
        case LogLevel.WARNING:
          console.warn(consoleMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(consoleMessage);
          break;
        default:
          console.log(consoleMessage);
      }
    }
    
    // Записываем в файл полное сообщение
    fs.appendFileSync(logFilePath, logMessage);
    
    // Если размер лога превышает 10 МБ, начинаем новый файл
    try {
      const stats = fs.statSync(logFilePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      if (fileSizeInMB > 10) {
        const archiveLogPath = path.join(
          logsDir, 
          `log-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.txt`
        );
        fs.renameSync(logFilePath, archiveLogPath);
        fs.writeFileSync(logFilePath, `${timestamp} [INFO] [logger] Starting new log file after rotating old log to ${archiveLogPath}\n`);
      }
    } catch (rotateError) {
      console.error(`Ошибка при ротации лог-файла: ${rotateError}`);
    }
  } catch (error) {
    console.error(`Ошибка при записи в лог: ${error}`);
  }
}

/**
 * Информационное сообщение
 */
export function info(message: string, source: string = 'app'): void {
  logToFile(message, LogLevel.INFO, source);
}

/**
 * Предупреждение
 */
export function warn(message: string, errorObj: any = null, source: string = 'app'): void {
  let fullMessage = message;
  
  // Добавляем детали ошибки, если они есть
  if (errorObj) {
    if (errorObj.message) {
      fullMessage += ` | Детали: ${errorObj.message}`;
    }
    if (errorObj.stack) {
      const stackTrace = errorObj.stack.split('\n').slice(0, 3).join('\n');
      fullMessage += ` | Stack: ${stackTrace}`;
    }
  }
  
  logToFile(fullMessage, LogLevel.WARNING, source);
}

/**
 * Сообщение об ошибке
 */
export function error(message: string, errorObj: any = null, source: string = 'app'): void {
  let fullMessage = message;
  
  // Добавляем детали ошибки, если они есть
  if (errorObj) {
    if (errorObj.message) {
      fullMessage += ` | Детали: ${errorObj.message}`;
    }
    if (errorObj.stack) {
      const stackTrace = errorObj.stack.split('\n').slice(0, 5).join('\n');
      fullMessage += ` | Stack: ${stackTrace}`;
    }
  }
  
  logToFile(fullMessage, LogLevel.ERROR, source);
}

/**
 * Отладочное сообщение (записывается всегда, но в консоль выводится только в режиме разработки)
 */
export function debug(message: string, source: string = 'app'): void {
  // Всегда записываем в файл для возможности отладки
  logToFile(message, LogLevel.DEBUG, source);
}

/**
 * Записывает информацию о запросе в лог
 */
export function logRequest(req: any, res: any, next: Function): void {
  const start = Date.now();
  const { method, url, ip } = req;
  
  // Логируем начало запроса
  debug(`Запрос ${method} ${url} от ${ip}`, 'http');
  
  // Когда запрос завершен
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    // Логируем завершение запроса
    const level = statusCode >= 400 ? LogLevel.WARNING : LogLevel.INFO;
    logToFile(`${method} ${url} ${statusCode} за ${duration}ms`, level, 'http');
  });
  
  next();
}

/**
 * Очищает старые логи (оставляет логи только за последние 7 дней)
 */
export function cleanOldLogs(daysToKeep: number = 7): void {
  try {
    info(`Проверка и очистка логов старше ${daysToKeep} дней`, 'logger');
    
    // Проверяем существование директории
    if (!fs.existsSync(logsDir)) {
      info('Директория логов не существует, создаем...', 'logger');
      fs.mkdirSync(logsDir, { recursive: true });
      return;
    }
    
    const files = fs.readdirSync(logsDir);
    info(`Найдено ${files.length} файлов в директории логов`, 'logger');
    
    const now = new Date();
    let cleanedCount = 0;
    let totalSize = 0;
    let freedSpace = 0;
    
    // Собираем статистику и удаляем старые файлы
    files.forEach((file) => {
      if (!file.endsWith('.txt')) return;
      
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const fileDate = new Date(stats.mtime);
      const fileSizeInMB = stats.size / (1024 * 1024);
      totalSize += fileSizeInMB;
      
      // Вычисляем разницу в днях
      const diffDays = Math.ceil((now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > daysToKeep) {
        freedSpace += fileSizeInMB;
        fs.unlinkSync(filePath);
        cleanedCount++;
        info(`Удален старый лог-файл: ${file} (возраст: ${diffDays} дней, размер: ${fileSizeInMB.toFixed(2)} МБ)`, 'logger');
      }
    });
    
    // Выводим итоги очистки
    if (cleanedCount > 0) {
      info(`Очистка завершена: удалено ${cleanedCount} файлов, освобождено ${freedSpace.toFixed(2)} МБ`, 'logger');
    } else {
      info(`Старые логи не найдены. Общий размер логов: ${totalSize.toFixed(2)} МБ`, 'logger');
    }
    
    // Проверяем, сохранено ли текущее лог-сообщение
    // Если файл log.txt не существует, создаем его
    if (!fs.existsSync(logFilePath)) {
      fs.writeFileSync(logFilePath, `${format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')} [INFO] [logger] Создан новый файл логов\n`);
      info('Создан новый файл логов', 'logger');
    }
  } catch (error) {
    console.error(`Ошибка при очистке старых логов: ${error}`);
    
    // В случае серьезной ошибки пытаемся гарантировать, что директория логов существует
    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      // Если файл log.txt не существует, создаем его
      if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, `${format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS')} [ERROR] [logger] Ошибка при очистке логов: ${error}\n`);
      }
    } catch (criticalError) {
      console.error(`Критическая ошибка при работе с файлами логов: ${criticalError}`);
    }
  }
}

// Экспортируем модули для удобного импорта
export default {
  info,
  warn,
  error,
  debug,
  logRequest,
  cleanOldLogs
};