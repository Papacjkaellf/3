// Main application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    
    // Get DOM elements
    const fileUploadForm = document.getElementById('fileUploadForm');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const fileList = document.getElementById('fileList');
    const processedFilesList = document.getElementById('processedFilesList');
    const previewContainer = document.getElementById('previewContainer');
    const dataTable = document.getElementById('dataTable');
    const fileSelector = document.getElementById('fileSelector');
    const showDuplicatesBtn = document.getElementById('showDuplicatesBtn');
    const mergeDuplicatesBtn = document.getElementById('mergeDuplicatesBtn');
    const extractEmailsBtn = document.getElementById('extractEmailsBtn');
    const columnSidebar = document.getElementById('columnSidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const toggleFilesListBtn = document.getElementById('toggleFilesListBtn');
    const filesListContainer = document.getElementById('filesListContainer');
    const columnList = document.getElementById('columnList');
    const viewAllContactsBtn = document.getElementById('view-all-contacts-btn');
    
    // Scroll buttons
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const scrollBottomBtn = document.getElementById('scrollBottomBtn');
    
    // Current state
    let currentFileId = null;
    let currentColumns = [];
    let currentData = [];
    let duplicates = [];
    let showingDuplicates = false;
    let hidingDuplicates = false;
    let noDuplicatesData = [];
    let similarRecords = [];
    let showingSimilarRecords = false;
    
    // Сохранение настроек
    let columnWidths = {}; // Сохранение ширины столбцов
    let columnVisibility = {}; // Сохранение видимости столбцов
    
    // Pagination state
    let currentPage = 1;
    let rowsPerPage = 25;
    let totalPages = 1;
    let filteredData = [];
    
    // Event Listeners
    
    // File drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        }, false);
    });
    
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        handleFileChange();
    }
    
    // File input change
    fileInput.addEventListener('change', handleFileChange);
    
    function handleFileChange() {
        const files = fileInput.files;
        fileList.innerHTML = '';
        
        if (files.length > 0) {
            document.getElementById('uploadBtn').disabled = false;
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <span>${file.name}</span>
                    <span class="badge bg-primary rounded-pill">${formatFileSize(file.size)}</span>
                `;
                fileList.appendChild(li);
            }
        } else {
            document.getElementById('uploadBtn').disabled = true;
        }
    }
    
    // File upload form submit
    fileUploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const files = fileInput.files;
        if (files.length === 0) {
            showAlert('Please select at least one file', 'danger');
            return;
        }
        
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files[]', files[i]);
        }
        
        // Show loading
        const uploadBtn = document.getElementById('uploadBtn');
        const originalBtnText = uploadBtn.innerHTML;
        uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
        uploadBtn.disabled = true;
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Reset button
            uploadBtn.innerHTML = originalBtnText;
            uploadBtn.disabled = false;
            
            if (data.success) {
                showAlert(`Successfully uploaded ${data.uploaded_files.length} file(s)`, 'success');
                
                // Clear file input and list
                fileInput.value = '';
                fileList.innerHTML = '';
                
                // Refresh processed files list
                loadProcessedFiles();
                
                // If files were uploaded, load the first one
                if (data.uploaded_files.length > 0) {
                    const fileId = data.uploaded_files[0].id;
                    loadFileData(fileId);
                }
            } else {
                showAlert('Error uploading files: ' + data.errors.join(', '), 'danger');
            }
        })
        .catch(error => {
            uploadBtn.innerHTML = originalBtnText;
            uploadBtn.disabled = false;
            showAlert('Error uploading files: ' + error, 'danger');
        });
    });
    
    // Toggle sidebar - desktop version
    toggleSidebarBtn.addEventListener('click', function() {
        const columnSidebar = document.getElementById('columnSidebar');
        const tableContainer = document.getElementById('tableContainer');
        
        // Toggle sidebar collapse class
        columnSidebar.classList.toggle('sidebar-collapsed');
        columnSidebar.classList.toggle('d-none');
        
        // Adjust table container width
        if (columnSidebar.classList.contains('sidebar-collapsed')) {
            tableContainer.classList.remove('col-md-9');
            tableContainer.classList.add('col-md-12');
            // Update button icon
            toggleSidebarBtn.querySelector('i').classList.remove('fa-chevron-right');
            toggleSidebarBtn.querySelector('i').classList.add('fa-chevron-left');
        } else {
            tableContainer.classList.add('col-md-9');
            tableContainer.classList.remove('col-md-12');
            // Update button icon
            toggleSidebarBtn.querySelector('i').classList.remove('fa-chevron-left');
            toggleSidebarBtn.querySelector('i').classList.add('fa-chevron-right');
        }
    });

    // Toggle sidebar - mobile version
    if (document.getElementById('toggleSidebarBtnMobile')) {
        document.getElementById('toggleSidebarBtnMobile').addEventListener('click', function() {
            const columnSidebar = document.getElementById('columnSidebar');
            
            // For mobile, use show/hide classes
            columnSidebar.classList.toggle('show');
            
            // Add/remove backdrop
            let backdrop = document.querySelector('.sidebar-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.className = 'sidebar-backdrop';
                document.body.appendChild(backdrop);
                
                // Close sidebar when clicking on backdrop
                backdrop.addEventListener('click', function() {
                    columnSidebar.classList.remove('show');
                    backdrop.classList.remove('show');
                });
            }
            
            backdrop.classList.toggle('show');
        });
    }
    
    // Toggle files list visibility
    toggleFilesListBtn.addEventListener('click', function() {
        // Toggle visibility of the files list container
        filesListContainer.classList.toggle('d-none');
        
        // Change the icon based on the state
        const icon = toggleFilesListBtn.querySelector('i');
        if (filesListContainer.classList.contains('d-none')) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        } else {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        }
    });
    
    // Show/hide duplicates button
    showDuplicatesBtn.addEventListener('click', function() {
        if (!currentFileId) return;
        
        if (showingDuplicates) {
            // Show all data
            renderTableData(currentData);
            
            // Update button text using translation
            const language = localStorage.getItem('uiLanguage') || 'ru';
            const findDuplicatesText = translations['find_duplicates'] ? 
                (translations['find_duplicates'][language] || 'Найти дубликаты') : 
                'Найти дубликаты';
            showDuplicatesBtn.querySelector('span').textContent = findDuplicatesText;
            
            showingDuplicates = false;
            mergeDuplicatesBtn.disabled = true;
        } else {
            // Find duplicates
            fetchDuplicates(currentFileId);
        }
    });
    
    // Hide duplicates button
    const hideDuplicatesBtn = document.getElementById('hideDuplicatesBtn');
    hideDuplicatesBtn.addEventListener('click', function() {
        if (!currentFileId || !currentData.length) return;
        
        if (hidingDuplicates) {
            // Show all data
            renderTableData(currentData);
            
            // Update button text
            const language = localStorage.getItem('uiLanguage') || 'ru';
            const hideDuplicatesText = translations['hide_duplicates'] ? 
                (translations['hide_duplicates'][language] || 'Скрыть дубликаты') : 
                'Скрыть дубликаты';
            hideDuplicatesBtn.querySelector('span').textContent = hideDuplicatesText;
            
            hidingDuplicates = false;
        } else {
            // Hide duplicates from current data
            hideAllDuplicates();
        }
    });
    
    // Merge duplicates button
    mergeDuplicatesBtn.addEventListener('click', function() {
        if (!duplicates.length) return;
        
        // Show confirmation dialog with localized message
        const language = localStorage.getItem('uiLanguage') || 'ru';
        const confirmMsg = language === 'ru' ? 
            `Вы уверены, что хотите объединить ${countDuplicates(duplicates)} дубликатов записей?` : 
            `Are you sure you want to merge ${countDuplicates(duplicates)} duplicate records?`;
            
        if (confirm(confirmMsg)) {
            mergeDuplicates(duplicates);
        }
    });
    
    // Extract emails button
    extractEmailsBtn.addEventListener('click', function() {
        if (!currentData.length) return;
        
        const emails = currentData
            .filter(contact => contact.email && contact.email.trim() !== '')
            .map(contact => contact.email.trim());
        
        if (emails.length === 0) {
            const language = localStorage.getItem('uiLanguage') || 'ru';
            const noEmailsMsg = translations['no_emails_found'] ? 
                (translations['no_emails_found'][language] || 'Не найдено email адресов в данных') : 
                'Не найдено email адресов в данных';
            showAlert(noEmailsMsg, 'warning');
            return;
        }
        
        const uniqueEmails = [...new Set(emails)];
        
        // Create a textarea element to copy to clipboard
        const textarea = document.createElement('textarea');
        textarea.value = uniqueEmails.join('\n');
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        // Get localized message
        const language = localStorage.getItem('uiLanguage') || 'ru';
        const emailsCopiedTemplate = translations['emails_copied'] ? 
            (translations['emails_copied'][language] || 'Скопировано {count} уникальных email адресов') : 
            'Скопировано {count} уникальных email адресов';
        
        const emailsCopiedMsg = emailsCopiedTemplate.replace('{count}', uniqueEmails.length);
        showAlert(emailsCopiedMsg, 'success');
    });
    
    // Scroll buttons
    scrollTopBtn.addEventListener('click', function() {
        // Скроллим к началу таблицы вместо всей страницы
        const tableContainer = document.querySelector('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    scrollBottomBtn.addEventListener('click', function() {
        // Скроллим к концу таблицы вместо всей страницы
        const tableContainer = document.querySelector('.table-responsive');
        if (tableContainer) {
            tableContainer.scrollTo({ top: tableContainer.scrollHeight, behavior: 'smooth' });
        }
    });
    
    // Переключение темы
    if (document.getElementById('themeSwitchBtn')) {
        document.getElementById('themeSwitchBtn').addEventListener('click', function() {
            const html = document.documentElement;
            const themeBtn = document.getElementById('themeSwitchBtn');
            const themeIcon = themeBtn.querySelector('i');
            
            if (html.dataset.bsTheme === 'dark') {
                html.dataset.bsTheme = 'light';
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
                
                // Поменять стиль таблицы
                const stylesheet = document.getElementById('themeStylesheet');
                stylesheet.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
                
                // Сохранить настройку
                localStorage.setItem('theme', 'light');
            } else {
                html.dataset.bsTheme = 'dark';
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
                
                // Поменять стиль таблицы
                const stylesheet = document.getElementById('themeStylesheet');
                stylesheet.href = 'https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css';
                
                // Сохранить настройку
                localStorage.setItem('theme', 'dark');
            }
        });
        
        // Загрузка сохраненной темы
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            const html = document.documentElement;
            const themeBtn = document.getElementById('themeSwitchBtn');
            const themeIcon = themeBtn.querySelector('i');
            
            if (savedTheme === 'light') {
                html.dataset.bsTheme = 'light';
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
                
                // Поменять стиль таблицы
                const stylesheet = document.getElementById('themeStylesheet');
                stylesheet.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
            }
        }
    }
    
    // Functions
    
    // Save column settings
    function saveColumnSettings() {
        // Сохраняем настройки в localStorage
        localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
        localStorage.setItem('columnVisibility', JSON.stringify(columnVisibility));
    }
    
    // Load column settings
    function loadColumnSettings() {
        // Загружаем настройки из localStorage
        const savedWidths = localStorage.getItem('columnWidths');
        const savedVisibility = localStorage.getItem('columnVisibility');
        
        if (savedWidths) {
            columnWidths = JSON.parse(savedWidths);
        }
        
        if (savedVisibility) {
            columnVisibility = JSON.parse(savedVisibility);
        }
    }
    
    // Load processed files list
    // Delete file
    function deleteFile(fileId) {
        fetch(`/delete_file/${fileId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showAlert('Error deleting file: ' + data.error, 'danger');
                return;
            }
            
            // Show success message
            const language = localStorage.getItem('uiLanguage') || 'ru';
            const successMsg = language === 'ru' ? 'Файл успешно удален' : 'File successfully deleted';
            showAlert(successMsg, 'success');
            
            // Reload file list
            loadProcessedFiles();
            
            // If the deleted file was the current one being viewed, reset the view
            if (fileId === currentFileId) {
                resetDataView();
            }
        })
        .catch(error => {
            console.error('Error deleting file:', error);
            showAlert('Error deleting file: ' + error, 'danger');
        });
    }
    
    function loadProcessedFiles() {
        fetch('/get_processed_files')
            .then(response => response.json())
            .then(data => {
                processedFilesList.innerHTML = '';
                fileSelector.innerHTML = '<option value="">Select a file</option>';
                
                if (!data.files || data.files.length === 0) {
                    processedFilesList.innerHTML = '<li class="list-group-item">No processed files yet</li>';
                    return;
                }
                
                data.files.forEach(file => {
                    // Add to processed files list
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.dataset.fileId = file.id;
                    
                    // Determine if this file is currently viewed
                    const isActive = file.id === currentFileId;
                    const eyeButtonClass = isActive ? 'btn-success' : 'btn-outline-danger';
                    
                    li.innerHTML = `
                        <div>
                            <span class="fw-bold">${file.filename}</span>
                            <small class="text-muted d-block">${new Date(file.processed_date).toLocaleString()}</small>
                        </div>
                        <div>
                            <span class="badge bg-primary rounded-pill">${file.row_count} rows</span>
                            <button class="btn btn-sm ${eyeButtonClass} ms-2 load-file-btn" data-file-id="${file.id}" title="${isActive ? 'Сейчас отображается' : 'Нажмите для отображения'}">
                                <i class="fa fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger ms-1 delete-file-btn" data-file-id="${file.id}" title="Удалить файл">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    `;
                    processedFilesList.appendChild(li);
                    
                    // Add to file selector
                    const option = document.createElement('option');
                    option.value = file.id;
                    option.textContent = file.filename;
                    fileSelector.appendChild(option);
                    
                    // Add event listener to load file button
                    li.querySelector('.load-file-btn').addEventListener('click', function() {
                        const fileId = this.getAttribute('data-file-id');
                        loadFileData(fileId);
                    });
                    
                    // Add event listener to delete file button
                    li.querySelector('.delete-file-btn').addEventListener('click', function(e) {
                        e.stopPropagation();
                        const fileId = this.getAttribute('data-file-id');
                        if (confirm('Вы уверены, что хотите удалить этот файл?')) {
                            deleteFile(fileId);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Error loading processed files:', error);
                showAlert('Error loading processed files: ' + error, 'danger');
            });
    }
    
    // File selector change event
    fileSelector.addEventListener('change', function() {
        const fileId = this.value;
        if (fileId) {
            loadFileData(fileId);
        } else {
            resetDataView();
        }
    });
    
    // Load file data
    function loadFileData(fileId) {
        // Reset current data
        resetDataView();
        
        // Show loading
        dataTable.innerHTML = '<tr><td colspan="10" class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
        
        fetch(`/get_file_data/${fileId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showAlert('Error loading file data: ' + data.error, 'danger');
                    return;
                }
                
                // Update current state
                currentFileId = fileId;
                currentColumns = data.columns;
                currentData = data.contacts;
                
                // Update file selector
                fileSelector.value = fileId;
                
                // Update view indicators (eye buttons) for all files
                document.querySelectorAll('.load-file-btn').forEach(btn => {
                    const btnFileId = btn.getAttribute('data-file-id');
                    if (btnFileId === fileId) {
                        btn.classList.remove('btn-outline-danger');
                        btn.classList.add('btn-success');
                        btn.setAttribute('title', 'Сейчас отображается');
                    } else {
                        btn.classList.remove('btn-success');
                        btn.classList.add('btn-outline-danger');
                        btn.setAttribute('title', 'Нажмите для отображения');
                    }
                });
                
                // Show preview container
                previewContainer.classList.remove('d-none');
                
                // Update file info
                document.getElementById('currentFileName').textContent = data.filename;
                document.getElementById('recordCount').textContent = data.contacts.length;
                
                // Enable extract emails button
                extractEmailsBtn.disabled = false;
                
                // Render columns in sidebar
                renderColumnControls(data.columns);
                
                // Render table data
                renderTableData(data.contacts);
            })
            .catch(error => {
                console.error('Error loading file data:', error);
                showAlert('Error loading file data: ' + error, 'danger');
            });
    }
    
    // Reset data view
    // Find Similar Records button event
    const findSimilarBtn = document.getElementById('findSimilarBtn');
    if (findSimilarBtn) {
        findSimilarBtn.addEventListener('click', function() {
            if (!currentFileId) return;
            
            if (showingSimilarRecords) {
                // Вернуться к обычному отображению
                renderTableData(currentData);
                
                // Обновить текст кнопки
                const language = localStorage.getItem('uiLanguage') || 'ru';
                const findSimilarText = language === 'ru' ? 
                    'Найти похожие записи' : 'Find similar records';
                findSimilarBtn.textContent = findSimilarText;
                
                showingSimilarRecords = false;
            } else {
                // Найти похожие записи
                findSimilarRecords();
            }
        });
    }

    function resetDataView() {
        currentFileId = null;
        currentColumns = [];
        currentData = [];
        duplicates = [];
        showingDuplicates = false;
        hidingDuplicates = false;
        noDuplicatesData = [];
        similarRecords = [];
        showingSimilarRecords = false;
        
        previewContainer.classList.add('d-none');
        dataTable.innerHTML = '';
        columnList.innerHTML = '';
        
        // Update text based on current language
        const language = localStorage.getItem('uiLanguage') || 'ru';
        const findDupsText = translations['find_duplicates'][language] || 'Найти дубликаты';
        showDuplicatesBtn.querySelector('span').textContent = findDupsText;
        
        // Reset hide duplicates button text
        const hideDupsText = translations['hide_duplicates'][language] || 'Скрыть дубликаты';
        hideDuplicatesBtn.querySelector('span').textContent = hideDupsText;
        
        mergeDuplicatesBtn.disabled = true;
        extractEmailsBtn.disabled = true;
    }
    
    // Render column controls in sidebar
    // Обработчики кнопок выбора всех/отмены всех столбцов
    if (document.getElementById('selectAllColumns')) {
        document.getElementById('selectAllColumns').addEventListener('click', function() {
            // Выбираем все столбцы
            currentColumns.forEach(column => {
                column.visible = true;
                columnVisibility[column.name] = true;
            });
            
            // Обновляем состояние чекбоксов
            document.querySelectorAll('#columnList input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            
            // Сохраняем настройки и обновляем таблицу
            saveColumnSettings();
            renderTableData(showingDuplicates ? duplicates : currentData);
        });
    }
    
    if (document.getElementById('deselectAllColumns')) {
        document.getElementById('deselectAllColumns').addEventListener('click', function() {
            // Снимаем выбор со всех столбцов (кроме обязательных)
            currentColumns.forEach(column => {
                // Сохраняем видимость для столбца "№" (row_number)
                if (column.name !== 'row_number') {
                    column.visible = false;
                    columnVisibility[column.name] = false;
                }
            });
            
            // Обновляем состояние чекбоксов
            document.querySelectorAll('#columnList input[type="checkbox"]').forEach(checkbox => {
                const columnIndex = parseInt(checkbox.id.replace('column-', ''));
                if (currentColumns[columnIndex].name !== 'row_number') {
                    checkbox.checked = false;
                }
            });
            
            // Сохраняем настройки и обновляем таблицу
            saveColumnSettings();
            renderTableData(showingDuplicates ? duplicates : currentData);
        });
    }

    function renderColumnControls(columns) {
        // Загружаем настройки при первой загрузке
        if (Object.keys(columnVisibility).length === 0) {
            loadColumnSettings();
        }
        
        columnList.innerHTML = '';
        const filtersContainer = document.getElementById('columnFilters');
        if (filtersContainer) filtersContainer.innerHTML = '';
        
        columns.forEach((column, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input me-2';
            checkbox.id = `column-${index}`;
            
            // Используем сохраненные настройки видимости, если они есть
            if (columnVisibility[column.name] !== undefined) {
                column.visible = columnVisibility[column.name];
            }
            
            checkbox.checked = column.visible;
            checkbox.addEventListener('change', function() {
                // Update column visibility
                currentColumns[index].visible = this.checked;
                
                // Сохраняем настройку видимости
                columnVisibility[column.name] = this.checked;
                saveColumnSettings();
                
                // Re-render table
                renderTableData(showingDuplicates ? duplicates : currentData);
            });
            
            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = `column-${index}`;
            label.textContent = column.display_name;
            
            li.appendChild(checkbox);
            li.appendChild(label);
            
            // Добавляем поле фильтрации для каждого столбца
            if (column.name !== 'row_number' && column.name !== 'id') {
                const filterInput = document.createElement('input');
                filterInput.type = 'text';
                filterInput.className = 'form-control column-filter';
                filterInput.placeholder = `Фильтр по ${column.display_name}...`;
                filterInput.dataset.column = column.name;
                
                // Добавляем обработчик события для фильтрации
                filterInput.addEventListener('input', function() {
                    applyFilters();
                });
                
                li.appendChild(filterInput);
            }
            
            columnList.appendChild(li);
        });
    }
    
    // Render table data
    // Initialize pagination controls
    function initPagination() {
        // Get pagination elements
        const rowsPerPageSelect = document.getElementById('rowsPerPage');
        const tableFirstPage = document.getElementById('tableFirstPage');
        const tablePrevPage = document.getElementById('tablePrevPage');
        const tableNextPage = document.getElementById('tableNextPage');
        const tableLastPage = document.getElementById('tableLastPage');
        const tableCurrentPage = document.getElementById('tableCurrentPage');
        
        // Initialize rows per page from localStorage or default
        const savedRowsPerPage = localStorage.getItem('rowsPerPage');
        if (savedRowsPerPage) {
            rowsPerPageSelect.value = savedRowsPerPage;
            rowsPerPage = parseInt(savedRowsPerPage);
        }
        
        // Add event listeners for pagination controls
        rowsPerPageSelect.addEventListener('change', function() {
            rowsPerPage = parseInt(this.value);
            localStorage.setItem('rowsPerPage', rowsPerPage);
            currentPage = 1; // Reset to first page when changing rows per page
            renderTableData(filteredData.length > 0 ? filteredData : currentData);
        });
        
        tableFirstPage.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage = 1;
                renderTableData(filteredData.length > 0 ? filteredData : currentData);
            }
        });
        
        tablePrevPage.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                renderTableData(filteredData.length > 0 ? filteredData : currentData);
            }
        });
        
        tableNextPage.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                renderTableData(filteredData.length > 0 ? filteredData : currentData);
            }
        });
        
        tableLastPage.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage = totalPages;
                renderTableData(filteredData.length > 0 ? filteredData : currentData);
            }
        });
    }
    
    // Initialize resizable columns
    function initResizableColumns() {
        const table = document.getElementById('dataTableElement');
        
        // Create resize handlers after the table headers are rendered
        setTimeout(() => {
            const headers = table.querySelectorAll('th:not(.row-number)');
            
            headers.forEach(header => {
                // Create resizer element
                const resizer = document.createElement('div');
                resizer.className = 'resizer';
                header.appendChild(resizer);
                
                let x = 0;
                let w = 0;
                
                // Mouse down event listener
                const mouseDownHandler = function(e) {
                    // Get the current width
                    const headerRect = header.getBoundingClientRect();
                    x = e.clientX;
                    w = headerRect.width;
                    
                    // Add the resizing class
                    resizer.classList.add('resizing');
                    
                    // Add event listeners for mousemove and mouseup
                    document.addEventListener('mousemove', mouseMoveHandler);
                    document.addEventListener('mouseup', mouseUpHandler);
                };
                
                // Mouse move event handler
                const mouseMoveHandler = function(e) {
                    // Calculate the new width
                    const dx = e.clientX - x;
                    const newWidth = Math.max(30, w + dx); // Минимальная ширина 30px
                    header.style.width = `${newWidth}px`;
                    header.style.minWidth = `${newWidth}px`;
                    
                    // Также установим эту ширину для всех ячеек в этом столбце
                    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
                    if (columnIndex > -1) {
                        const rows = table.querySelectorAll('tbody tr');
                        rows.forEach(row => {
                            const cell = row.querySelector(`td:nth-child(${columnIndex + 1})`);
                            if (cell) {
                                cell.style.width = `${newWidth}px`;
                                cell.style.maxWidth = `${newWidth}px`;
                            }
                        });
                    }
                };
                
                // Mouse up event handler
                const mouseUpHandler = function() {
                    // Remove the resizing class
                    resizer.classList.remove('resizing');
                    
                    // Remove the event listeners
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                    
                    // Сохраняем ширину столбца
                    const columnIndex = Array.from(header.parentNode.children).indexOf(header);
                    if (columnIndex > -1 && currentColumns[columnIndex]) {
                        // Получаем имя столбца из currentColumns
                        const columnName = currentColumns[columnIndex].name;
                        // Получаем текущую ширину столбца
                        const width = header.style.width;
                        // Сохраняем ширину в объекте columnWidths
                        columnWidths[columnName] = width;
                        // Сохраняем настройки
                        saveColumnSettings();
                    }
                };
                
                // Add the mousedown event listener to the resizer
                resizer.addEventListener('mousedown', mouseDownHandler);
            });
        }, 100);
    }
    
    function renderTableData(data) {
        // First initialization of pagination if not already done
        if (!document.getElementById('rowsPerPage').hasEventListener) {
            initPagination();
            document.getElementById('rowsPerPage').hasEventListener = true;
        }
        
        // Store the original data for filtering
        filteredData = [...data];
        
        // Get references to the table header and body
        const tableHeader = document.getElementById('tableHeader');
        tableHeader.innerHTML = '';
        dataTable.innerHTML = '';
        
        if (!data || data.length === 0) {
            tableHeader.innerHTML = '<th colspan="10" class="text-center">No data available</th>';
            return;
        }
        
        // Calculate pagination
        totalPages = rowsPerPage === -1 ? 1 : Math.ceil(data.length / rowsPerPage);
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
        
        // Determine the slice of data to display
        const startIndex = rowsPerPage === -1 ? 0 : (currentPage - 1) * rowsPerPage;
        const endIndex = rowsPerPage === -1 ? data.length : Math.min(startIndex + rowsPerPage, data.length);
        const displayData = data.slice(startIndex, endIndex);
        
        // Update table info text
        const language = localStorage.getItem('uiLanguage') || 'ru';
        const tableInfoText = document.getElementById('tableInfoText');
        const showingRecordsText = language === 'ru' ? 
            `Показаны записи ${startIndex + 1} - ${endIndex} из ${data.length}` : 
            `Showing records ${startIndex + 1} - ${endIndex} of ${data.length}`;
        tableInfoText.textContent = showingRecordsText;
        
        // Create row number header cell
        const rowNumberHeader = document.createElement('th');
        rowNumberHeader.textContent = '№';
        rowNumberHeader.className = 'row-number';
        tableHeader.appendChild(rowNumberHeader);
        
        // Add visible columns to header
        currentColumns.forEach(column => {
            if (column.visible) {
                const th = document.createElement('th');
                th.textContent = column.display_name;
                th.dataset.column = column.name;
                tableHeader.appendChild(th);
            }
        });
        
        // Create data rows with row numbers
        displayData.forEach((contact, index) => {
            const row = document.createElement('tr');
            
            // Add row number cell
            const rowNumberCell = document.createElement('td');
            rowNumberCell.textContent = startIndex + index + 1;
            rowNumberCell.className = 'row-number';
            row.appendChild(rowNumberCell);
            
            // Add visible columns to row
            currentColumns.forEach(column => {
                if (column.visible) {
                    const td = document.createElement('td');
                    
                    // Special handling for email (clickable for Gmail)
                    if (column.name === 'email' && contact.email) {
                        td.innerHTML = `<a href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}" target="_blank" class="clickable">${contact.email}</a>`;
                    }
                    // Special handling for phone (clickable for WhatsApp)
                    else if (column.name === 'phone' && contact.phone) {
                        const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
                        td.innerHTML = `<a href="https://wa.me/${cleanPhone}" target="_blank" class="clickable">${contact.phone}</a>`;
                    }
                    // Handle merged data
                    else if (contact.merged && column.name === 'notes' && contact.notes && contact.notes.includes('Merged')) {
                        const notes = contact.notes.split('\n');
                        const regularNotes = notes.filter(note => !note.startsWith('Merged ')).join('\n');
                        const mergedNotes = notes.filter(note => note.startsWith('Merged ')).join('\n');
                        
                        if (regularNotes) {
                            td.innerHTML = `${regularNotes}<br><span class="merged-data">${mergedNotes}</span>`;
                        } else {
                            td.innerHTML = `<span class="merged-data">${mergedNotes}</span>`;
                        }
                    }
                    // Regular data
                    else {
                        td.textContent = contact[column.name] || '';
                    }
                    
                    row.appendChild(td);
                }
            });
            
            dataTable.appendChild(row);
        });
        
        // Update pagination UI
        updatePaginationUI();
        
        // Initialize resizable columns
        initResizableColumns();
    }
    
    // Update pagination UI based on current state
    function updatePaginationUI() {
        const tableFirstPage = document.getElementById('tableFirstPage');
        const tablePrevPage = document.getElementById('tablePrevPage');
        const tableNextPage = document.getElementById('tableNextPage');
        const tableLastPage = document.getElementById('tableLastPage');
        const tableCurrentPage = document.getElementById('tableCurrentPage');
        
        // Update current page display
        tableCurrentPage.textContent = `${currentPage} / ${totalPages}`;
        
        // Disable/enable pagination buttons based on current page
        tableFirstPage.parentElement.classList.toggle('disabled', currentPage === 1);
        tablePrevPage.parentElement.classList.toggle('disabled', currentPage === 1);
        tableNextPage.parentElement.classList.toggle('disabled', currentPage === totalPages);
        tableLastPage.parentElement.classList.toggle('disabled', currentPage === totalPages);
    }
    
    // Fetch duplicates
    function fetchDuplicates(fileId) {
        fetch(`/find_duplicates/${fileId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showAlert('Error finding duplicates: ' + data.error, 'danger');
                    return;
                }
                
                duplicates = data.duplicates || [];
                
                if (duplicates.length === 0) {
                    const language = localStorage.getItem('uiLanguage') || 'ru';
                    const noDuplicatesMsg = translations['no_duplicates'] ? 
                        (translations['no_duplicates'][language] || 'Дубликаты не найдены') : 
                        'Дубликаты не найдены';
                    showAlert(noDuplicatesMsg, 'info');
                    return;
                }
                
                // Flatten duplicates for display
                const flatDuplicates = duplicates.flat();
                
                // Update UI
                const language = localStorage.getItem('uiLanguage') || 'ru';
                const showAllText = translations['show_all_records'] ? 
                    (translations['show_all_records'][language] || 'Показать все записи') : 
                    'Показать все записи';
                showDuplicatesBtn.querySelector('span').textContent = showAllText;
                showingDuplicates = true;
                mergeDuplicatesBtn.disabled = false;
                
                // Render duplicates
                renderTableData(flatDuplicates);
                
                // Get localized message
                const message = language === 'ru' ? 
                    `Найдено ${countDuplicates(duplicates)} дубликатов записей` : 
                    `Found ${countDuplicates(duplicates)} duplicate records`;
                showAlert(message, 'info');
            })
            .catch(error => {
                console.error('Error finding duplicates:', error);
                showAlert('Error finding duplicates: ' + error, 'danger');
            });
    }
    
    // Count total number of duplicate records
    function countDuplicates(duplicateGroups) {
        let count = 0;
        duplicateGroups.forEach(group => {
            count += Math.max(0, group.length - 1); // Count all but the first in each group
        });
        return count;
    }
    
    // Hide all duplicates in current data
    function hideAllDuplicates() {
        // Don't reprocess if already hiding duplicates
        if (hidingDuplicates) return;
        
        // Create duplicate checking function
        const isDuplicate = (record1, record2) => {
            // Check email duplicates (non-empty)
            if (record1.email && record2.email && 
                record1.email.toLowerCase() === record2.email.toLowerCase()) {
                return true;
            }
            
            // Check phone duplicates (non-empty)
            if (record1.phone && record2.phone) {
                // Normalize phone numbers by removing non-digit characters
                const phone1 = record1.phone.replace(/\D/g, '');
                const phone2 = record2.phone.replace(/\D/g, '');
                
                // If both are non-empty after normalization and they match
                if (phone1 && phone2 && phone1 === phone2) {
                    return true;
                }
            }
            
            return false;
        };
        
        // Create a copy of the original data to work with
        const records = [...currentData];
        const uniqueRecords = [];
        const duplicateIndices = new Set();
        
        // Find all duplicates
        for (let i = 0; i < records.length; i++) {
            if (duplicateIndices.has(i)) continue;
            
            const current = records[i];
            uniqueRecords.push(current);
            
            // Check against all remaining records
            for (let j = i + 1; j < records.length; j++) {
                if (duplicateIndices.has(j)) continue;
                
                const other = records[j];
                if (isDuplicate(current, other)) {
                    duplicateIndices.add(j);
                }
            }
        }
        
        // Store the unique records for display
        noDuplicatesData = uniqueRecords;
        
        // Update UI
        const language = localStorage.getItem('uiLanguage') || 'ru';
        const showDuplicatesText = translations['show_duplicates'] ? 
            (translations['show_duplicates'][language] || 'Показать дубликаты') : 
            'Показать дубликаты';
        hideDuplicatesBtn.querySelector('span').textContent = showDuplicatesText;
        
        hidingDuplicates = true;
        
        // Render the unique records
        renderTableData(noDuplicatesData);
        
        // Show a message about how many duplicates were hidden
        const duplicatesHidden = records.length - uniqueRecords.length;
        const message = language === 'ru' ? 
            `Скрыто ${duplicatesHidden} дубликатов` : 
            `Hidden ${duplicatesHidden} duplicates`;
        showAlert(message, 'info');
    }
    
    // Merge duplicates
    // Find similar records function
    function findSimilarRecords() {
        if (!currentFileId) return;
        
        // Show loading state
        const findSimilarBtn = document.getElementById('findSimilarBtn');
        if (findSimilarBtn) {
            const originalText = findSimilarBtn.innerHTML;
            findSimilarBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Поиск...';
            findSimilarBtn.disabled = true;
            
            fetch('/find_similar_records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ file_id: currentFileId })
            })
            .then(response => response.json())
            .then(data => {
                // Reset button
                findSimilarBtn.innerHTML = originalText;
                findSimilarBtn.disabled = false;
                
                if (data.error) {
                    showAlert('Error finding similar records: ' + data.error, 'danger');
                    return;
                }
                
                similarRecords = data.similar_contacts || [];
                
                if (similarRecords.length === 0) {
                    const language = localStorage.getItem('uiLanguage') || 'ru';
                    const noSimilarRecordsMsg = language === 'ru' ? 
                        'Похожие записи не найдены' : 'No similar records found';
                    showAlert(noSimilarRecordsMsg, 'info');
                    return;
                }
                
                // Update UI to show we're displaying similar records
                const language = localStorage.getItem('uiLanguage') || 'ru';
                const showAllText = language === 'ru' ? 
                    'Показать все записи' : 'Show all records';
                findSimilarBtn.textContent = showAllText;
                showingSimilarRecords = true;
                
                // Add file information to each record
                similarRecords.forEach(record => {
                    record.file_name = data.file_info[record.file_id] || 'Unknown file';
                });
                
                // Render the similar records table with special columns
                renderSimilarRecordsTable(similarRecords);
                
                // Get a localized message for the alert
                const message = language === 'ru' ? 
                    `Найдено ${similarRecords.length} записей по email и телефону из других файлов` : 
                    `Found ${similarRecords.length} records by email and phone from other files`;
                showAlert(message, 'info');
            })
            .catch(error => {
                findSimilarBtn.innerHTML = originalText;
                findSimilarBtn.disabled = false;
                console.error('Error finding similar records:', error);
                showAlert('Error finding similar records: ' + error, 'danger');
            });
        }
    }
    
    // Render similar records table
    function renderSimilarRecordsTable(records) {
        // Similar to renderTableData but with additional columns for file info
        
        // Get references to the table header and body
        const tableHeader = document.getElementById('tableHeader');
        tableHeader.innerHTML = '';
        dataTable.innerHTML = '';
        
        if (!records || records.length === 0) {
            tableHeader.innerHTML = '<th colspan="10" class="text-center">No similar records found</th>';
            return;
        }
        
        // Create special columns for similar records view
        const similarColumns = [
            { name: 'match_type', display_name: 'Тип совпадения', visible: true },
            { name: 'file_name', display_name: 'Файл', visible: true }
        ];
        
        // Combine with regular columns
        const combinedColumns = currentColumns.concat(similarColumns);
        
        // Create row number header cell
        const rowNumberHeader = document.createElement('th');
        rowNumberHeader.textContent = '№';
        rowNumberHeader.className = 'row-number';
        tableHeader.appendChild(rowNumberHeader);
        
        // Add visible columns to header
        combinedColumns.forEach(column => {
            if (column.visible) {
                const th = document.createElement('th');
                th.textContent = column.display_name;
                th.dataset.column = column.name;
                tableHeader.appendChild(th);
            }
        });
        
        // Create data rows with row numbers
        records.forEach((contact, index) => {
            const row = document.createElement('tr');
            
            // Add row number cell
            const rowNumberCell = document.createElement('td');
            rowNumberCell.textContent = index + 1;
            rowNumberCell.className = 'row-number';
            row.appendChild(rowNumberCell);
            
            // Add visible columns to row
            combinedColumns.forEach(column => {
                if (column.visible) {
                    const td = document.createElement('td');
                    
                    // Special handling for match type
                    if (column.name === 'match_type') {
                        const matchType = contact.match_type || '';
                        td.textContent = matchType === 'email' ? 'Email' : matchType === 'phone' ? 'Телефон' : '';
                        td.className = matchType === 'email' ? 'bg-info-subtle' : matchType === 'phone' ? 'bg-warning-subtle' : '';
                    }
                    // Special handling for file name
                    else if (column.name === 'file_name') {
                        td.textContent = contact.file_name || '';
                        td.className = 'bg-light';
                    }
                    // Special handling for email (clickable for Gmail)
                    else if (column.name === 'email' && contact.email) {
                        td.innerHTML = `<a href="https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}" target="_blank" class="clickable">${contact.email}</a>`;
                    }
                    // Special handling for phone (clickable for WhatsApp)
                    else if (column.name === 'phone' && contact.phone) {
                        const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
                        td.innerHTML = `<a href="https://wa.me/${cleanPhone}" target="_blank" class="clickable">${contact.phone}</a>`;
                    }
                    // Regular data
                    else {
                        td.textContent = contact[column.name] || '';
                    }
                    
                    row.appendChild(td);
                }
            });
            
            dataTable.appendChild(row);
        });
        
        // Initialize resizable columns
        initResizableColumns();
    }

    function mergeDuplicates(duplicateGroups) {
        fetch('/merge_duplicates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ duplicates: duplicateGroups })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showAlert('Error merging duplicates: ' + data.error, 'danger');
                return;
            }
            
            // Get localized message
            const language = localStorage.getItem('uiLanguage') || 'ru';
            const mergeSuccessMsg = translations['merged_success'][language] || 'Дубликаты успешно объединены';
            showAlert(mergeSuccessMsg, 'success');
            
            // Reload current file data
            loadFileData(currentFileId);
        })
        .catch(error => {
            console.error('Error merging duplicates:', error);
            showAlert('Error merging duplicates: ' + error, 'danger');
        });
    }
    
    // Statistics function removed
    
    // Helper functions
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Show alert
    function showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => {
                alertContainer.removeChild(alert);
            }, 150);
        }, 5000);
    }
    
    // Function to load all contacts from database
    function loadAllContacts() {
        // Reset the current state
        resetDataView();
        
        fetch('/get_all_contacts')
            .then(response => response.json())
            .then(data => {
                // Update current data
                currentData = data.contacts;
                currentColumns = data.columns;
                
                // Update file name display
                document.getElementById('currentFileName').textContent = data.filename;
                
                // Show the preview container
                previewContainer.classList.remove('d-none');
                
                // Render columns and data
                renderColumnControls(data.columns);
                renderTableData(data.contacts);
                
                // Update record count
                document.getElementById('recordCount').textContent = data.contacts.length;
                
                // Make the extract emails button available
                extractEmailsBtn.disabled = false;
                
                // Load column visibility settings
                loadColumnSettings();
                
                // Initialize resizable columns
                initResizableColumns();
                
                // Initialize pagination
                initPagination();
                
                // Hide duplicates button should be enabled for all data
                hideDuplicatesBtn.disabled = false;
                
                // Show/Hide controls based on context
                document.getElementById('fileSelector').disabled = true; // Disable file selector since we're viewing all contacts
                
                // Reset duplicates state
                duplicates = [];
                showingDuplicates = false;
                hidingDuplicates = false;
            })
            .catch(error => {
                console.error('Error fetching all contacts:', error);
                showAlert('Error loading all contacts data: ' + error, 'danger');
            });
    }
    
    // Add event listener for "View All Contacts" button
    if (viewAllContactsBtn) {
        viewAllContactsBtn.addEventListener('click', function() {
            loadAllContacts();
        });
    }
    
    // Load processed files on page load
    loadProcessedFiles();
});
