
import sequelize from './config/database';
import { DataTypes, Model } from 'sequelize';
import logger from './logger';

// Определяем модели данных
class Database extends Model {}
Database.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  importCity: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Database',
  tableName: 'databases',
  timestamps: true // добавляем createdAt/updatedAt для отслеживания изменений
});

class Column extends Model {}
Column.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  databaseId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  width: {
    type: DataTypes.INTEGER,
    defaultValue: 150
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'Column',
  tableName: 'columns',
  timestamps: true
});

class Record extends Model {}
Record.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  databaseId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  originalRow: DataTypes.INTEGER,
  importCity: DataTypes.STRING,
  // Все поля из CSV
  Name: DataTypes.STRING,
  Fulladdress: DataTypes.STRING,
  Street: DataTypes.STRING,
  Municipality: DataTypes.STRING,
  Categories: DataTypes.STRING,
  Phone: DataTypes.STRING,
  Phones: DataTypes.STRING,
  Claimed: DataTypes.STRING,
  "Review Count": DataTypes.STRING,
  "Average Rating": DataTypes.STRING,
  "Review URL": DataTypes.STRING,
  "Google Maps URL": DataTypes.STRING,
  Latitude: DataTypes.STRING,
  Longitude: DataTypes.STRING,
  "Plus code": DataTypes.STRING,
  Website: DataTypes.STRING,
  Domain: DataTypes.STRING,
  Email: DataTypes.STRING,
  "Opening hours": DataTypes.STRING,
  "Featured image": DataTypes.STRING,
  Cid: DataTypes.STRING,
  "Place Id": DataTypes.STRING,
  Kgmid: DataTypes.STRING,
  "Google Knowledge URL": DataTypes.STRING,
  "Social Medias": DataTypes.STRING,
  Facebook: DataTypes.STRING,
  Instagram: DataTypes.STRING,
  Twitter: DataTypes.STRING,
  Yelp: DataTypes.STRING,
  isDuplicate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'Record',
  tableName: 'records',
  timestamps: true
});

// Связи между моделями
Database.hasMany(Record, { foreignKey: 'databaseId', onDelete: 'CASCADE' });
Record.belongsTo(Database, { foreignKey: 'databaseId' });

Database.hasMany(Column, { foreignKey: 'databaseId', onDelete: 'CASCADE' });
Column.belongsTo(Database, { foreignKey: 'databaseId' });

// Синхронизация с базой данных
async function initDb() {
  try {
    logger.info('Начало инициализации базы данных MySQL...', 'db');
    
    // Сначала проверяем подключение
    await sequelize.authenticate();
    logger.info('Подключение к базе данных MySQL успешно установлено', 'db');
    
    // Затем синхронизируем модели с базой данных
    logger.info('Синхронизация моделей с базой данных MySQL...', 'db');
    await sequelize.sync({alter: true}); // alter: true позволяет обновлять структуру таблиц
    logger.info('База данных MySQL успешно синхронизирована с моделями', 'db');
    
    // Проверяем, есть ли база данных по умолчанию
    const dbCount = await Database.count();
    logger.debug(`Найдено ${dbCount} баз данных в MySQL`, 'db');
    
    if (dbCount === 0) {
      // Создаем базу данных по умолчанию
      logger.info('Создание базы данных по умолчанию...', 'db');
      await Database.create({
        name: "AllTywekCustomersBase",
        importCity: null
      });
      logger.info('Создана база данных по умолчанию: AllTywekCustomersBase', 'db');
    }
    
    // Создадим базовую колонку "importCity" в таблице Column
    try {
      logger.debug('Проверка наличия колонки "Город*"...', 'db');
      const [column, created] = await sequelize.models.Column.findOrCreate({
        where: { key: 'importCity', databaseId: 1 },
        defaults: {
          databaseId: 1,
          key: 'importCity',
          name: 'Город*',
          visible: true,
          width: 140,
          order: 2
        }
      });
      
      if (created) {
        logger.info('Создана базовая колонка "Город*"', 'db');
      } else {
        logger.debug('Колонка "Город*" уже существует', 'db');
      }
    } catch (columnError) {
      logger.warn('Не удалось создать колонку "Город*"', columnError, 'db');
    }
    
    logger.info('Инициализация MySQL базы данных успешно завершена', 'db');
    return true;
  } catch (error: any) { // Типизируем error как any для доступа к его свойствам
    logger.error('Ошибка инициализации базы данных MySQL', error, 'db');
    
    // Если ошибка связана с отсутствием базы данных, выводим более понятное сообщение
    if (error.name && (
      error.name === 'SequelizeConnectionError' || 
      error.name === 'SequelizeHostNotFoundError' || 
      error.name === 'SequelizeConnectionRefusedError'
    )) {
      logger.error(`
===============================================
ОШИБКА: Не удалось подключиться к базе данных MySQL.
Убедитесь, что сервер MySQL запущен и доступен по адресу:
Хост: ${process.env.DB_HOST || 'localhost'}
Порт: ${process.env.DB_PORT || '3306'}
Также проверьте правильность учетных данных:
Пользователь: ${process.env.DB_USER || 'root'}
База данных: ${process.env.DB_NAME || 'csv_importer'}
===============================================
`, null, 'db');
    }
    
    // В случае ошибки, пытаемся переключиться на in-memory режим
    logger.warn('Переключение на режим работы без базы данных (in-memory)...', 'db');
    return false;
  }
}

// Экспортируем функцию initDb и модели для использования в других модулях
export { Database, Record, Column, sequelize, initDb };
