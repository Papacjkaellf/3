
import { sequelize } from '../server/db';

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Подключение к базе данных успешно установлено');
    
    await sequelize.sync({ force: true });
    console.log('База данных успешно создана');
    
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
  } finally {
    await sequelize.close();
  }
}

initializeDatabase();
