// Translations for UI elements
const translations = {
    // Pagination and table elements
    'rows_per_page': {
        'ru': 'Строк на странице:',
        'en': 'Rows per page:'
    },
    'all_rows': {
        'ru': 'Все',
        'en': 'All'
    },
    'first_page': {
        'ru': 'В начало',
        'en': 'First'
    },
    'prev_page': {
        'ru': 'Предыдущая',
        'en': 'Previous'
    },
    'next_page': {
        'ru': 'Следующая',
        'en': 'Next'
    },
    'last_page': {
        'ru': 'В конец',
        'en': 'Last'
    },
    
    // MySQL Export Success
    'mysql_export_success_title': {
        'ru': 'Экспорт успешно завершен',
        'en': 'Export Completed Successfully'
    },
    'mysql_export_success_message': {
        'ru': 'Данные успешно экспортированы в MySQL',
        'en': 'Data was successfully exported to MySQL'
    },
    'mysql_export_records': {
        'ru': 'Экспортировано записей',
        'en': 'Records exported'
    },
    'mysql_export_tables': {
        'ru': 'Созданные таблицы',
        'en': 'Created tables'
    },
    'mysql_export_note': {
        'ru': 'Примечание: Убедитесь, что ваш MySQL сервер запущен и настроен для приема внешних подключений.',
        'en': 'Note: Make sure your MySQL server is running and configured to accept external connections.'
    },
    'manage_mysql_tables': {
        'ru': 'Управление таблицами',
        'en': 'Manage Tables'
    },
    
    // MySQL Tables Management
    'mysql_tables_title': {
        'ru': 'Управление таблицами MySQL',
        'en': 'MySQL Tables Management'
    },
    'mysql_tables_info': {
        'ru': 'Здесь вы можете просмотреть таблицы в базе данных MySQL и управлять ими',
        'en': 'Here you can view and manage tables in the MySQL database'
    },
    'mysql_table_name': {
        'ru': 'Имя таблицы',
        'en': 'Table Name'
    },
    'mysql_table_rows': {
        'ru': 'Строк',
        'en': 'Rows'
    },
    'mysql_table_status': {
        'ru': 'Статус',
        'en': 'Status'
    },
    'mysql_table_actions': {
        'ru': 'Действия',
        'en': 'Actions'
    },
    'mysql_tables_loading': {
        'ru': 'Загрузка таблиц...',
        'en': 'Loading tables...'
    },
    // App info
    'app_title': {
        'ru': 'Обработка контактных данных',
        'en': 'Contact Data Processor'
    },
    'app_description': {
        'ru': 'Инструмент для загрузки, просмотра и обработки файлов с контактными данными',
        'en': 'A tool for uploading, viewing, and processing contact data files'
    },
    // Main UI elements
    'upload_title': {
        'ru': 'Загрузить файлы',
        'en': 'Upload Files'
    },
    'upload_instructions': {
        'ru': 'Перетащите файлы сюда или нажмите для выбора',
        'en': 'Drag and drop files here or click to select'
    },
    'upload_button': {
        'ru': 'Загрузить и обработать',
        'en': 'Upload and Process'
    },
    'file_list_title': {
        'ru': 'Обработанные файлы',
        'en': 'Processed Files'
    },
    'column_controls': {
        'ru': 'Управление столбцами',
        'en': 'Column Controls'
    },
    'show_all_columns': {
        'ru': 'Показать все столбцы',
        'en': 'Show All Columns'
    },
    'hide_all_columns': {
        'ru': 'Скрыть все столбцы',
        'en': 'Hide All Columns'
    },
    'search_placeholder': {
        'ru': 'Поиск...',
        'en': 'Search...'
    },
    
    // Buttons
    'find_duplicates': {
        'ru': 'Найти дубликаты',
        'en': 'Find Duplicates'
    },
    'hide_duplicates': {
        'ru': 'Скрыть дубликаты',
        'en': 'Hide Duplicates'
    },
    'show_duplicates': {
        'ru': 'Показать дубликаты',
        'en': 'Show Duplicates'
    },
    'merge_duplicates': {
        'ru': 'Объединить дубликаты',
        'en': 'Merge Duplicates'
    },
    'view_stats': {
        'ru': 'Статистика',
        'en': 'Statistics'
    },
    'export_to_mysql': {
        'ru': 'Экспорт в MySQL',
        'en': 'Export to MySQL'
    },
    'toggle_columns': {
        'ru': 'Столбцы',
        'en': 'Columns'
    },
    'show_all_records': {
        'ru': 'Показать все записи',
        'en': 'Show All Records'
    },
    'view_all_contacts': {
        'ru': 'Показать все контакты',
        'en': 'Show All Contacts'
    },
    
    // Statistics
    'stats_title': {
        'ru': 'Статистика файла',
        'en': 'File Statistics'
    },
    'total_contacts': {
        'ru': 'Всего контактов',
        'en': 'Total Contacts'
    },
    'unique_emails': {
        'ru': 'Уникальных email',
        'en': 'Unique Emails'
    },
    'unique_phones': {
        'ru': 'Уникальных телефонов',
        'en': 'Unique Phones'
    },
    'email_domains': {
        'ru': 'Домены email',
        'en': 'Email Domains'
    },
    'total_duplicates': {
        'ru': 'Всего дубликатов',
        'en': 'Total Duplicates'
    },
    
    // Duplicates
    'duplicates_found': {
        'ru': 'Найдено дубликатов',
        'en': 'Duplicates Found'
    },
    'no_duplicates': {
        'ru': 'Дубликаты не найдены',
        'en': 'No Duplicates Found'
    },
    'merged_success': {
        'ru': 'Дубликаты успешно объединены',
        'en': 'Duplicates Successfully Merged'
    },
    
    // MySQL Export
    'mysql_export_title': {
        'ru': 'Экспорт в MySQL',
        'en': 'Export to MySQL'
    },
    'mysql_host': {
        'ru': 'Хост',
        'en': 'Host'
    },
    'mysql_port': {
        'ru': 'Порт',
        'en': 'Port'
    },
    'mysql_database': {
        'ru': 'База данных',
        'en': 'Database'
    },
    'mysql_user': {
        'ru': 'Пользователь',
        'en': 'User'
    },
    'mysql_password': {
        'ru': 'Пароль',
        'en': 'Password'
    },
    'export_all_files': {
        'ru': 'Экспортировать все файлы',
        'en': 'Export All Files'
    },
    'show_all_tables': {
        'ru': 'Показать все таблицы',
        'en': 'Show All Tables'
    },
    'export': {
        'ru': 'Экспортировать',
        'en': 'Export'
    },
    'cancel': {
        'ru': 'Отмена',
        'en': 'Cancel'
    },
    
    // Table headers
    'header_name': {
        'ru': 'Имя',
        'en': 'Name'
    },
    'header_email': {
        'ru': 'Email',
        'en': 'Email'
    },
    'header_phone': {
        'ru': 'Телефон',
        'en': 'Phone'
    },
    'header_facebook': {
        'ru': 'Facebook',
        'en': 'Facebook'
    },
    'header_address': {
        'ru': 'Адрес',
        'en': 'Address'
    },
    'header_company': {
        'ru': 'Компания',
        'en': 'Company'
    },
    'header_position': {
        'ru': 'Должность',
        'en': 'Position'
    },
    'header_notes': {
        'ru': 'Примечания',
        'en': 'Notes'
    },
    'header_created': {
        'ru': 'Создано',
        'en': 'Created'
    },
    'header_filename': {
        'ru': 'Имя файла',
        'en': 'Filename'
    },
    'header_filesize': {
        'ru': 'Размер файла',
        'en': 'File Size'
    },
    'header_rows': {
        'ru': 'Строк',
        'en': 'Rows'
    },
    'header_date': {
        'ru': 'Дата',
        'en': 'Date'
    },
    
    // Alerts and messages
    'upload_success': {
        'ru': 'Файлы успешно загружены',
        'en': 'Files successfully uploaded'
    },
    'upload_error': {
        'ru': 'Ошибка при загрузке файлов',
        'en': 'Error uploading files'
    },
    'no_file_selected': {
        'ru': 'Файл не выбран',
        'en': 'No file selected'
    },
    'mysql_export_success': {
        'ru': 'Данные успешно экспортированы в MySQL',
        'en': 'Data successfully exported to MySQL'
    },
    'mysql_export_error': {
        'ru': 'Ошибка при экспорте в MySQL',
        'en': 'Error exporting to MySQL'
    },
    'mysql_connection_error': {
        'ru': 'Ошибка подключения к MySQL',
        'en': 'MySQL connection error'
    },
    'please_fill_required': {
        'ru': 'Пожалуйста, заполните все обязательные поля',
        'en': 'Please fill in all required fields'
    },
    'emails_copied': {
        'ru': 'Скопировано {count} уникальных email адресов',
        'en': 'Copied {count} unique email addresses'
    },
    'no_emails_found': {
        'ru': 'Не найдено email адресов в данных',
        'en': 'No emails found in the data'
    }
};

