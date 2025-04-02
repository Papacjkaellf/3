import os
import logging
from app import app, db

def setup_database():
    """
    Функция для инициализации базы данных, если она не существует.
    Вызывается автоматически при запуске в локальном режиме.
    """
    try:
        # Проверка и создание папки instance, если она не существует
        if not os.path.exists('instance'):
            os.makedirs('instance')
            logging.info("Created instance directory")
        
        # Создание таблиц в базе данных
        with app.app_context():
            db.create_all()
            logging.info("Database tables created successfully")
        
        return True
    except Exception as e:
        logging.error(f"Error setting up database: {str(e)}")
        return False

if __name__ == "__main__":
    # Настройка логирования
    logging.basicConfig(level=logging.INFO)
    
    # Инициализация базы данных
    if setup_database():
        print("Database initialized successfully")
    else:
        print("Error initializing database, check logs for details")