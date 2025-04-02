/**
 * Database Manager Module
 * Handles database operations like viewing, creating, switching and deleting databases
 */

function initDatabaseManager() {
    // Initialize the database manager when the document is loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Load database information
        loadDatabaseInfo();

        // Set up event listeners
        const dbManagerBtn = document.getElementById('database-manager-btn');
        if (dbManagerBtn) {
            dbManagerBtn.addEventListener('click', toggleDatabaseManagerPanel);
        }

        // Close button handler
        const closeDbManagerBtn = document.getElementById('close-database-manager');
        if (closeDbManagerBtn) {
            closeDbManagerBtn.addEventListener('click', toggleDatabaseManagerPanel);
        }

        // Create New Database form submission
        const createDbForm = document.getElementById('create-db-form');
        if (createDbForm) {
            createDbForm.addEventListener('submit', (e) => {
                e.preventDefault();
                createNewDatabase();
            });
        }

        // Add click event handler to database paths to show full path
        document.addEventListener('click', function(e) {
            if (e.target.matches('#current-db-path, #db-folder-path, .database-path')) {
                const path = e.target.textContent;
                alert('Полный путь: ' + path);
            }
        });
    });
}

/**
 * Toggle the database manager panel
 */
function toggleDatabaseManagerPanel() {
    const panel = document.getElementById('database-manager-panel');
    if (panel) {
        if (panel.classList.contains('show')) {
            panel.classList.remove('show');
        } else {
            panel.classList.add('show');
            loadDatabaseInfo(); // Refresh database info when opening the panel
        }
    }
}

/**
 * Load database information from the server
 */
function loadDatabaseInfo() {
    fetch('/get_database_info')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateDatabaseInfo(data);
            } else {
                showAlert(data.error || 'Failed to load database information', 'danger');
            }
        })
        .catch(error => {
            console.error('Error loading database info:', error);
            showAlert('Error loading database information', 'danger');
        });
}

/**
 * Update the database information in the UI
 * @param {Object} data - Database information from the server
 */
function updateDatabaseInfo(data) {
    const dbListContainer = document.getElementById('database-list');
    const currentDbPathDisplay = document.getElementById('current-db-path');
    const dbFolderPathDisplay = document.getElementById('db-folder-path');
    
    if (dbListContainer) {
        // Clear the list first
        dbListContainer.innerHTML = '';
        
        // Display the list of databases
        if (data.databases && data.databases.length > 0) {
            data.databases.forEach(db => {
                const dbItem = document.createElement('div');
                dbItem.className = 'database-item mb-2 p-2 border rounded';
                if (db.is_active) {
                    dbItem.classList.add('active-database');
                }
                
                dbItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${db.name}</strong> ${db.is_active ? '<span class="badge bg-success">Active</span>' : ''}
                            <br>
                            <small>${db.size_formatted} • ${db.modified}</small>
                            <br>
                            <div class="database-path" title="${db.path}">${db.path}</div>
                        </div>
                        <div class="database-actions">
                            ${!db.is_active ? `
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="switchToDatabase('${db.path}')">
                                    Switch
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteDatabase('${db.path}')">
                                    Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
                dbListContainer.appendChild(dbItem);
            });
        } else {
            dbListContainer.innerHTML = '<div class="alert alert-info">No databases found</div>';
        }
    }
    
    // Update the current database path display
    if (currentDbPathDisplay) {
        currentDbPathDisplay.textContent = data.current_db;
        currentDbPathDisplay.title = data.current_db;
    }
    
    // Update the database folder path display
    if (dbFolderPathDisplay) {
        dbFolderPathDisplay.textContent = data.db_folder;
        dbFolderPathDisplay.title = data.db_folder;
    }
}

/**
 * Create a new database
 */
function createNewDatabase() {
    const dbNameInput = document.getElementById('new-db-name');
    if (!dbNameInput || !dbNameInput.value.trim()) {
        showAlert('Please enter a database name', 'warning');
        return;
    }
    
    const dbName = dbNameInput.value.trim();
    
    // Send request to create a new database
    fetch('/create_database', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ db_name: dbName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            dbNameInput.value = ''; // Clear the input
            loadDatabaseInfo(); // Refresh the database list
        } else {
            showAlert(data.error || 'Failed to create database', 'danger');
        }
    })
    .catch(error => {
        console.error('Error creating database:', error);
        showAlert('Error creating database', 'danger');
    });
}

/**
 * Switch to another database
 * @param {string} dbPath - Path to the database file
 */
function switchToDatabase(dbPath) {
    if (!confirm('Switch to the selected database? Any unsaved changes to the current database will be lost.')) {
        return;
    }
    
    fetch('/switch_database', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ db_path: dbPath })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            loadDatabaseInfo(); // Refresh the database list
            resetDataView(); // Reset the main data view since we switched databases
        } else {
            showAlert(data.error || 'Failed to switch database', 'danger');
        }
    })
    .catch(error => {
        console.error('Error switching database:', error);
        showAlert('Error switching database', 'danger');
    });
}

/**
 * Delete a database
 * @param {string} dbPath - Path to the database file
 */
function deleteDatabase(dbPath) {
    if (!confirm('Are you sure you want to delete this database? This action cannot be undone!')) {
        return;
    }
    
    fetch('/delete_database', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ db_path: dbPath })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            loadDatabaseInfo(); // Refresh the database list
        } else {
            showAlert(data.error || 'Failed to delete database', 'danger');
        }
    })
    .catch(error => {
        console.error('Error deleting database:', error);
        showAlert('Error deleting database', 'danger');
    });
}

// Initialize the database manager
initDatabaseManager();