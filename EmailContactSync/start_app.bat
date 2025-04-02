@echo off
echo Запуск приложения "Менеджер контактов"...
echo.

:: Проверка наличия папки виртуального окружения
if not exist venv (
    echo Виртуальное окружение не найдено. Создание...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo Ошибка: Не удалось создать виртуальное окружение.
        echo Убедитесь, что Python 3.8+ установлен на вашем компьютере.
        pause
        exit /b 1
    )
    echo Виртуальное окружение создано успешно.
)

:: Активация виртуального окружения и установка зависимостей
echo Активация виртуального окружения...
call venv\Scripts\activate.bat

:: Проверка, установлены ли зависимости
if not exist venv\Lib\site-packages\flask (
    echo Установка зависимостей...
    pip install -r dependencies.txt
    if %errorlevel% neq 0 (
        echo Ошибка: Не удалось установить зависимости.
        pause
        exit /b 1
    )
    echo Зависимости установлены успешно.
) else (
    echo Зависимости уже установлены.
)

:: Инициализация базы данных
echo.
echo Инициализация базы данных...
python init_local_db.py

:: Запуск приложения
echo.
echo Запуск сервера...
start "" http://localhost:5000
python main.py

:: Деактивация виртуального окружения
call venv\Scripts\deactivate.bat