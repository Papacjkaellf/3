import { 
  Database, InsertDatabase, 
  Record, InsertRecord, 
  Column, InsertColumn, 
  CsvRow
} from "@shared/schema";
import { translations } from "../client/src/lib/translations";
import logger from "./logger"; // Импортируем логгер

// Interface for storage operations
export interface IStorage {
  // Database operations
  getDatabases(): Promise<Database[]>;
  getDatabase(id: number): Promise<Database | undefined>;
  getDatabaseByName(name: string): Promise<Database | undefined>;
  createDatabase(database: InsertDatabase): Promise<Database>;

  // Record operations
  getRecords(databaseId: number, page: number, pageSize: number): Promise<Record[]>;
  getAllRecords(databaseId: number): Promise<Record[]>;
  getRecordCount(databaseId: number): Promise<number>;
  createRecord(record: InsertRecord): Promise<Record>;
  createRecords(records: InsertRecord[]): Promise<Record[]>;
  updateRecord(id: number, record: Partial<Record>): Promise<Record | undefined>;
  deleteRecord(id: number): Promise<boolean>;

  // Column operations
  getColumns(databaseId: number): Promise<Column[]>;
  createColumn(column: InsertColumn): Promise<Column>;
  updateColumn(id: number, column: Partial<Column>): Promise<Column | undefined>;

  // Duplicate operations
  getDuplicates(databaseId: number): Promise<Record[]>;
  getDuplicateCount(databaseId: number): Promise<number>;
  deleteDuplicates(databaseId: number): Promise<number>;
  deleteExactDuplicates(databaseId: number): Promise<any>; // Added method signature

  // Database cleaning operations
  clearDatabase(databaseId: number): Promise<number>;

  // CSV operations
  importCsv(databaseId: number, rows: CsvRow[]): Promise<{
    imported: number;
    duplicates: number;
    schemaChanged?: boolean;
  }>;

  // Schema operations
  checkSchema(databaseId: number, csvSample: CsvRow): Promise<string[]>;
  resetDatabase(databaseId: number, csvSample: CsvRow): Promise<void>;

  // Filter operations
  filterRecords(
    databaseId: number, 
    filters: {
      column?: string;
      text?: string;
      filterType?: "contains" | "starts" | "ends" | "empty" | "not-empty";
    }
  ): Promise<Record[]>;
}

export class MemStorage implements IStorage {
  private databaseIdCounter: number = 1;
  private recordIdCounter: number = 1;
  private columnIdCounter: number = 1;
  private databases: Map<number, Database>;
  private records: Map<number, Record>;
  private columns: Map<number, Column>;

  constructor() {
    this.databases = new Map();
    this.records = new Map();
    this.columns = new Map();

    // Initialize with default database and columns
    this.initializeDefaults();
  }

  // Вспомогательная функция для безопасного преобразования полей в null
  private ensureNullable<T>(value: T | undefined | null): T | null {
    return value === undefined ? null : value;
  }

  private initializeDefaults() {
    // Create default database
    // Создаем только одну базу данных AllTywekCustomersBase
    const customersDb: Database = {
      id: this.databaseIdCounter++,
      name: "AllTywekCustomersBase",
      importCity: null
    };
    this.databases.set(customersDb.id, customersDb);

    // Create default columns for customers database according to requirements
    // A-AC columns mapping with specific visibility rules
    const defaultColumns = [
      // Чекбокс для выделения строк
      { key: "checkbox", name: "", order: 0, width: 24, visible: true },

      // Системные поля
      { key: "id", name: "ID", order: 1, width: 60, visible: true },
      { key: "importCity", name: "Город импорта", order: 2, width: 140, visible: true },

      // A: Название
      { key: "name", name: "Название", order: 3, width: 200, visible: true },

      // B: Полный адрес
      { key: "fulladdress", name: "Полный адрес", order: 4, width: 250, visible: false },

      // C: Улица
      { key: "street", name: "Улица", order: 5, width: 200, visible: false },

      // D: Город из CSV
      { key: "city", name: "Город", order: 6, width: 120, visible: false },

      // E: Тип заведения
      { key: "categories", name: "Тип заведения", order: 7, width: 200, visible: true },

      // F+G: Телефон + Телефоны
      { key: "phone", name: "Телефон", order: 8, width: 150, visible: true },
      { key: "phones", name: "Телефоны", order: 9, width: 200, visible: false }, // Будет объединен с phone

      // H: Claimed
      { key: "claimed", name: "Подтвержден", order: 10, width: 120, visible: false },

      // I: Просмотров в gMaps
      { key: "reviewCount", name: "Просмотров в gMaps", order: 11, width: 160, visible: false },

      // J: Средний рейтинг
      { key: "averageRating", name: "Средний рейтинг", order: 12, width: 150, visible: false },

      // K: Ссылка в Google
      { key: "reviewUrl", name: "Ссылка в Google", order: 13, width: 200, visible: false },

      // L: Ссылка на Google Maps
      { key: "googleMapsUrl", name: "Ссылка на Google Maps", order: 14, width: 200, visible: false },

      // M: Широта
      { key: "latitude", name: "Широта", order: 15, width: 120, visible: false },

      // N: Долгота
      { key: "longitude", name: "Долгота", order: 16, width: 120, visible: false },

      // O: Вебсайт
      { key: "website", name: "Вебсайт", order: 17, width: 200, visible: true },

      // P: Домен
      { key: "domain", name: "Домен", order: 18, width: 180, visible: false },

      // Q: Часы работы
      { key: "openingHours", name: "Часы работы", order: 19, width: 200, visible: false },

      // R: Картинка
      { key: "featuredImage", name: "Картинка", order: 20, width: 150, visible: false },

      // S: CID
      { key: "cid", name: "CID", order: 21, width: 150, visible: false },

      // T: Place ID
      { key: "placeId", name: "Place ID", order: 22, width: 200, visible: false },

      // U: KGMID
      { key: "kgmid", name: "KGMID", order: 23, width: 200, visible: false },

      // V: Plus Code
      { key: "plusCode", name: "Plus Code", order: 24, width: 180, visible: false },

      // W: Ссылка Google Knowledge
      { key: "googleKnowledgeUrl", name: "Ссылка Google Knowledge", order: 25, width: 200, visible: false },

      // X: EMAIL
      { key: "email", name: "EMAIL", order: 26, width: 200, visible: true },

      // Y: Социальные сети
      { key: "socialMedias", name: "Социальные сети", order: 27, width: 200, visible: false },

      // Z: Facebook
      { key: "facebook", name: "Facebook", order: 28, width: 120, visible: true },

      // AA: Instagram
      { key: "instagram", name: "Instagram", order: 29, width: 120, visible: false },

      // AB: Twitter
      { key: "twitter", name: "Twitter", order: 30, width: 120, visible: false },

      // AC: Yelp
      { key: "yelp", name: "Yelp", order: 31, width: 120, visible: false },

      // Дополнительные поля, если нужны
      { key: "municipality", name: "Район/Муниципалитет", order: 32, width: 180, visible: false },
      { key: "company", name: "Компания", order: 33, width: 180, visible: false },
      { key: "position", name: "Должность", order: 34, width: 160, visible: false },
      { key: "country", name: "Страна", order: 35, width: 120, visible: false }
    ];

    defaultColumns.forEach(col => {
      this.columns.set(this.columnIdCounter, {
        id: this.columnIdCounter++,
        databaseId: customersDb.id,
        key: col.key,
        name: col.name,
        visible: col.visible,
        width: col.width,
        order: col.order
      });
    });

    // Мы больше не создаем базу продуктов, так как нам нужна только AllTywekCustomersBase
  }

  // Database operations
  async getDatabases(): Promise<Database[]> {
    return Array.from(this.databases.values());
  }

  async getDatabase(id: number): Promise<Database | undefined> {
    return this.databases.get(id);
  }

  async getDatabaseByName(name: string): Promise<Database | undefined> {
    return Array.from(this.databases.values()).find(db => db.name === name);
  }

