// MySQL Export Functionality

/**
 * Initialize MySQL export functionality
 */
function initMySQLExport() {
    const exportToMySQLBtn = document.getElementById('exportToMySQLBtn');
    const confirmMySQLExportBtn = document.getElementById('confirmMySQLExportBtn');
    const mysqlExportModal = new bootstrap.Modal(document.getElementById('mysqlExportModal'));
    const showAllTablesCheck = document.getElementById('showAllTablesCheck');
    
    // Save MySQL connection settings to localStorage
    function saveMySQLSettings() {
        const settings = {
            host: document.getElementById('mysqlHost').value,
            port: document.getElementById('mysqlPort').value,
            database: document.getElementById('mysqlDatabase').value,
            user: document.getElementById('mysqlUser').value,
            // Don't save password for security reasons
        };
        localStorage.setItem('mysqlSettings', JSON.stringify(settings));
    }
    
    // Load MySQL connection settings from localStorage
    function loadMySQLSettings() {
        const settingsJson = localStorage.getItem('mysqlSettings');
        if (settingsJson) {
            try {
                const settings = JSON.parse(settingsJson);
                document.getElementById('mysqlHost').value = settings.host || 'localhost';
                document.getElementById('mysqlPort').value = settings.port || '3306';
                document.getElementById('mysqlDatabase').value = settings.database || 'contacts_db';
                document.getElementById('mysqlUser').value = settings.user || 'root';
            } catch (e) {
                console.error('Error loading MySQL settings:', e);
            }
        }
    }
    
    // Open MySQL export modal
    exportToMySQLBtn.addEventListener('click', function() {
        loadMySQLSettings();
        mysqlExportModal.show();
    });
    
    // Confirm MySQL export
    confirmMySQLExportBtn.addEventListener('click', function() {
        const exportAllFiles = document.getElementById('exportAllCheck').checked;
        const mysqlHost = document.getElementById('mysqlHost').value;
        const mysqlPort = document.getElementById('mysqlPort').value;
        const mysqlDatabase = document.getElementById('mysqlDatabase').value;
        const mysqlUser = document.getElementById('mysqlUser').value;
        const mysqlPassword = document.getElementById('mysqlPassword').value;
        
        // Validate connection details
        if (!mysqlHost || !mysqlPort || !mysqlDatabase || !mysqlUser) {
            showAlert('Please fill in all required MySQL connection fields', 'danger');
            return;
        }
        
        // Save settings for future use (except password)
        saveMySQLSettings();
        
        // Show loading state
        confirmMySQLExportBtn.disabled = true;
        confirmMySQLExportBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Exporting...';
        
        // Prepare export data
        const checkUniqueness = document.getElementById('checkUniquenessCheck').checked;
        
        const exportData = {
            mysql_config: {
                host: mysqlHost,
                port: parseInt(mysqlPort),
                database: mysqlDatabase,
                user: mysqlUser,
                password: mysqlPassword
            },
            export_all: exportAllFiles,
            file_id: exportAllFiles ? null : currentFileId,
            check_uniqueness: checkUniqueness
        };
        
        // Send export request to server
        fetch('/export_to_mysql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exportData)
        })
        .then(response => response.json())
        .then(data => {
            confirmMySQLExportBtn.disabled = false;
            confirmMySQLExportBtn.innerHTML = 'Export';
            
            if (data.success) {
                // Hide the export modal
                mysqlExportModal.hide();
                
                // Update success modal with export details
                document.getElementById('mysqlExportRecordCount').textContent = data.exported_count;
                
                // Update the tables list
                if (data.mysql_tables && data.mysql_tables.length > 0) {
                    // Update the visible tables list in the success modal
                    const tablesList = data.mysql_tables.map(table => table.name).join(', ');
                    document.getElementById('mysqlExportTablesList').textContent = tablesList;
                    
                    // Update MySQL table status for the main UI
                    updateMySQLTableStatus(data.mysql_tables);
                } else {
                    document.getElementById('mysqlExportTablesList').textContent = '-';
                }
                
                // Show success modal
                const mysqlExportSuccessModal = new bootstrap.Modal(document.getElementById('mysqlExportSuccessModal'));
                mysqlExportSuccessModal.show();
                
                // Add event listener to the "Manage Tables" button if not already added
                const manageMySQLTablesBtn = document.getElementById('manageMySQLTablesBtn');
                if (!manageMySQLTablesBtn.hasEventListener) {
                    manageMySQLTablesBtn.addEventListener('click', function() {
                        // Hide success modal
                        mysqlExportSuccessModal.hide();
                        
                        // Show tables management modal
                        const mysqlTablesModal = new bootstrap.Modal(document.getElementById('mysqlTablesModal'));
                        mysqlTablesModal.show();
                        
                        // TODO: Load tables data here
                    });
                    manageMySQLTablesBtn.hasEventListener = true;
                }
            } else {
                showAlert('Ошибка экспорта в MySQL: ' + data.error, 'danger');
            }
        })
        .catch(error => {
            confirmMySQLExportBtn.disabled = false;
            confirmMySQLExportBtn.innerHTML = 'Export';
            showAlert('Error connecting to MySQL: ' + error, 'danger');
        });
    });
    
    // Handle MySQL table visibility toggle
    showAllTablesCheck.addEventListener('change', function() {
        const showAll = this.checked;
        
        // Update UI to show/hide inactive tables
        document.querySelectorAll('.mysql-table-item').forEach(item => {
            if (showAll || item.dataset.active === 'true') {
                item.classList.remove('d-none');
            } else {
                item.classList.add('d-none');
            }
        });
        
        // Save preference to localStorage
        localStorage.setItem('showAllTables', showAll ? 'true' : 'false');
    });
    
    // Load table visibility preference
    const showAllTables = localStorage.getItem('showAllTables');
    if (showAllTables !== null) {
        showAllTablesCheck.checked = showAllTables === 'true';
    }
}

