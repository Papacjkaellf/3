// Duplicate detection and management utilities

// Check if two contacts are duplicates based on email or phone
function areDuplicates(contact1, contact2) {
    // Check if either email matches (non-empty)
    if (contact1.email && contact2.email && 
        contact1.email.toLowerCase() === contact2.email.toLowerCase()) {
        return true;
    }
    
    // Check if either phone matches (non-empty)
    if (contact1.phone && contact2.phone) {
        // Normalize phone numbers by removing non-digit characters
        const phone1 = contact1.phone.replace(/\D/g, '');
        const phone2 = contact2.phone.replace(/\D/g, '');
        
        // If both are non-empty after normalization and they match
        if (phone1 && phone2 && phone1 === phone2) {
            return true;
        }
    }
    
    return false;
}

// Find duplicates in a list of contacts
function findDuplicates(contacts) {
    const duplicateGroups = [];
    const processed = new Set();
    
    for (let i = 0; i < contacts.length; i++) {
        // Skip if already processed as part of a duplicate group
        if (processed.has(i)) continue;
        
        const current = contacts[i];
        const group = [current];
        
        for (let j = i + 1; j < contacts.length; j++) {
            if (processed.has(j)) continue;
            
            const other = contacts[j];
            
            if (areDuplicates(current, other)) {
                group.push(other);
                processed.add(j);
            }
        }
        
        // If found duplicates, add to groups
        if (group.length > 1) {
            duplicateGroups.push(group);
            processed.add(i);
        }
    }
    
    return duplicateGroups;
}

// Merge duplicates into a single contact
function mergeContacts(contacts) {
    if (!contacts || contacts.length < 2) return contacts[0] || null;
    
    // Use the first contact as the base
    const merged = { ...contacts[0] };
    
    // Track merged values for logging
    const mergedValues = {};
    
    // Merge values from other contacts
    for (let i = 1; i < contacts.length; i++) {
        const other = contacts[i];
        
        // For each field, prefer non-empty values
        for (const field in other) {
            // Skip id and internal fields
            if (field === 'id' || field === 'merged' || field === 'file_id') continue;
            
            // If the base has an empty value and the other has a value, use the other's value
            if ((!merged[field] || merged[field] === '') && other[field] && other[field] !== '') {
                merged[field] = other[field];
                
                // Track this merge for logging
                if (!mergedValues[field]) {
                    mergedValues[field] = [];
                }
                mergedValues[field].push(other[field]);
            }
            // If both have different values, append to notes
            else if (merged[field] && other[field] && merged[field] !== other[field]) {
                if (!mergedValues[field]) {
                    mergedValues[field] = [];
                }
                mergedValues[field].push(other[field]);
            }
        }
    }
    
    // Mark as merged
    merged.merged = true;
    
    // Add merged values to notes
    if (Object.keys(mergedValues).length > 0) {
        if (!merged.notes) {
            merged.notes = '';
        }
        
        for (const field in mergedValues) {
            if (mergedValues[field].length > 0) {
                merged.notes += `\nMerged ${field}: ${mergedValues[field].join(', ')}`;
            }
        }
    }
    
    return merged;
}

// Create a key for duplicate detection (email_phone)
function createDuplicateKey(contact) {
    const email = contact.email ? contact.email.toLowerCase().trim() : '';
    const phone = contact.phone ? contact.phone.replace(/\D/g, '') : '';
    return `${email}_${phone}`;
}

// Group contacts by duplicate keys
function groupDuplicates(contacts) {
    const groups = {};
    
    contacts.forEach(contact => {
        const key = createDuplicateKey(contact);
        
        // Skip empty keys
        if (key === '_') return;
        
        if (!groups[key]) {
            groups[key] = [];
        }
        
        groups[key].push(contact);
    });
    
    // Filter to only groups with more than one contact
    return Object.values(groups).filter(group => group.length > 1);
}