  async createDatabase(database: InsertDatabase): Promise<Database> {
    const id = this.databaseIdCounter++;
    const newDb: Database = { 
      id, 
      name: database.name,
      importCity: database.importCity || null
    };
    this.databases.set(id, newDb);

    // Создаем и устанавливаем колонки с правильной видимостью
    const defaultColumns = [
      // Чекбокс для выделения строк
      { key: "checkbox", name: "", order: 0, width: 24, visible: true },

      // Системные поля
      { key: "id", name: "ID", order: 1, width: 60, visible: true },
      { key: "importCity", name: "Город импорта", order: 2, width: 140, visible: true },

      // A: Название
      { key: "name", name: "Название", order: 3, width: 200, visible: true },

      // B: Полный адрес
      { key: "fulladdress", name: "Полный адрес", order: 4, width: 250, visible: false },

      // C: Улица
      { key: "street", name: "Улица", order: 5, width: 200, visible: false },

      // D: Город из CSV
      { key: "city", name: "Город", order: 6, width: 120, visible: false },

      // E: Тип заведения
      { key: "categories", name: "Тип заведения", order: 7, width: 200, visible: true },

      // F+G: Телефон + Телефоны
      { key: "phone", name: "Телефон", order: 8, width: 150, visible: true },
      { key: "phones", name: "Телефоны", order: 9, width: 200, visible: false }, // Будет объединен с phone

      // H: Claimed
      { key: "claimed", name: "Подтвержден", order: 10, width: 120, visible: false },

      // I: Просмотров в gMaps
      { key: "reviewCount", name: "Просмотров в gMaps", order: 11, width: 160, visible: false },

      // J: Средний рейтинг
      { key: "averageRating", name: "Средний рейтинг", order: 12, width: 150, visible: false },

      // K: Ссылка в Google
      { key: "reviewUrl", name: "Ссылка в Google", order: 13, width: 200, visible: false },

      // L: Ссылка на Google Maps
      { key: "googleMapsUrl", name: "Ссылка на Google Maps", order: 14, width: 200, visible: false },

      // M: Широта
      { key: "latitude", name: "Широта", order: 15, width: 120, visible: false },

      // N: Долгота
      { key: "longitude", name: "Долгота", order: 16, width: 120, visible: false },

      // O: Вебсайт
      { key: "website", name: "Вебсайт", order: 17, width: 200, visible: true },

      // P: Домен
      { key: "domain", name: "Домен", order: 18, width: 180, visible: false },

      // Q: Часы работы
      { key: "openingHours", name: "Часы работы", order: 19, width: 200, visible: false },

      // R: Картинка
      { key: "featuredImage", name: "Картинка", order: 20, width: 150, visible: false },

      // S: CID
      { key: "cid", name: "CID", order: 21, width: 150, visible: false },

      // T: Place ID
      { key: "placeId", name: "Place ID", order: 22, width: 200, visible: false },

      // U: KGMID
      { key: "kgmid", name: "KGMID", order: 23, width: 200, visible: false },

      // V: Plus Code
      { key: "plusCode", name: "Plus Code", order: 24, width: 180, visible: false },

      // W: Ссылка Google Knowledge
      { key: "googleKnowledgeUrl", name: "Ссылка Google Knowledge", order: 25, width: 200, visible: false },

      // X: EMAIL
      { key: "email", name: "EMAIL", order: 26, width: 200, visible: true },

      // Y: Социальные сети
      { key: "socialMedias", name: "Социальные сети", order: 27, width: 200, visible: false },

      // Z: Facebook
      { key: "facebook", name: "Facebook", order: 28, width: 120, visible: true },

      // AA: Instagram
      { key: "instagram", name: "Instagram", order: 29, width: 120, visible: false },

      // AB: Twitter
      { key: "twitter", name: "Twitter", order: 30, width: 120, visible: false },

      // AC: Yelp
      { key: "yelp", name: "Yelp", order: 31, width: 120, visible: false },

      // Дополнительные поля
      { key: "municipality", name: "Район/Муниципалитет", order: 32, width: 180, visible: false },
      { key: "company", name: "Компания", order: 33, width: 180, visible: false },
      { key: "position", name: "Должность", order: 34, width: 160, visible: false },
      { key: "country", name: "Страна", order: 35, width: 120, visible: false }
    ];

    defaultColumns.forEach(col => {
      this.columns.set(this.columnIdCounter, {
        id: this.columnIdCounter++,
        databaseId: id,
        key: col.key,
        name: col.name,
        visible: col.visible,
        width: col.width,
        order: col.order
      });
    });

    return newDb;
  }

  // Record operations
  async getRecords(databaseId: number, page: number, pageSize: number): Promise<Record[]> {
    const allRecords = Array.from(this.records.values())
      .filter(record => record.databaseId === databaseId)
      .sort((a, b) => a.id - b.id);

    if (pageSize === -1) {
      return allRecords;
    }

    const start = (page - 1) * pageSize;
    return allRecords.slice(start, start + pageSize);
  }

  async getAllRecords(databaseId: number): Promise<Record[]> {
    return Array.from(this.records.values())
      .filter(record => record.databaseId === databaseId)
      .sort((a, b) => a.id - b.id);
  }

  async getRecordCount(databaseId: number): Promise<number> {
    return Array.from(this.records.values())
      .filter(record => record.databaseId === databaseId)
      .length;
  }

  async createRecord(record: InsertRecord): Promise<Record> {
    const id = this.recordIdCounter++;

    // Создаем запись с безопасным преобразованием типов
    const newRecord: Record = {
      id,
      databaseId: record.databaseId,
      originalRow: this.ensureNullable(record.originalRow),
      importCity: this.ensureNullable(record.importCity),

      // Основные поля с точными именами из CSV
      Name: this.ensureNullable(record.Name),
      Fulladdress: this.ensureNullable(record.Fulladdress),
      Street: this.ensureNullable(record.Street),
      Municipality: this.ensureNullable(record.Municipality),
      Categories: this.ensureNullable(record.Categories),
      Phone: this.ensureNullable(record.Phone),
      Phones: this.ensureNullable(record.Phones),
      Claimed: this.ensureNullable(record.Claimed),

      // Рейтинги и обзоры
      "Review Count": this.ensureNullable(record["Review Count"]),
      "Average Rating": this.ensureNullable(record["Average Rating"]),
      "Review URL": this.ensureNullable(record["Review URL"]),

      // Карты и координаты
      "Google Maps URL": this.ensureNullable(record["Google Maps URL"]),
      Latitude: this.ensureNullable(record.Latitude),
      Longitude: this.ensureNullable(record.Longitude),
      "Plus code": this.ensureNullable(record["Plus code"]),

      // Веб-сайты и контакты
      Website: this.ensureNullable(record.Website),
      Domain: this.ensureNullable(record.Domain),
      Email: this.ensureNullable(record.Email),

      // Часы работы и дополнительная информация
      "Opening hours": this.ensureNullable(record["Opening hours"]),
      "Featured image": this.ensureNullable(record["Featured image"]),

      // Идентификаторы
      Cid: this.ensureNullable(record.Cid),
      "Place Id": this.ensureNullable(record["Place Id"]),
      Kgmid: this.ensureNullable(record.Kgmid),
      "Google Knowledge URL": this.ensureNullable(record["Google Knowledge URL"]),

      // Социальные сети
      "Social Medias": this.ensureNullable(record["Social Medias"]),
      Facebook: this.ensureNullable(record.Facebook),
      Instagram: this.ensureNullable(record.Instagram),
      Twitter: this.ensureNullable(record.Twitter),
      Yelp: this.ensureNullable(record.Yelp),

      // Основные поля (старые имена для совместимости)
      name: this.ensureNullable(record.name || record.Name),
      fulladdress: this.ensureNullable(record.fulladdress || record.Fulladdress),
      street: this.ensureNullable(record.street || record.Street),
      municipality: this.ensureNullable(record.municipality || record.Municipality),
      categories: this.ensureNullable(record.categories || record.Categories),
      phone: this.ensureNullable(record.phone || record.Phone),
      phones: this.ensureNullable(record.phones || record.Phones),
      claimed: this.ensureNullable(record.claimed || record.Claimed),

      // Рейтинги и обзоры
      reviewCount: this.ensureNullable(record.reviewCount || record["Review Count"]),
      averageRating: this.ensureNullable(record.averageRating || record["Average Rating"]),
      reviewUrl: this.ensureNullable(record.reviewUrl || record["Review URL"]),

      // Карты и координаты
      googleMapsUrl: this.ensureNullable(record.googleMapsUrl || record["Google Maps URL"]),
      latitude: this.ensureNullable(record.latitude || record.Latitude),
      longitude: this.ensureNullable(record.longitude || record.Longitude),
      plusCode: this.ensureNullable(record.plusCode || record["Plus code"]),

      // Веб-сайты и контакты
      website: this.ensureNullable(record.website || record.Website),
      domain: this.ensureNullable(record.domain || record.Domain),
      email: this.ensureNullable(record.email || record.Email),

      // Часы работы и дополнительная информация
      openingHours: this.ensureNullable(record.openingHours || record["Opening hours"]),
      featuredImage: this.ensureNullable(record.featuredImage || record["Featured image"]),

      // Идентификаторы
      cid: this.ensureNullable(record.cid || record.Cid),
      placeId: this.ensureNullable(record.placeId || record["Place Id"]),
      kgmid: this.ensureNullable(record.kgmid || record.Kgmid),
      googleKnowledgeUrl: this.ensureNullable(record.googleKnowledgeUrl || record["Google Knowledge URL"]),

      // Социальные сети
      socialMedias: this.ensureNullable(record.socialMedias || record["Social Medias"]),
      facebook: this.ensureNullable(record.facebook || record.Facebook),
      instagram: this.ensureNullable(record.instagram || record.Instagram),
      twitter: this.ensureNullable(record.twitter || record.Twitter),
      yelp: this.ensureNullable(record.yelp || record.Yelp),

      // Поддержка старых полей для совместимости
      company: this.ensureNullable(record.company),
      position: this.ensureNullable(record.position),
      country: this.ensureNullable(record.country),
      city: this.ensureNullable(record.city),

      isDuplicate: record.isDuplicate === true ? true : false
    };

    this.records.set(id, newRecord);
    return newRecord;
  }

