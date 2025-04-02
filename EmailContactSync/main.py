import os
import logging
from app import app
from init_local_db import setup_database

if __name__ == "__main__":
    # Настройка логирования
    logging.basicConfig(level=logging.INFO)
    
    # Проверка, существует ли база данных, и инициализация при необходимости
    if not os.path.exists('instance/contact_data.db'):
        print("Инициализация базы данных...")
        setup_database()
    
    # Запуск веб-сервера
    print("Запуск сервера на http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