/**
 * Update MySQL table status in the UI
 * @param {Array} tables - List of MySQL tables with status
 */
function updateMySQLTableStatus(tables) {
    const filesList = document.getElementById('processedFilesList');
    
    // Update status for each table in the list
    tables.forEach(table => {
        const tableItem = document.querySelector(`.mysql-table-item[data-table-name="${table.name}"]`);
        if (tableItem) {
            tableItem.dataset.active = table.active ? 'true' : 'false';
            
            const statusIndicator = tableItem.querySelector('.mysql-table-status');
            if (statusIndicator) {
                statusIndicator.classList.toggle('mysql-status-active', table.active);
                statusIndicator.classList.toggle('mysql-status-inactive', !table.active);
            }
            
            // Hide inactive tables if "Show all tables" is unchecked
            if (!document.getElementById('showAllTablesCheck').checked && !table.active) {
                tableItem.classList.add('d-none');
            } else {
                tableItem.classList.remove('d-none');
            }
        }
    });
}

/**
 * Toggle MySQL table visibility
 * @param {string} tableName - Name of the MySQL table to toggle
 */
function toggleMySQLTable(tableName) {
    // Send request to server to toggle table status
    fetch('/toggle_mysql_table', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ table_name: tableName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update table status in UI
            const tableItem = document.querySelector(`.mysql-table-item[data-table-name="${tableName}"]`);
            if (tableItem) {
                tableItem.dataset.active = data.active ? 'true' : 'false';
                
                const statusIndicator = tableItem.querySelector('.mysql-table-status');
                if (statusIndicator) {
                    statusIndicator.classList.toggle('mysql-status-active', data.active);
                    statusIndicator.classList.toggle('mysql-status-inactive', !data.active);
                }
                
                // Hide inactive tables if "Show all tables" is unchecked
                if (!document.getElementById('showAllTablesCheck').checked && !data.active) {
                    tableItem.classList.add('d-none');
                }
            }
            
            showAlert(`Table '${tableName}' is now ${data.active ? 'active' : 'inactive'}`, 'success');
        } else {
            showAlert('Error toggling table status: ' + data.error, 'danger');
        }
    })
    .catch(error => {
        showAlert('Error connecting to server: ' + error, 'danger');
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initMySQLExport);