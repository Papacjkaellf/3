
import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';

// Создаем папку для базы данных если её нет
const dbFolder = path.join(process.cwd(), 'MySQL Database');
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder);
}

// Определяем параметры подключения к базе данных
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'csv_importer',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  // Параметры для предотвращения проблем с соединением
  dialectOptions: {
    // Для Windows
    supportBigNumbers: true,
    bigNumberStrings: true,
    // Настройки для повторного подключения
    connectTimeout: 60000
  }
});

export default sequelize;