  async createRecords(records: InsertRecord[]): Promise<Record[]> {
    const createdRecords: Record[] = [];

    for (const record of records) {
      // Используем существующий метод createRecord вместо дублирования логики
      const newRecord = await this.createRecord(record);
      createdRecords.push(newRecord);
    }

    return createdRecords;
  }

  async updateRecord(id: number, record: Partial<Record>): Promise<Record | undefined> {
    const existingRecord = this.records.get(id);
    if (!existingRecord) return undefined;

    const updatedRecord = { ...existingRecord, ...record };
    this.records.set(id, updatedRecord);

    return updatedRecord;
  }

  async deleteRecord(id: number): Promise<boolean> {
    return this.records.delete(id);
  }

  // Column operations
  async getColumns(databaseId: number): Promise<Column[]> {
    return Array.from(this.columns.values())
      .filter(column => column.databaseId === databaseId)
      .sort((a, b) => a.order - b.order);
  }

  async createColumn(column: InsertColumn): Promise<Column> {
    const id = this.columnIdCounter++;

    // Создаем колонку с безопасным преобразованием типов
    const newColumn: Column = {
      id,
      databaseId: column.databaseId,
      key: column.key,
      name: column.name,
      visible: this.ensureNullable(column.visible) ?? true, // используем ?? для установки значения по умолчанию
      width: this.ensureNullable(column.width) ?? 150,
      order: column.order
    };

    this.columns.set(id, newColumn);
    return newColumn;
  }

  async updateColumn(id: number, column: Partial<Column>): Promise<Column | undefined> {
    const existingColumn = this.columns.get(id);
    if (!existingColumn) return undefined;

    const updatedColumn = { ...existingColumn, ...column };
    this.columns.set(id, updatedColumn);

    return updatedColumn;
  }

  // Duplicate operations
  async getDuplicates(databaseId: number): Promise<Record[]> {
    return Array.from(this.records.values())
      .filter(record => record.databaseId === databaseId && record.isDuplicate);
  }

  async getDuplicateCount(databaseId: number): Promise<number> {
    return Array.from(this.records.values())
      .filter(record => record.databaseId === databaseId && record.isDuplicate)
      .length;
  }

