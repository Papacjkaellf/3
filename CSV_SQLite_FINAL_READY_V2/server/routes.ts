import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { csvRowSchema } from "@shared/schema";
import logger from "./logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiRouter = app.route("/api");
  
  // Get all databases
  app.get("/api/databases", async (req, res) => {
    try {
      logger.debug("Получение списка баз данных", 'api');
      const databases = await storage.getDatabases();
      logger.debug(`Отправка ${databases.length} баз данных клиенту`, 'api');
      res.json(databases);
    } catch (error) {
      logger.error("Ошибка при получении списка баз данных", error, 'api');
      res.status(500).json({ message: "Failed to fetch databases" });
    }
  });
  
  // Create a database
  app.post("/api/databases", async (req, res) => {
    try {
      logger.debug("Запрос на создание новой базы данных", 'api');
      
      const schema = z.object({
        name: z.string().min(1).max(50),
        importCity: z.string().optional(),
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn("Некорректные данные при создании базы данных", result.error, 'api');
        return res.status(400).json({ message: "Invalid database data" });
      }
      
      const { name, importCity } = result.data;
      logger.debug(`Создание базы данных с именем '${name}' и городом '${importCity || "не указан"}'`, 'api');
      
      // Check if database with this name already exists
      const existingDb = await storage.getDatabaseByName(name);
      if (existingDb) {
        logger.warn(`База данных с именем '${name}' уже существует`, null, 'api');
        return res.status(400).json({ message: "Database with this name already exists" });
      }
      
      const database = await storage.createDatabase({ name, importCity });
      logger.info(`Создана новая база данных: '${name}' (ID: ${database.id})`, 'api');
      res.status(201).json(database);
    } catch (error) {
      logger.error("Ошибка при создании базы данных", error, 'api');
      res.status(500).json({ message: "Failed to create database" });
    }
  });
  
  // Get records for a database with pagination
  app.get("/api/databases/:databaseId/records", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const pageSizeParam = req.query.pageSize as string;
      const pageSize = pageSizeParam === "all" ? -1 : parseInt(pageSizeParam) || 50;
      
      // Apply filters if present
      if (req.query.text || req.query.filterType) {
        const filteredRecords = await storage.filterRecords(databaseId, {
          column: req.query.column as string,
          text: req.query.text as string,
          filterType: req.query.filterType as any,
        });
        
        const totalCount = filteredRecords.length;
        
        // Handle pagination for filtered results
        let result;
        if (pageSize === -1) {
          result = filteredRecords;
        } else {
          const start = (page - 1) * pageSize;
          result = filteredRecords.slice(start, start + pageSize);
        }
        
        return res.json({
          records: result,
          totalCount,
          page,
          pageSize
        });
      }
      
      // Regular pagination
      const records = await storage.getRecords(databaseId, page, pageSize);
      const totalCount = await storage.getRecordCount(databaseId);
      
      res.json({
        records,
        totalCount,
        page,
        pageSize
      });
    } catch (error) {
      console.error("Error fetching records:", error);
      res.status(500).json({ message: "Failed to fetch records" });
    }
  });
  
  // Get columns for a database
  app.get("/api/databases/:databaseId/columns", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      
      const columns = await storage.getColumns(databaseId);
      res.json(columns);
    } catch (error) {
      console.error("Error fetching columns:", error);
      res.status(500).json({ message: "Failed to fetch columns" });
    }
  });
  
  // Update column
  app.patch("/api/columns/:columnId", async (req, res) => {
    try {
      const columnId = parseInt(req.params.columnId);
      if (isNaN(columnId)) {
        return res.status(400).json({ message: "Invalid column ID" });
      }
      
      const schema = z.object({
        visible: z.boolean().optional(),
        width: z.number().min(40).optional(),
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid column data" });
      }
      
      const updatedColumn = await storage.updateColumn(columnId, result.data);
      if (!updatedColumn) {
        return res.status(404).json({ message: "Column not found" });
      }
      
      res.json(updatedColumn);
    } catch (error) {
      console.error("Error updating column:", error);
      res.status(500).json({ message: "Failed to update column" });
    }
  });
  
  // Get duplicates count
  app.get("/api/databases/:databaseId/duplicates/count", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      
      const count = await storage.getDuplicateCount(databaseId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching duplicate count:", error);
      res.status(500).json({ message: "Failed to fetch duplicate count" });
    }
  });
  
  // Get duplicates
  app.get("/api/databases/:databaseId/duplicates", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      
      const duplicates = await storage.getDuplicates(databaseId);
      res.json(duplicates);
    } catch (error) {
      console.error("Error fetching duplicates:", error);
      res.status(500).json({ message: "Failed to fetch duplicates" });
    }
  });
  
  // Delete exact duplicates
  app.delete("/api/databases/:databaseId/exact-duplicates", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      
      const result = await storage.deleteExactDuplicates(databaseId);
      res.json({ success: true, result });
    } catch (error) {
      console.error("Error deleting exact duplicates:", error);
      res.status(500).json({ message: "Failed to delete exact duplicates" });
    }
  });

  // Delete duplicates
  app.delete("/api/databases/:databaseId/duplicates", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      
      const deletedCount = await storage.deleteDuplicates(databaseId);
      res.json({ deletedCount });
    } catch (error) {
      console.error("Error deleting duplicates:", error);
      res.status(500).json({ message: "Failed to delete duplicates" });
    }
  });
  
  // Clear all records from a database while preserving structure
  app.delete("/api/databases/:databaseId/clear", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      
      const deletedCount = await storage.clearDatabase(databaseId);
      res.json({ deletedCount });
    } catch (error) {
      console.error("Error clearing database:", error);
      res.status(500).json({ message: "Failed to clear database" });
    }
  });
  
  // Check schema for a database
  app.post("/api/databases/:databaseId/check-schema", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      
      // Validate the sample data
      const schema = z.object({
        sample: csvRowSchema
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid sample data" });
      }
      
      const { sample } = result.data;
      const newColumns = await storage.checkSchema(databaseId, sample);
      
      res.status(200).json(newColumns);
    } catch (error) {
      console.error("Error checking schema:", error);
      res.status(500).json({ message: "Failed to check schema" });
    }
  });
  
  // Reset schema for a database
  app.post("/api/databases/:databaseId/reset-schema", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        return res.status(404).json({ message: "Database not found" });
      }
      
      // Validate the sample data
      const schema = z.object({
        sample: csvRowSchema
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid sample data" });
      }
      
      const { sample } = result.data;
      await storage.resetDatabase(databaseId, sample);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error resetting schema:", error);
      res.status(500).json({ message: "Failed to reset schema" });
    }
  });

  // Import CSV data
  app.post("/api/databases/:databaseId/import", async (req, res) => {
    try {
      const databaseId = parseInt(req.params.databaseId);
      if (isNaN(databaseId)) {
        logger.warn(`Некорректный ID базы данных при импорте: ${req.params.databaseId}`, null, 'api');
        return res.status(400).json({ message: "Invalid database ID" });
      }
      
      logger.info(`Запрос на импорт CSV-данных в базу данных с ID ${databaseId}`, 'api');
      
      const database = await storage.getDatabase(databaseId);
      if (!database) {
        logger.warn(`База данных с ID ${databaseId} не найдена при импорте`, null, 'api');
        return res.status(404).json({ message: "Database not found" });
      }
      
      logger.debug(`Импорт в базу данных "${database.name}" (ID: ${databaseId})`, 'api');
      
      const schema = z.array(csvRowSchema);
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn("Некорректный формат CSV-данных при импорте", result.error, 'api');
        return res.status(400).json({ message: "Invalid CSV data format" });
      }
      
      const rowCount = result.data.length;
      logger.info(`Начало импорта ${rowCount} строк в базу данных ${database.name}`, 'api');
      
      const importResult = await storage.importCsv(databaseId, result.data);
      
      logger.info(`Импорт завершен: ${importResult.imported} строк импортировано, ${importResult.duplicates} дубликатов найдено`, 'api');
      
      res.status(201).json(importResult);
    } catch (error) {
      logger.error("Ошибка при импорте CSV-данных", error, 'api');
      res.status(500).json({ message: "Failed to import CSV data" });
    }
  });
  


  const httpServer = createServer(app);
  return httpServer;
}
