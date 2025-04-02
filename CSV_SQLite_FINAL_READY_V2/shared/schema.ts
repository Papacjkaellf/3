import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database schema
export const databases = pgTable("databases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  importCity: text("import_city"), // Город, указанный при импорте файла
});

export const insertDatabaseSchema = createInsertSchema(databases).pick({
  name: true,
  importCity: true,
});

// CSV record schema
export const records = pgTable("records", {
  id: serial("id").primaryKey(),
  databaseId: integer("database_id").notNull(),
  originalRow: integer("original_row"),
  importCity: text("import_city"), // Город, указанный при импорте
  
  // Основные поля - используем точно такие же поля, как в CSV
  Name: text("Name"),
  Fulladdress: text("Fulladdress"),
  Street: text("Street"),
  Municipality: text("Municipality"),
  Categories: text("Categories"),
  Phone: text("Phone"),
  Phones: text("Phones"),
  Claimed: text("Claimed"),
  
  // Рейтинги и обзоры
  "Review Count": text("Review Count"),
  "Average Rating": text("Average Rating"),
  "Review URL": text("Review URL"),
  
  // Карты и координаты
  "Google Maps URL": text("Google Maps URL"),
  Latitude: text("Latitude"),
  Longitude: text("Longitude"),
  "Plus code": text("Plus code"),
  
  // Веб-сайты и контакты
  Website: text("Website"),
  Domain: text("Domain"),
  Email: text("Email"),
  
  // Часы работы и дополнительная информация
  "Opening hours": text("Opening hours"),
  "Featured image": text("Featured image"),
  
  // Идентификаторы
  Cid: text("Cid"),
  "Place Id": text("Place Id"),
  Kgmid: text("Kgmid"),
  "Google Knowledge URL": text("Google Knowledge URL"),
  
  // Социальные сети
  "Social Medias": text("Social Medias"),
  Facebook: text("Facebook"),
  Instagram: text("Instagram"),
  Twitter: text("Twitter"),
  Yelp: text("Yelp"),
  
  // Поддержка старых полей для совместимости
  company: text("company"),
  position: text("position"),
  country: text("country"),
  city: text("city"),
  
  // Старые имена для обратной совместимости
  name: text("name"),
  fulladdress: text("fulladdress"),
  street: text("street"),
  municipality: text("municipality"),
  categories: text("categories"),
  phone: text("phone"),
  phones: text("phones"),
  claimed: text("claimed"),
  reviewCount: text("review_count"),
  averageRating: text("average_rating"),
  reviewUrl: text("review_url"),
  googleMapsUrl: text("google_maps_url"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  plusCode: text("plus_code"),
  website: text("website"),
  domain: text("domain"),
  email: text("email"),
  openingHours: text("opening_hours"),
  featuredImage: text("featured_image"),
  cid: text("cid"),
  placeId: text("place_id"),
  kgmid: text("kgmid"),
  googleKnowledgeUrl: text("google_knowledge_url"),
  socialMedias: text("social_medias"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  twitter: text("twitter"),
  yelp: text("yelp"),
  
  isDuplicate: boolean("is_duplicate").default(false),
});

export const insertRecordSchema = createInsertSchema(records).omit({
  id: true,
});

// Column schema for dynamic columns
export const columns = pgTable("columns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull(),
  databaseId: integer("database_id").notNull(),
  visible: boolean("visible").default(true),
  width: integer("width").default(150),
  order: integer("order").notNull(),
});

export const insertColumnSchema = createInsertSchema(columns).omit({
  id: true,
});

// Types
export type Database = typeof databases.$inferSelect;
export type InsertDatabase = z.infer<typeof insertDatabaseSchema>;

export type Record = typeof records.$inferSelect;
export type InsertRecord = z.infer<typeof insertRecordSchema>;

export type Column = typeof columns.$inferSelect;
export type InsertColumn = z.infer<typeof insertColumnSchema>;

// CSV validation schema
export const csvRowSchema = z.object({
  // Дополнительные поля для интерфейса
  importCity: z.string().optional().nullable(), // Город, указанный при импорте
  
  // Основные поля с точными именами из CSV
  Name: z.string().optional().nullable(),
  Fulladdress: z.string().optional().nullable(),
  Street: z.string().optional().nullable(),
  Municipality: z.string().optional().nullable(),
  Categories: z.string().optional().nullable(),
  Phone: z.string().optional().nullable(),
  Phones: z.string().optional().nullable(),
  Claimed: z.string().optional().nullable(),
  
  // Рейтинги и обзоры
  "Review Count": z.string().optional().nullable(),
  "Average Rating": z.string().optional().nullable(),
  "Review URL": z.string().optional().nullable(),
  
  // Карты и координаты
  "Google Maps URL": z.string().optional().nullable(),
  Latitude: z.string().optional().nullable(),
  Longitude: z.string().optional().nullable(),
  "Plus code": z.string().optional().nullable(),
  
  // Веб-сайты и контакты
  Website: z.string().optional().nullable(),
  Domain: z.string().optional().nullable(),
  Email: z.string().optional().nullable(),
  
  // Часы работы и дополнительная информация
  "Opening hours": z.string().optional().nullable(),
  "Featured image": z.string().optional().nullable(),
  
  // Идентификаторы
  Cid: z.string().optional().nullable(),
  "Place Id": z.string().optional().nullable(),
  Kgmid: z.string().optional().nullable(),
  "Google Knowledge URL": z.string().optional().nullable(),
  
  // Социальные сети
  "Social Medias": z.string().optional().nullable(),
  Facebook: z.string().optional().nullable(),
  Instagram: z.string().optional().nullable(),
  Twitter: z.string().optional().nullable(),
  Yelp: z.string().optional().nullable(),
  
  // Поддержка старых полей для совместимости
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  
  // Обратная совместимость со старыми именами
  name: z.string().optional().nullable(),
  fulladdress: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  municipality: z.string().optional().nullable(),
  categories: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phones: z.string().optional().nullable(),
  claimed: z.string().optional().nullable(),
  reviewCount: z.string().optional().nullable(),
  averageRating: z.string().optional().nullable(),
  reviewUrl: z.string().optional().nullable(),
  googleMapsUrl: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  plusCode: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  openingHours: z.string().optional().nullable(),
  featuredImage: z.string().optional().nullable(),
  cid: z.string().optional().nullable(),
  placeId: z.string().optional().nullable(),
  kgmid: z.string().optional().nullable(),
  googleKnowledgeUrl: z.string().optional().nullable(),
  socialMedias: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  twitter: z.string().optional().nullable(),
  yelp: z.string().optional().nullable()
}).passthrough(); // Разрешить дополнительные поля

export type CsvRow = z.infer<typeof csvRowSchema>;
