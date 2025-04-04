# CSV в MySQL - Инструкция по установке и запуску

Это приложение для импорта, управления и анализа CSV данных с многоязычным интерфейсом и различными функциями для работы с данными.

## Функциональные возможности
- Импорт CSV файлов в базы данных
- Управление несколькими базами данных с динамическим созданием
- Интерактивная таблица данных с изменяемым размером столбцов
- Фильтрация и поиск данных
- Обнаружение и управление дубликатами
- Поддержка нескольких языков (русский/английский)
- Переключение между темной и светлой темой
- Кликабельные email, URL и телефонные номера

## Требования
- Node.js 18.0.0 или выше
- npm 8.0.0 или выше

## Установка и запуск на Windows 10

### Шаг 1: Установка Node.js
1. Скачайте установщик Node.js для Windows с [официального сайта](https://nodejs.org/en/download/)
2. Запустите установщик и следуйте инструкциям, убедитесь, что опция "npm package manager" включена
3. После завершения установки откройте командную строку (cmd) и проверьте версию:
   ```
   node --version
   npm --version
   ```

### Шаг 2: Загрузка и установка проекта
1. Скачайте и распакуйте ZIP-архив с проектом в удобное место
2. Откройте командную строку (cmd) и перейдите в директорию с проектом:
   ```
   cd путь\к\проекту
   ```
3. Установите зависимости:
   ```
   npm install
   ```

### Шаг 3: Запуск приложения

#### Вариант 1: Быстрый запуск через батник
1. Просто запустите файл `start-app.bat`, который:
   - Проверит наличие Node.js и предложит его установить при необходимости
   - Установит все зависимости автоматически
   - Автоматически найдет свободный порт, если 5000 занят (в диапазоне 5000-5020)
   - Запустит сервер на найденном порту
   - Откроет браузер с приложением

#### Вариант 2: Ручной запуск
1. После установки всех зависимостей запустите приложение:
   ```
   npm run dev
   ```
2. Откройте браузер и перейдите по адресу [http://localhost:5000](http://localhost:5000)

## Использование

### Импорт CSV файлов
1. Выберите базу данных в выпадающем меню или создайте новую
2. Нажмите "Выбрать файл" и выберите CSV-файл для импорта
3. Нажмите "Импортировать" для загрузки данных

В проекте есть два примера CSV-файла для тестирования:
- `example-data.csv` - пример с запятыми в качестве разделителей
- `example-data-semicolon.csv` - пример с точками с запятой в качестве разделителей

### Работа с данными
1. Используйте фильтры в боковой панели для поиска и фильтрации данных
2. Управляйте видимостью колонок через настройки в боковой панели
3. Изменяйте размер колонок, перетаскивая разделители заголовков
4. Переключайтесь между показом и скрытием дубликатов
5. Удаляйте дубликаты с помощью соответствующей кнопки

### Настройки интерфейса
1. Переключайте язык (RU/EN) с помощью кнопки в верхнем меню
2. Переключайте светлую/темную тему с помощью кнопки в верхнем меню
3. Выбирайте количество строк на странице в таблице

## Устранение неполадок

### Проблемы с импортом CSV
- Убедитесь, что CSV-файл использует разделители `,`, `;`, `\t` или `|`
- Файл должен иметь заголовки с названиями колонок
- Поддерживаемые форматы колонок: имя, email, телефон, компания, должность, страна, город

### Общие проблемы
- При использовании батника `start-app.bat` порт выбирается автоматически, если 5000 занят
- Для решения проблем с зависимостями удалите папку node_modules и выполните `npm install` заново
- Если при запуске возникает ошибка "listen ENOTSUP: operation not supported on socket", убедитесь, что используется последняя версия приложения, в которой адрес сервера изменен на localhost вместо 0.0.0.0

## Поддержка и обратная связь
Если у вас возникли проблемы или есть предложения по улучшению, пожалуйста, создайте Issue в репозитории проекта или свяжитесь с разработчиком.