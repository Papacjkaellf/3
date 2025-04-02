// File processing utilities

// Extract email from a given text
function extractEmails(text) {
    if (!text) return [];
    
    // Regular expression for email validation
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return text.match(emailRegex) || [];
}

// Extract phone numbers from a given text
function extractPhones(text) {
    if (!text) return [];
    
    // Regular expression for phone number validation (various formats)
    const phoneRegex = /(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g;
    return text.match(phoneRegex) || [];
}

// Detect file type from mime type or extension
function detectFileType(file) {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
        return 'csv';
    } else if (fileName.endsWith('.txt')) {
        return 'txt';
    } else if (fileName.endsWith('.xls')) {
        return 'xls';
    } else if (fileName.endsWith('.xlsx')) {
        return 'xlsx';
    } else {
        // Try to guess from mime type
        const mimeType = file.type;
        
        if (mimeType === 'text/csv') {
            return 'csv';
        } else if (mimeType === 'text/plain') {
            return 'txt';
        } else if (mimeType === 'application/vnd.ms-excel') {
            return 'xls';
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return 'xlsx';
        }
    }
    
    return 'unknown';
}

// Validate that the file is one of the supported types
function validateFileType(file) {
    const fileType = detectFileType(file);
    return fileType !== 'unknown';
}

// Get standard column names mapping
function getColumnMapping() {
    return {
        'name': ['name', 'fullname', 'full name', 'full_name', 'contact', 'contact name', 'contact_name', 'person', 'client'],
        'email': ['email', 'email address', 'email_address', 'emailaddress', 'mail', 'e-mail', 'e mail'],
        'phone': ['phone', 'phone number', 'phone_number', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell', 'cellphone'],
        'facebook': ['facebook', 'fb', 'facebook url', 'facebook_url', 'fb url', 'fb_url', 'social', 'social media'],
        'address': ['address', 'location', 'full address', 'full_address', 'street', 'city', 'area'],
        'company': ['company', 'organization', 'business', 'business name', 'business_name', 'company name', 'company_name', 'firm'],
        'position': ['position', 'title', 'job', 'job title', 'job_title', 'role', 'job role', 'job_role']
    };
}

// Normalize column name
function normalizeColumnName(name) {
    if (!name) return '';
    
    const normalized = name.toLowerCase().trim();
    const mapping = getColumnMapping();
    
    for (const [standardName, variations] of Object.entries(mapping)) {
        if (variations.includes(normalized)) {
            return standardName;
        }
    }
    
    return normalized;
}