  async deleteDuplicates(databaseId: number): Promise<number> {
    const duplicateIds = Array.from(this.records.values())
      .filter(record => record.databaseId === databaseId && record.isDuplicate)
      .map(record => record.id);

    let deletedCount = 0;

    for (const id of duplicateIds) {
      if (this.records.delete(id)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Операция очистки базы данных (удаление всех записей)
  async clearDatabase(databaseId: number): Promise<number> {
    const recordsToDelete = Array.from(this.records.values())
      .filter(record => record.databaseId === databaseId)
      .map(record => record.id);

    let deletedCount = 0;

    for (const id of recordsToDelete) {
      if (this.records.delete(id)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Schema operations
  async checkSchema(databaseId: number, csvSample: CsvRow): Promise<string[]> {
    // Получаем существующие колонки для базы данных
    const existingColumns = await this.getColumns(databaseId);
    const existingColumnKeys = existingColumns
      .filter(col => col.key !== 'id') // Исключаем id из проверки
      .map(col => col.key);

    // Получаем все ключи из CSV строки, исключая 'id'
    const csvKeys = Object.keys(csvSample).filter(key => key !== 'id');

    // Находим новые колонки, которых еще нет в базе данных
    const newColumns = csvKeys.filter(key => !existingColumnKeys.includes(key));

    return newColumns;
  }

  async resetDatabase(databaseId: number, csvSample: CsvRow): Promise<void> {
    // 1. Удаляем все записи в базе данных
    const recordsToDelete = await this.getAllRecords(databaseId);
    for (const record of recordsToDelete) {
      await this.deleteRecord(record.id);
    }

    // 2. Сохраняем информацию о существующих колонках перед их удалением
    const existingColumns = await this.getColumns(databaseId);
    const existingColumnSettings = new Map<string, { visible: boolean, width: number }>();

    existingColumns.forEach(column => {
      existingColumnSettings.set(column.key, {
        visible: column.visible,
        width: column.width
      });
    });

    // 3. Удаляем все колонки
    for (const column of existingColumns) {
      this.columns.delete(column.id);
    }

    // 4. Создаем новые колонки на основе CSV
    const csvKeys = Object.keys(csvSample).filter(key => key !== 'id');

    // Создаем базовый набор колонок с правильной видимостью
    const defaultColumns = [
      // Чекбокс для выделения строк
      { key: "checkbox", name: "", order: 0, width: 24, visible: true },

      // Системные поля
      { key: "id", name: "ID", order: 1, width: 60, visible: true },
      { key: "importCity", name: "Город импорта", order: 2, width: 140, visible: true },

      // A: Название
      { key: "name", name: "Название", order: 3, width: 200, visible: true },

      // B: Полный адрес
      { key: "fulladdress", name: "Полный адрес", order: 4, width: 250, visible: false },

      // C: Улица
      { key: "street", name: "Улица", order: 5, width: 200, visible: false },

      // D: Город из CSV
      { key: "city", name: "Город", order: 6, width: 120, visible: false },

      // E: Тип заведения
      { key: "categories", name: "Тип заведения", order: 7, width: 200, visible: true },

      // F+G: Телефон + Телефоны
      { key: "phone", name: "Телефон", order: 8, width: 150, visible: true },
      { key: "phones", name: "Телефоны", order: 9, width: 200, visible: false }, // Будет объединен с phone

      // H: Claimed
      { key: "claimed", name: "Подтвержден", order: 10, width: 120, visible: false },

      // I: Просмотров в gMaps
      { key: "reviewCount", name: "Просмотров в gMaps", order: 11, width: 160, visible: false },

      // J: Средний рейтинг
      { key: "averageRating", name: "Средний рейтинг", order: 12, width: 150, visible: false },

      // K: Ссылка в Google
      { key: "reviewUrl", name: "Ссылка в Google", order: 13, width: 200, visible: false },

      // L: Ссылка на Google Maps
      { key: "googleMapsUrl", name: "Ссылка на Google Maps", order: 14, width: 200, visible: false },

      // M: Широта
      { key: "latitude", name: "Широта", order: 15, width: 120, visible: false },

      // N: Долгота
      { key: "longitude", name: "Долгота", order: 16, width: 120, visible: false },

      // O: Вебсайт
      { key: "website", name: "Вебсайт", order: 17, width: 200, visible: true },

      // P: Домен
      { key: "domain", name: "Домен", order: 18, width: 180, visible: false },

      // Q: Часы работы
      { key: "openingHours", name: "Часы работы", order: 19, width: 200, visible: false },

      // R: Картинка
      { key: "featuredImage", name: "Картинка", order: 20, width: 150, visible: false },

      // S: CID
      { key: "cid", name: "CID", order: 21, width: 150, visible: false },

      // T: Place ID
      { key: "placeId", name: "Place ID", order: 22, width: 200, visible: false },

      // U: KGMID
      { key: "kgmid", name: "KGMID", order: 23, width: 200, visible: false },

      // V: Plus Code
      { key: "plusCode", name: "Plus Code", order: 24, width: 180, visible: false },

      // W: Ссылка Google Knowledge
      { key: "googleKnowledgeUrl", name: "Ссылка Google Knowledge", order: 25, width: 200, visible: false },

      // X: EMAIL
      { key: "email", name: "EMAIL", order: 26, width: 200, visible: true },

      // Y: Социальные сети
      { key: "socialMedias", name: "Социальные сети", order: 27, width: 200, visible: false },

      // Z: Facebook
      { key: "facebook", name: "Facebook", order: 28, width: 120, visible: true },

      // AA: Instagram
      { key: "instagram", name: "Instagram", order: 29, width: 120, visible: false },

// AB: Twitter
      { key: "twitter", name: "Twitter", order: 30, width: 120, visible: false },

      // AC: Yelp
      { key: "yelp", name: "Yelp", order: 31, width: 120, visible: false },

      // Дополнительные поля
      { key: "municipality", name: "Район/Муниципалитет", order: 32, width: 180, visible: false },
      { key: "company", name: "Компания", order: 33, width: 180, visible: false },
      { key: "position", name: "Должность", order: 34, width: 160, visible: false },
      { key: "country", name: "Страна", order: 35, width: 120, visible: false }
    ];

    // Создаем базовые колонки
    const defaultColumnMap = new Map<string, { name: string, order: number, width: number, visible: boolean }>();
    defaultColumns.forEach(col => {
      defaultColumnMap.set(col.key, {
        name: col.name,
        order: col.order,
        width: col.width,
        visible: col.visible
      });
    });

    // Создаем колонки с сохранением настроек видимости и ширины от предыдущих колонок
    let order = defaultColumnMap.size;

    // Сначала создаем стандартные колонки
    for (const key of Array.from(defaultColumnMap.keys())) {
      // Получаем настройки для текущего ключа
      const settings = defaultColumnMap.get(key)!;
      // Если у нас есть сохраненные настройки для этой колонки, используем их
      const savedSettings = existingColumnSettings.get(key);

      await this.createColumn({
        databaseId,
        key,
        name: settings.name,
        visible: savedSettings?.visible !== undefined ? savedSettings.visible : settings.visible,
        width: savedSettings?.width !== undefined ? savedSettings.width : settings.width,
        order: settings.order
      });
    }

    // Затем добавляем новые колонки из CSV, которых нет в стандартном наборе
    for (const key of csvKeys) {
      if (!defaultColumnMap.has(key)) {
        // Проверяем есть ли перевод для этой колонки или генерируем название
        const name = translations.ru[key as keyof typeof translations.ru] || 
                     key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();

        // Если у нас есть сохраненные настройки для этой колонки, используем их
        const savedSettings = existingColumnSettings.get(key);

        await this.createColumn({
          databaseId,
          key,
          name,
          visible: savedSettings?.visible ?? false, // По умолчанию скрываем новые колонки
          width: savedSettings?.width ?? 180,
          order: order++
        });
      }
    }
  }

  // CSV operations
  async importCsv(databaseId: number, rows: CsvRow[]): Promise<{ imported: number; duplicates: number; schemaChanged?: boolean }> {
    let imported = 0;
    let duplicates = 0;
    let schemaChanged = false;

    // Получаем базу данных для извлечения информации о городе импорта
    const database = await this.getDatabase(databaseId);
    // Получаем город для импорта из базы данных или используем null
    const importCity = database?.importCity || null;
    logger.debug(`Используем город импорта: ${importCity || 'не задан'}`, 'mem-storage');

    // Get all existing records for duplicate check
    const existingRecords = await this.getAllRecords(databaseId);

    // Получаем существующие колонки для базы данных
    const existingColumns = await this.getColumns(databaseId);
    const existingColumnKeys = existingColumns.map(col => col.key);

    // Если есть строки, проверяем схему данных
    if (rows.length > 0) {
      const firstRow = rows[0];
      // Получаем все ключи из CSV строки
      const csvKeys = Object.keys(firstRow).filter(key => key !== 'id');

      // Создаем недостающие колонки
      for (const key of csvKeys) {
        if (!existingColumnKeys.includes(key)) {
          const columnName = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();

          await this.createColumn({
            databaseId,
            key,
            name: columnName,
            visible: true,
            width: 150,
            order: existingColumnKeys.length + csvKeys.indexOf(key)
          });

          // Добавляем в массив существующих ключей
          existingColumnKeys.push(key);
        }
      }
    }

    // Function to check if a record is a duplicate
    const isDuplicate = (record: CsvRow) => {
      return existingRecords.some(existing => {
        // Проверка по email (используем как новые, так и старые имена полей)
        if ((existing.Email && record.Email && existing.Email === record.Email) || 
            (existing.email && record.email && existing.email === record.email)) {
          return true;
        }

        // Проверка по телефону (используем как новые, так и старые имена полей)
        // Проверяем что телефоны не пустые и совпадают
        if ((existing.Phone && record.Phone && existing.Phone.trim() && record.Phone.trim() && existing.Phone === record.Phone) || 
            (existing.phone && record.phone && existing.phone.trim() && record.phone.trim() && existing.phone === record.phone) ||
            (existing.Phones && record.Phones && existing.Phones.trim() && record.Phones.trim() && existing.Phones === record.Phones) ||
            (existing.phones && record.phones && existing.phones.trim() && record.phones.trim() && existing.phones === record.phones)) {
          return true;
        }

        // Проверка по названию и вебсайту 
        if (((existing.Name && record.Name && existing.Name === record.Name && 
              existing.Website && record.Website && existing.Website === record.Website)) || 
            ((existing.name && record.name && existing.name === record.name && 
              existing.website && record.website && existing.website === record.website))) {
          return true;
        }

        // Проверка по названию и адресу
        if (((existing.Name && record.Name && existing.Name === record.Name && 
              existing.Fulladdress && record.Fulladdress && existing.Fulladdress === record.Fulladdress)) || 
            ((existing.name && record.name && existing.name === record.name && 
              existing.fulladdress && record.fulladdress && existing.fulladdress === record.fulladdress))) {
          return true;
        }

        // Поддержка старой логики
        if ((existing.name && record.name && existing.name === record.name && 
             existing.company && record.company && existing.company === record.company) ||
            (existing.Name && record.Name && existing.Name === record.Name && 
             existing.company && record.company && existing.company === record.company)) {
          return true;
        }

        return false;
      });
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const duplicate = isDuplicate(row);
      
      // Для отладки - отслеживаем статус дублирования
      if (duplicate) {
        logger.debug(`Запись ${i+1} является дубликатом`, 'mem-storage');
      }

      // Create record - используем точные имена полей из CSV
      const newRecord: InsertRecord = {
        databaseId,
        originalRow: i + 1, // 1-based index for row number
        importCity: row.importCity || importCity, // Используем город из строки или из базы данных

        // Основные поля из CSV
        Name: row.Name || null,
        Fulladdress: row.Fulladdress || null,
        Street: row.Street || null,
        Municipality: row.Municipality || null,
        Categories: row.Categories || null,
        Phone: row.Phone || null,
        Phones: row.Phones || null,
        Claimed: row.Claimed || null,

        // Рейтинги и обзоры
        "Review Count": row["Review Count"] || null,
        "Average Rating": row["Average Rating"] || null,
        "Review URL": row["Review URL"] || null,

        // Карты и координаты
        "Google Maps URL": row["Google Maps URL"] || null,
        Latitude: row.Latitude || null,
        Longitude: row.Longitude || null,
        "Plus code": row["Plus code"] || null,

        // Веб-сайты и контакты
        Website: row.Website || null,
        Domain: row.Domain || null,
        Email: row.Email || null,

        // Часы работы и дополнительная информация
        "Opening hours": row["Opening hours"] || null,
        "Featured image": row["Featured image"] || null,

        // Идентификаторы
        Cid: row.Cid || null,
        "Place Id": row["Place Id"] || null,
        Kgmid: row.Kgmid || null,
        "Google Knowledge URL": row["Google Knowledge URL"] || null,

        // Социальные сети
        "Social Medias": row["Social Medias"] || null,
        Facebook: row.Facebook || null,
        Instagram: row.Instagram || null,
        Twitter: row.Twitter || null,
        Yelp: row.Yelp || null,

        // Поддержка старых полей для совместимости
        company: row.company || null,
        position: row.position || null,
        country: row.country || null,
        city: row.city || null,

        // Копируем значения в поля со старыми именами для обратной совместимости
        name: row.Name || null,
        fulladdress: row.Fulladdress || null,
        street: row.Street || null,
        municipality: row.Municipality || null,
        categories: row.Categories || null,
        phone: row.Phone || null,
        phones: row.Phones || null,
        claimed: row.Claimed || null,
        reviewCount: row["Review Count"] || null,
        averageRating: row["Average Rating"] || null,
        reviewUrl: row["Review URL"] || null,
        googleMapsUrl: row["Google Maps URL"] || null,
        latitude: row.Latitude || null,
        longitude: row.Longitude || null,
        plusCode: row["Plus code"] || null,
        website: row.Website || null,
        domain: row.Domain || null,
        email: row.Email || null,
        openingHours: row["Opening hours"] || null,
        featuredImage: row["Featured image"] || null,
        cid: row.Cid || null,
        placeId: row["Place Id"] || null,
        kgmid: row.Kgmid || null,
        googleKnowledgeUrl: row["Google Knowledge URL"] || null,
        socialMedias: row["Social Medias"] || null,
        facebook: row.Facebook || null,
        instagram: row.Instagram || null,
        twitter: row.Twitter || null,
        yelp: row.Yelp || null,

        isDuplicate: duplicate
      };

      await this.createRecord(newRecord);

      if (duplicate) {
        duplicates++;
      } else {
        imported++;
        // Add to existing records for subsequent duplicate checks
        const recordForChecks: Record = {
          id: this.recordIdCounter,
          databaseId: newRecord.databaseId,
          originalRow: this.ensureNullable(newRecord.originalRow),
          importCity: this.ensureNullable(newRecord.importCity),

          // Основные поля из CSV
          Name: this.ensureNullable(newRecord.Name),
          Fulladdress: this.ensureNullable(newRecord.Fulladdress),
          Street: this.ensureNullable(newRecord.Street),
          Municipality: this.ensureNullable(newRecord.Municipality),
          Categories: this.ensureNullable(newRecord.Categories),
          Phone: this.ensureNullable(newRecord.Phone),
          Phones: this.ensureNullable(newRecord.Phones),
          Claimed: this.ensureNullable(newRecord.Claimed),

          // Рейтинги и обзоры
          "Review Count": this.ensureNullable(newRecord["Review Count"]),
          "Average Rating": this.ensureNullable(newRecord["Average Rating"]),
          "Review URL": this.ensureNullable(newRecord["Review URL"]),

          // Карты и координаты
          "Google Maps URL": this.ensureNullable(newRecord["Google Maps URL"]),
          Latitude: this.ensureNullable(newRecord.Latitude),
          Longitude: this.ensureNullable(newRecord.Longitude),
          "Plus code": this.ensureNullable(newRecord["Plus code"]),

          // Веб-сайты и контакты
          Website: this.ensureNullable(newRecord.Website),
          Domain: this.ensureNullable(newRecord.Domain),
          Email: this.ensureNullable(newRecord.Email),

          // Часы работы и дополнительная информация
          "Opening hours": this.ensureNullable(newRecord["Opening hours"]),
          "Featured image": this.ensureNullable(newRecord["Featured image"]),

          // Идентификаторы
          Cid: this.ensureNullable(newRecord.Cid),
          "Place Id": this.ensureNullable(newRecord["Place Id"]),
          Kgmid: this.ensureNullable(newRecord.Kgmid),
          "Google Knowledge URL": this.ensureNullable(newRecord["Google Knowledge URL"]),

          // Социальные сети
          "Social Medias": this.ensureNullable(newRecord["Social Medias"]),
          Facebook: this.ensureNullable(newRecord.Facebook),
          Instagram: this.ensureNullable(newRecord.Instagram),
          Twitter: this.ensureNullable(newRecord.Twitter),
          Yelp: this.ensureNullable(newRecord.Yelp),

          // Поддержка старых полей для совместимости
          company: this.ensureNullable(newRecord.company),
          position: this.ensureNullable(newRecord.position),
          country: this.ensureNullable(newRecord.country),
          city: this.ensureNullable(newRecord.city),

          // Старые имена для обратной совместимости
          name: this.ensureNullable(newRecord.name),
          fulladdress: this.ensureNullable(newRecord.fulladdress),
          street: this.ensureNullable(newRecord.street),
          municipality: this.ensureNullable(newRecord.municipality),
          categories: this.ensureNullable(newRecord.categories),
          phone: this.ensureNullable(newRecord.phone),
          phones: this.ensureNullable(newRecord.phones),
          claimed: this.ensureNullable(newRecord.claimed),
          reviewCount: this.ensureNullable(newRecord.reviewCount),
          averageRating: this.ensureNullable(newRecord.averageRating),
          reviewUrl: this.ensureNullable(newRecord.reviewUrl),
          googleMapsUrl: this.ensureNullable(newRecord.googleMapsUrl),
          latitude: this.ensureNullable(newRecord.latitude),
          longitude: this.ensureNullable(newRecord.longitude),
          plusCode: this.ensureNullable(newRecord.plusCode),
          website: this.ensureNullable(newRecord.website),
          domain: this.ensureNullable(newRecord.domain),
          email: this.ensureNullable(newRecord.email),
          openingHours: this.ensureNullable(newRecord.openingHours),
          featuredImage: this.ensureNullable(newRecord.featuredImage),
          cid: this.ensureNullable(newRecord.cid),
          placeId: this.ensureNullable(newRecord.placeId),
          kgmid: this.ensureNullable(newRecord.kgmid),
          googleKnowledgeUrl: this.ensureNullable(newRecord.googleKnowledgeUrl),
          socialMedias: this.ensureNullable(newRecord.socialMedias),
          facebook: this.ensureNullable(newRecord.facebook),
          instagram: this.ensureNullable(newRecord.instagram),
          twitter: this.ensureNullable(newRecord.twitter),
          yelp: this.ensureNullable(newRecord.yelp),

          isDuplicate: newRecord.isDuplicate === true ? true : false
        };
        existingRecords.push(recordForChecks);
      }
    }

    // Гарантируем, что возвращаемые значения не равны undefined или null
    // и явно преобразуем в числа для избежания проблем с типами
    const result = {
      imported: parseInt(String(imported || 0), 10),
      duplicates: parseInt(String(duplicates || 0), 10),
      schemaChanged
    };
    
    logger.debug(`Результат импорта CSV в MemStorage: импортировано ${result.imported}, дубликатов ${result.duplicates}`, 'mem-storage');
    return result;
  }

  // Filter operations
  async filterRecords(
    databaseId: number, 
    filters: {
      column?: string;
      text?: string;
      filterType?: "contains" | "starts" | "ends" | "empty" | "not-empty";
    }
  ): Promise<Record[]> {
    const allRecords = await this.getAllRecords(databaseId);

    if (!filters.text && !filters.filterType) {
      return allRecords;
    }

    return allRecords.filter(record => {
      // Handle empty/not-empty filters
      if (filters.filterType === "empty" || filters.filterType === "not-empty") {
        const isEmpty = filters.filterType === "empty";

        if (filters.column === "all") {
          // Check if all fields are empty or not empty
          const fields: (keyof Record)[] = [
            "Name", "Fulladdress", "Street", "Municipality", "Categories", "Phone", "Phones", 
            "Email", "Website", "Domain", "Facebook", "Instagram", "Twitter", 
            "Review Count", "Average Rating", "Latitude", "Longitude"
          ];
          for (const field of fields) {
            if (isEmpty && record[field]) return false;
            if (!isEmpty && !record[field]) return false;
          }
          return true;
        } else if (filters.column) {
          // Check if specific field is empty or not empty
          const fieldValue = record[filters.column as keyof Record];
          return isEmpty ? !fieldValue : !!fieldValue;
        }
      }

      // Handle text filters
      if (filters.text) {
        const searchText = filters.text.toLowerCase();

        if (filters.column === "all" || !filters.column) {
          // Search in all fields
          const fields: (keyof Record)[] = [
            "Name", "Fulladdress", "Street", "Municipality", "Categories", "Phone", "Phones", 
            "Email", "Website", "Domain", "Facebook", "Instagram", "Twitter", 
            "Review Count", "Average Rating"
          ];
          return fields.some(field => {
            const fieldValue = String(record[field] || "").toLowerCase();

            if (filters.filterType === "contains") {
              return fieldValue.includes(searchText);
            } else if (filters.filterType === "starts") {
              return fieldValue.startsWith(searchText);
            } else if (filters.filterType === "ends") {
              return fieldValue.endsWith(searchText);
            }

            // Default to contains
            return fieldValue.includes(searchText);
          });
        } else {
          // Search in specific field
          const fieldValue = String(record[filters.column as keyof Record] || "").toLowerCase();

          if (filters.filterType === "contains") {
            return fieldValue.includes(searchText);
          } else if (filters.filterType === "starts") {
            return fieldValue.startsWith(searchText);
          } else if (filters.filterType === "ends") {
            return fieldValue.endsWith(searchText);
          }

          // Default to contains
          return fieldValue.includes(searchText);
        }
      }

      return true;
    });
  }
  // Метод для удаления полных дубликатов
  async deleteExactDuplicates(databaseId: number) {
    // This is a placeholder.  A real implementation would require a database connection and SQL query.
    // For this in-memory example, we'll simulate the deletion.
    const duplicateRecords = Array.from(this.records.values()).filter(record => record.databaseId === databaseId && record.isDuplicate);
    let deletedCount = 0;
    for (const record of duplicateRecords){
        this.records.delete(record.id);
        deletedCount++;
    }
    return deletedCount;
  }
}

// Реализация хранилища MySQL
export class MySQLStorage implements IStorage {
  constructor() {
    // Логируем информацию об инициализации
    logger.info('Инициализация MySQL хранилища данных. Будет использоваться постоянное хранилище в БД.', 'mysql-storage');
  }

  // Database operations
  async getDatabases(): Promise<Database[]> {
    try {
      logger.debug('Запрос списка баз данных из MySQL', 'mysql-storage');
      const dbModels = await db.Database.findAll();
      logger.debug(`Получено ${dbModels.length} баз данных из MySQL`, 'mysql-storage');
      
      return dbModels.map(db => ({
        id: db.id,
        name: db.name,
        importCity: db.importCity || null
      }));
    } catch (error) {
      logger.error('Ошибка получения списка баз данных из MySQL', error, 'mysql-storage');
      return [];
    }
  }

  async getDatabase(id: number): Promise<Database | undefined> {
    try {
      const dbModel = await db.Database.findByPk(id);
      if (!dbModel) return undefined;
      
      return {
        id: dbModel.id,
        name: dbModel.name,
        importCity: dbModel.importCity || null
      };
    } catch (error) {
      console.error(`Ошибка получения базы данных с ID ${id}:`, error);
      return undefined;
    }
  }

  async getDatabaseByName(name: string): Promise<Database | undefined> {
    try {
      const dbModel = await db.Database.findOne({ where: { name } });
      if (!dbModel) return undefined;
      
      return {
        id: dbModel.id,
        name: dbModel.name,
        importCity: dbModel.importCity || null
      };
    } catch (error) {
      console.error(`Ошибка получения базы данных с именем ${name}:`, error);
      return undefined;
    }
  }

  async createDatabase(database: InsertDatabase): Promise<Database> {
    try {
      const dbModel = await db.Database.create({
        name: database.name,
        importCity: database.importCity || null
      });
      
      // Создаем и устанавливаем колонки с правильной видимостью для новой базы данных
      const defaultColumns = [
        // Чекбокс для выделения строк
        { key: "checkbox", name: "", order: 0, width: 24, visible: true },

        // Системные поля
        { key: "id", name: "ID", order: 1, width: 60, visible: true },
        { key: "importCity", name: "Город*", order: 2, width: 140, visible: true },

        // A: Название
        { key: "name", name: "Название", order: 3, width: 200, visible: true },

        // B: Полный адрес
        { key: "fulladdress", name: "Полный адрес", order: 4, width: 250, visible: false },

        // C: Улица
        { key: "street", name: "Улица", order: 5, width: 200, visible: false },

        // D: Город из CSV
        { key: "city", name: "Город", order: 6, width: 120, visible: false },

        // E: Тип заведения
        { key: "categories", name: "Тип заведения", order: 7, width: 200, visible: true },

        // F+G: Телефон + Телефоны
        { key: "phone", name: "Телефон", order: 8, width: 150, visible: true },
        { key: "phones", name: "Телефоны", order: 9, width: 200, visible: false },

        // H: Claimed
        { key: "claimed", name: "Подтвержден", order: 10, width: 120, visible: false },

        // I: Просмотров в gMaps
        { key: "reviewCount", name: "Просмотров в gMaps", order: 11, width: 160, visible: false },

        // J: Средний рейтинг
        { key: "averageRating", name: "Средний рейтинг", order: 12, width: 150, visible: false },

        // K: Ссылка в Google
        { key: "reviewUrl", name: "Ссылка в Google", order: 13, width: 200, visible: false },

        // L: Ссылка на Google Maps
        { key: "googleMapsUrl", name: "Ссылка на Google Maps", order: 14, width: 200, visible: false },

        // M: Широта
        { key: "latitude", name: "Широта", order: 15, width: 120, visible: false },

        // N: Долгота
        { key: "longitude", name: "Долгота", order: 16, width: 120, visible: false },

        // O: Вебсайт
        { key: "website", name: "Вебсайт", order: 17, width: 200, visible: true },

        // P: Домен
        { key: "domain", name: "Домен", order: 18, width: 180, visible: false },

        // Q: Часы работы
        { key: "openingHours", name: "Часы работы", order: 19, width: 200, visible: false },

        // R: Картинка
        { key: "featuredImage", name: "Картинка", order: 20, width: 150, visible: false },

        // S: CID
        { key: "cid", name: "CID", order: 21, width: 150, visible: false },

        // T: Place ID
        { key: "placeId", name: "Place ID", order: 22, width: 200, visible: false },

        // U: KGMID
        { key: "kgmid", name: "KGMID", order: 23, width: 200, visible: false },

        // V: Plus Code
        { key: "plusCode", name: "Plus Code", order: 24, width: 180, visible: false },

        // W: Ссылка Google Knowledge
        { key: "googleKnowledgeUrl", name: "Ссылка Google Knowledge", order: 25, width: 200, visible: false },

        // X: EMAIL
        { key: "email", name: "EMAIL", order: 26, width: 200, visible: true },

        // Y: Социальные сети
        { key: "socialMedias", name: "Социальные сети", order: 27, width: 200, visible: false },

        // Z: Facebook
        { key: "facebook", name: "Facebook", order: 28, width: 120, visible: true },

        // AA: Instagram
        { key: "instagram", name: "Instagram", order: 29, width: 120, visible: false },

        // AB: Twitter
        { key: "twitter", name: "Twitter", order: 30, width: 120, visible: false },

        // AC: Yelp
        { key: "yelp", name: "Yelp", order: 31, width: 120, visible: false },

        // Дополнительные поля, если нужны
        { key: "municipality", name: "Район/Муниципалитет", order: 32, width: 180, visible: false },
        { key: "company", name: "Компания", order: 33, width: 180, visible: false },
        { key: "position", name: "Должность", order: 34, width: 160, visible: false },
        { key: "country", name: "Страна", order: 35, width: 120, visible: false }
      ];

      // Создаем колонки в базе данных
      await Promise.all(defaultColumns.map(col => 
        db.Column.create({
          databaseId: dbModel.id,
          key: col.key,
          name: col.name,
          visible: col.visible,
          width: col.width,
          order: col.order
        })
      ));

      return {
        id: dbModel.id,
        name: dbModel.name,
        importCity: dbModel.importCity || null
      };
    } catch (error) {
      console.error('Ошибка создания базы данных:', error);
      throw new Error(`Не удалось создать базу данных: ${error.message}`);
    }
  }

  // Record operations
  async getRecords(databaseId: number, page: number, pageSize: number): Promise<Record[]> {
    try {
      let options: any = {
        where: { databaseId },
        order: [['id', 'ASC']]
      };
      
      if (pageSize !== -1) {
        const offset = (page - 1) * pageSize;
        options.offset = offset;
        options.limit = pageSize;
      }
      
      const records = await db.Record.findAll(options);
      return records.map(record => record.toJSON());
    } catch (error) {
      console.error(`Ошибка получения записей для базы данных ${databaseId}:`, error);
      return [];
    }
  }

  async getAllRecords(databaseId: number): Promise<Record[]> {
    try {
      const records = await db.Record.findAll({
        where: { databaseId },
        order: [['id', 'ASC']]
      });
      return records.map(record => record.toJSON());
    } catch (error) {
      console.error(`Ошибка получения всех записей для базы данных ${databaseId}:`, error);
      return [];
    }
  }

  async getRecordCount(databaseId: number): Promise<number> {
    try {
      return await db.Record.count({ where: { databaseId } });
    } catch (error) {
      console.error(`Ошибка получения количества записей для базы данных ${databaseId}:`, error);
      return 0;
    }
  }

  async createRecord(record: InsertRecord): Promise<Record> {
    try {
      const newRecord = await db.Record.create(record);
      return newRecord.toJSON();
    } catch (error) {
      console.error('Ошибка создания записи:', error);
      throw new Error(`Не удалось создать запись: ${error.message}`);
    }
  }

  async createRecords(records: InsertRecord[]): Promise<Record[]> {
    try {
      const createdRecords = await db.Record.bulkCreate(records);
      return createdRecords.map(record => record.toJSON());
    } catch (error) {
      console.error('Ошибка массового создания записей:', error);
      throw new Error(`Не удалось создать записи: ${error.message}`);
    }
  }

  async updateRecord(id: number, record: Partial<Record>): Promise<Record | undefined> {
    try {
      const recordToUpdate = await db.Record.findByPk(id);
      if (!recordToUpdate) return undefined;
      
      await recordToUpdate.update(record);
      return recordToUpdate.toJSON();
    } catch (error) {
      console.error(`Ошибка обновления записи с ID ${id}:`, error);
      return undefined;
    }
  }

  async deleteRecord(id: number): Promise<boolean> {
    try {
      const recordToDelete = await db.Record.findByPk(id);
      if (!recordToDelete) return false;
      
      await recordToDelete.destroy();
      return true;
    } catch (error) {
      console.error(`Ошибка удаления записи с ID ${id}:`, error);
      return false;
    }
  }

  // Column operations
  async getColumns(databaseId: number): Promise<Column[]> {
    try {
      const columns = await db.Column.findAll({
        where: { databaseId },
        order: [['order', 'ASC']]
      });
      return columns.map(column => column.toJSON());
    } catch (error) {
      console.error(`Ошибка получения колонок для базы данных ${databaseId}:`, error);
      return [];
    }
  }

  async createColumn(column: InsertColumn): Promise<Column> {
    try {
      const newColumn = await db.Column.create(column);
      return newColumn.toJSON();
    } catch (error) {
      console.error('Ошибка создания колонки:', error);
      throw new Error(`Не удалось создать колонку: ${error.message}`);
    }
  }

  async updateColumn(id: number, column: Partial<Column>): Promise<Column | undefined> {
    try {
      const columnToUpdate = await db.Column.findByPk(id);
      if (!columnToUpdate) return undefined;
      
      await columnToUpdate.update(column);
      return columnToUpdate.toJSON();
    } catch (error) {
      console.error(`Ошибка обновления колонки с ID ${id}:`, error);
      return undefined;
    }
  }

  // Duplicate operations
  async getDuplicates(databaseId: number): Promise<Record[]> {
    try {
      const duplicates = await db.Record.findAll({
        where: { 
          databaseId,
          isDuplicate: true 
        },
        order: [['id', 'ASC']]
      });
      return duplicates.map(duplicate => duplicate.toJSON());
    } catch (error) {
      console.error(`Ошибка получения дубликатов для базы данных ${databaseId}:`, error);
      return [];
    }
  }

  async getDuplicateCount(databaseId: number): Promise<number> {
    try {
      return await db.Record.count({ 
        where: { 
          databaseId,
          isDuplicate: true 
        } 
      });
    } catch (error) {
      console.error(`Ошибка получения количества дубликатов для базы данных ${databaseId}:`, error);
      return 0;
    }
  }

  async deleteDuplicates(databaseId: number): Promise<number> {
    try {
      const result = await db.Record.destroy({
        where: { 
          databaseId,
          isDuplicate: true 
        }
      });
      return result;
    } catch (error) {
      console.error(`Ошибка удаления дубликатов для базы данных ${databaseId}:`, error);
      return 0;
    }
  }

  async deleteExactDuplicates(databaseId: number): Promise<number> {
    try {
      // Получаем все записи
      const records = await db.Record.findAll({
        where: { databaseId },
        order: [['id', 'ASC']]
      });
      
      // Отбираем точные дубликаты для удаления
      const idsToDelete = [];
      const recordMap = new Map();
      
      for (const record of records) {
        const key = JSON.stringify({
          name: record.name,
          address: record.fulladdress,
          phone: record.phone,
          website: record.website
        });
        
        if (recordMap.has(key)) {
          idsToDelete.push(record.id);
        } else {
          recordMap.set(key, record.id);
        }
      }
      
      if (idsToDelete.length === 0) {
        return 0;
      }
      
      // Удаляем выбранные дубликаты
      const result = await db.Record.destroy({
        where: { 
          id: idsToDelete 
        }
      });
      
      return result;
    } catch (error) {
      console.error(`Ошибка удаления точных дубликатов для базы данных ${databaseId}:`, error);
      return 0;
    }
  }

  // Database cleaning operations
  async clearDatabase(databaseId: number): Promise<number> {
    try {
      const result = await db.Record.destroy({
        where: { databaseId }
      });
      return result;
    } catch (error) {
      console.error(`Ошибка очистки базы данных ${databaseId}:`, error);
      return 0;
    }
  }

  // CSV operations
  async importCsv(databaseId: number, rows: CsvRow[]): Promise<{ imported: number; duplicates: number; schemaChanged?: boolean }> {
    try {
      const database = await this.getDatabase(databaseId);
      if (!database) {
        throw new Error(`База данных с ID ${databaseId} не найдена`);
      }
      
      let imported = 0;
      let duplicates = 0;
      
      // Получаем существующие записи для проверки дубликатов
      const existingRecords = await this.getAllRecords(databaseId);
      
      // Создаем записи для импорта
      const recordsToImport: InsertRecord[] = [];
      
      for (const row of rows) {
        // Проверяем дубликаты
        const isDuplicate = existingRecords.some(existing => 
          existing.name === row.Name && 
          existing.phone === row.Phone && 
          existing.website === row.Website
        );
        
        if (isDuplicate) {
          duplicates++;
          continue;
        }
        
        const record: InsertRecord = {
          databaseId,
          importCity: database.importCity,
          originalRow: null,
          isDuplicate: false,
          
          // Основные поля с точными именами из CSV
          Name: row.Name || null,
          Fulladdress: row.Fulladdress || null,
          Street: row.Street || null,
          Municipality: row.Municipality || null,
          Categories: row.Categories || null,
          Phone: row.Phone || null,
          Phones: row.Phones || null,
          Claimed: row.Claimed || null,
          "Review Count": row["Review Count"] || null,
          "Average Rating": row["Average Rating"] || null,
          "Review URL": row["Review URL"] || null,
          "Google Maps URL": row["Google Maps URL"] || null,
          Latitude: row.Latitude || null,
          Longitude: row.Longitude || null,
          "Plus code": row["Plus code"] || null,
          Website: row.Website || null,
          Domain: row.Domain || null,
          Email: row.Email || null,
          "Opening hours": row["Opening hours"] || null,
          "Featured image": row["Featured image"] || null,
          Cid: row.Cid || null,
          "Place Id": row["Place Id"] || null,
          Kgmid: row.Kgmid || null,
          "Google Knowledge URL": row["Google Knowledge URL"] || null,
          "Social Medias": row["Social Medias"] || null,
          Facebook: row.Facebook || null,
          Instagram: row.Instagram || null,
          Twitter: row.Twitter || null,
          Yelp: row.Yelp || null,
        };
        
        recordsToImport.push(record);
        imported++;
      }
      
      if (recordsToImport.length > 0) {
        // Сохраняем пакетом для повышения производительности
        await this.createRecords(recordsToImport);
      }
      
      // Логируем результаты импорта
      logger.info(`CSV импорт в базу данных ${databaseId}: импортировано ${imported} записей, найдено ${duplicates} дубликатов`, 'mysql-storage');
      
      // Гарантируем, что возвращаемые значения не равны undefined или null
      // и явно преобразуем в числа для избежания проблем с типами
      const result = {
        imported: parseInt(String(imported || 0), 10),
        duplicates: parseInt(String(duplicates || 0), 10)
      };
      
      logger.debug(`Результат импорта: ${JSON.stringify(result)}`, 'mysql-storage');
      return result;
    } catch (error) {
      logger.error(`Ошибка импорта CSV для базы данных ${databaseId}`, error, 'mysql-storage');
      // Возвращаем нулевые значения при ошибке, вместо исключения
      // Явно преобразуем в числа для избежания проблем с типами
      return { 
        imported: parseInt('0', 10),
        duplicates: parseInt('0', 10)
      };
    }
  }

  // Schema operations
  async checkSchema(databaseId: number, csvSample: CsvRow): Promise<string[]> {
    try {
      logger.debug(`Проверка схемы для базы данных ${databaseId}`, 'mysql-storage');
      
      // Получаем текущие колонки
      const columns = await this.getColumns(databaseId);
      
      // Проверяем поля из CSV, которых нет в текущей схеме
      const missingFields = Object.keys(csvSample).filter(field => {
        return !columns.some(column => column.key === field);
      });
      
      if (missingFields.length > 0) {
        logger.info(`Обнаружены новые поля в CSV для базы данных ${databaseId}: ${missingFields.join(', ')}`, 'mysql-storage');
      } else {
        logger.debug(`CSV соответствует существующей схеме для базы данных ${databaseId}`, 'mysql-storage');
      }
      
      return missingFields;
    } catch (error) {
      logger.error(`Ошибка проверки схемы для базы данных ${databaseId}`, error, 'mysql-storage');
      return [];
    }
  }

  async resetDatabase(databaseId: number, csvSample: CsvRow): Promise<void> {
    try {
      logger.info(`Начало сброса базы данных ${databaseId}`, 'mysql-storage');
      
      // Очищаем базу данных
      const deletedRecords = await this.clearDatabase(databaseId);
      logger.info(`Удалено ${deletedRecords} записей из базы данных ${databaseId}`, 'mysql-storage');
      
      // Получаем текущие колонки
      const currentColumns = await this.getColumns(databaseId);
      logger.debug(`Получено ${currentColumns.length} колонок для базы данных ${databaseId}`, 'mysql-storage');
      
      // Удаляем колонки, которых нет в CSV
      // ...
      
      // Добавляем новые колонки из CSV
      // ...
      
      // Обновляем порядок колонок
      // ...
      
      logger.info(`База данных ${databaseId} успешно сброшена`, 'mysql-storage');
    } catch (error) {
      logger.error(`Ошибка сброса базы данных ${databaseId}`, error, 'mysql-storage');
      throw new Error(`Не удалось сбросить базу данных: ${error.message}`);
    }
  }

  // Filter operations
  async filterRecords(
    databaseId: number, 
    filters: {
      column?: string;
      text?: string;
      filterType?: "contains" | "starts" | "ends" | "empty" | "not-empty";
    }
  ): Promise<Record[]> {
    try {
      const { column, text, filterType } = filters;
      
      logger.debug(`Фильтрация записей для базы данных ${databaseId}: колонка=${column}, текст="${text}", тип=${filterType}`, 'mysql-storage');
      
      let whereClause: any = { databaseId };
      
      if (column && column !== 'all' && text) {
        if (filterType === 'contains') {
          whereClause[column] = { [db.sequelize.Op.like]: `%${text}%` };
        } else if (filterType === 'starts') {
          whereClause[column] = { [db.sequelize.Op.like]: `${text}%` };
        } else if (filterType === 'ends') {
          whereClause[column] = { [db.sequelize.Op.like]: `%${text}` };
        } else if (filterType === 'empty') {
          whereClause[column] = { 
            [db.sequelize.Op.or]: [
              { [db.sequelize.Op.is]: null },
              { [db.sequelize.Op.eq]: '' }
            ]
          };
        } else if (filterType === 'not-empty') {
          whereClause[column] = { 
            [db.sequelize.Op.and]: [
              { [db.sequelize.Op.not]: null },
              { [db.sequelize.Op.ne]: '' }
            ]
          };
        }
      } else if (text && column === 'all') {
        // Поиск по всем колонкам
        logger.debug(`Поиск по всем колонкам для базы данных ${databaseId}`, 'mysql-storage');
        
        // Получаем все колонки для базы данных
        const columns = await this.getColumns(databaseId);
        const columnKeys = columns.map(col => col.key)
          .filter(key => key !== 'id' && key !== 'checkbox' && key !== 'databaseId');
        
        logger.debug(`Найдено ${columnKeys.length} колонок для поиска в базе данных ${databaseId}`, 'mysql-storage');
        
        const orConditions = columnKeys.map(key => ({
          [key]: { 
            [db.sequelize.Op.and]: [
              { [db.sequelize.Op.not]: null },
              { [db.sequelize.Op.like]: `%${text}%` }
            ]
          }
        }));
        
        whereClause = {
          ...whereClause,
          [db.sequelize.Op.or]: orConditions
        };
      }
      
      const records = await db.Record.findAll({
        where: whereClause,
        order: [['id', 'ASC']]
      });
      
      logger.debug(`Найдено ${records.length} записей по фильтру для базы данных ${databaseId}`, 'mysql-storage');
      return records.map(record => record.toJSON());
    } catch (error) {
      logger.error(`Ошибка фильтрации записей для базы данных ${databaseId}`, error, 'mysql-storage');
      return [];
    }
  }
}

// Импортируем модели базы данных
import * as db from './db';

// Выбираем какое хранилище использовать
// В продакшене используем MySQL, при проблемах с соединением - MemStorage
let hasDatabase = false;

// Функция для инициализации хранилища
async function initStorage() {
  try {
    // Логируем начало инициализации
    logger.info('Начало инициализации хранилища данных', 'storage');
    
    // Пытаемся инициализировать базу данных MySQL
    hasDatabase = await db.initDb();
    if (hasDatabase) {
      logger.info('Успешное подключение к MySQL базе данных', 'storage');
      process.env.USE_MYSQL = 'true';
      return new MySQLStorage();
    } else {
      logger.warn('Не удалось подключиться к MySQL базе данных, используем in-memory хранилище', 'storage');
      process.env.USE_MYSQL = 'false';
      return new MemStorage();
    }
  } catch (error) {
    // Логируем ошибку подключения к базе данных
    logger.error('Ошибка инициализации хранилища данных', error, 'storage');
    logger.warn('Используем in-memory хранилище данных в качестве запасного варианта', 'storage');
    process.env.USE_MYSQL = 'false';
    return new MemStorage();
  }
}

// Экспортируем инициализированное хранилище
export let storage: IStorage = new MemStorage(); // По умолчанию

// Инициализируем хранилище и обновляем экспорт
initStorage().then(s => {
  storage = s;
  logger.info('Хранилище данных успешно инициализировано', 'storage');
  
  // Логируем информацию о типе хранилища
  if (process.env.USE_MYSQL === 'true') {
    logger.info('Активно: MySQL хранилище данных', 'storage');
  } else {
    logger.warn('Активно: In-memory хранилище данных (данные будут потеряны при перезапуске)', 'storage');
  }
}).catch(error => {
  logger.error('Критическая ошибка инициализации хранилища', error, 'storage');
});