// Function to translate UI based on selected language
function translateUI(language) {
    // Set default language if not provided
    language = language || localStorage.getItem('uiLanguage') || 'ru';
    
    // Save selected language
    localStorage.setItem('uiLanguage', language);
    
    // Update language switch button text
    const langSwitchBtn = document.getElementById('languageSwitchBtn');
    if (langSwitchBtn) {
        langSwitchBtn.textContent = language === 'ru' ? 'EN' : 'RU';
    }
    
    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        
        if (translations[key] && translations[key][language]) {
            if (element.tagName === 'INPUT' && element.getAttribute('type') === 'text') {
                element.placeholder = translations[key][language];
            } else {
                element.textContent = translations[key][language];
            }
        }
    });
    
    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        
        if (translations[key] && translations[key][language]) {
            element.placeholder = translations[key][language];
        }
    });
}

// Toggle language between Russian and English
function toggleLanguage() {
    const currentLanguage = localStorage.getItem('uiLanguage') || 'ru';
    const newLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
    translateUI(newLanguage);
}

// Initialize translation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    translateUI();
    
    // Add event listener to language switch button
    const langSwitchBtn = document.getElementById('languageSwitchBtn');
    if (langSwitchBtn) {
        langSwitchBtn.addEventListener('click', toggleLanguage);
    }
});