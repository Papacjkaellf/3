import os
import logging
import uuid
import pandas as pd
import hashlib
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, flash, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
import json
import re
import sqlalchemy as sa

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key")

# Configure SQLite
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///contact_data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# Maximum file size (10MB)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

# Define SQLite models
class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(255))
    name = db.Column(db.String(255))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(255))
    facebook = db.Column(db.String(255))
    website = db.Column(db.String(255))
    city = db.Column(db.String(255))
    address = db.Column(db.String(255))
    company = db.Column(db.String(255))
    position = db.Column(db.String(255))
    review_count = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text)
    merged = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ProcessedFile(db.Model):
    id = db.Column(db.String(255), primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_hash = db.Column(db.String(255), nullable=False)
    creation_date = db.Column(db.DateTime, nullable=False)
    processed_date = db.Column(db.DateTime, default=datetime.utcnow)
    row_count = db.Column(db.Integer, nullable=False)

# Create database tables
def setup_database():
    try:
        db.create_all()
        logging.info("Database setup completed successfully")
    except Exception as e:
        logging.error(f"Error setting up database: {e}")

with app.app_context():
    setup_database()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files[]' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files[]')
    
    if not files or files[0].filename == '':
        return jsonify({'error': 'No files selected'}), 400
    
    uploaded_files = []
    errors = []
    
    for file in files:
        # Check file extension
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        
        if file_ext not in ['csv', 'txt', 'xls', 'xlsx']:
            errors.append(f"{filename}: Unsupported file format")
            continue
        
        try:
            # Create file ID
            file_id = str(uuid.uuid4())
            
            # Calculate file hash for duplicate detection
            file_content = file.read()
            file_hash = hashlib.md5(file_content).hexdigest()
            file.seek(0)  # Reset file pointer after reading
            
            # Check if file was already processed
            existing_file = ProcessedFile.query.filter_by(file_hash=file_hash).first()
            
            if existing_file:
                errors.append(f"{filename}: File already processed")
                continue
            
            # Read file content based on extension
            if file_ext in ['csv', 'txt']:
                df = pd.read_csv(file)
            else:  # xls or xlsx
                df = pd.read_excel(file)
            
            # Clean column names (lowercase, remove spaces)
            df.columns = [col.lower().strip().replace(' ', '_') for col in df.columns]
            
            # Map common column variations to standard names
            column_mapping = {
                'category': ['category', 'категория', 'cat', 'type', 'тип'],
                'name': ['name', 'fullname', 'full_name', 'contact_name', 'person', 'заведение', 'название', 'имя'],
                'email': ['email', 'email_address', 'emailaddress', 'mail', 'почта', 'эл_почта', 'электронная_почта'],
                'phone': ['phone', 'phone_number', 'phonenumber', 'telephone', 'mobile', 'cell', 'телефон', 'номер', 'тел'],
                'facebook': ['facebook', 'fb', 'facebook_url', 'fb_url', 'фейсбук'],
                'website': ['website', 'site', 'web', 'url', 'сайт', 'веб-сайт', 'web_site'],
                'city': ['city', 'town', 'город', 'населенный_пункт', 'нас_пункт'],
                'address': ['address', 'location', 'full_address', 'адрес', 'местоположение'],
                'company': ['company', 'organization', 'business_name', 'company_name', 'компания', 'организация', 'фирма'],
                'position': ['position', 'title', 'job_title', 'должность', 'позиция', 'роль']
            }
            
            # Standardize column names
            standard_columns = {}
            for std_col, variations in column_mapping.items():
                for col in df.columns:
                    if col in variations:
                        standard_columns[col] = std_col
            
            # Rename columns
            df.rename(columns=standard_columns, inplace=True)
            
            # Make sure all standard columns exist
            for col in ['category', 'name', 'email', 'phone', 'facebook', 'website', 'city', 'address', 'company', 'position']:
                if col not in df.columns:
                    df[col] = None
            
            # Add notes column if not present
            if 'notes' not in df.columns:
                df['notes'] = None
            
            # Insert data into SQLite
            row_count = 0
            
            for _, row in df.iterrows():
                contact = Contact(
                    file_id=file_id,
                    category=row.get('category', None),
                    name=row.get('name', None),
                    email=row.get('email', None),
                    phone=row.get('phone', None),
                    facebook=row.get('facebook', None),
                    website=row.get('website', None),
                    city=row.get('city', None),
                    address=row.get('address', None),
                    company=row.get('company', None),
                    position=row.get('position', None),
                    notes=row.get('notes', None)
                )
                db.session.add(contact)
                row_count += 1
            
            # Add file to processed_files
            processed_file = ProcessedFile(
                id=file_id,
                filename=filename,
                file_size=len(file_content),
                file_hash=file_hash,
                creation_date=datetime.now(),
                row_count=row_count
            )
            db.session.add(processed_file)
            
            db.session.commit()
            
            # Add to uploaded files list
            uploaded_files.append({
                'id': file_id,
                'filename': filename,
                'rows': row_count,
                'columns': list(df.columns)
            })
            
        except Exception as e:
            logging.error(f"Error processing file {filename}: {str(e)}")
            errors.append(f"{filename}: {str(e)}")
    
    return jsonify({
        'success': len(uploaded_files) > 0,
        'uploaded_files': uploaded_files,
        'errors': errors
    })

@app.route('/get_all_contacts')
def get_all_contacts():
    try:
        # Get all contacts from the database
        contacts = Contact.query.all()
        
        # Prepare columns info (same structure as in get_file_data)
        columns = [
            {'name': 'category', 'display_name': 'Категория', 'visible': True},
            {'name': 'name', 'display_name': 'Имя/Заведение', 'visible': True},
            {'name': 'email', 'display_name': 'Email', 'visible': True},
            {'name': 'phone', 'display_name': 'Телефон', 'visible': True},
            {'name': 'facebook', 'display_name': 'Facebook', 'visible': True},
            {'name': 'website', 'display_name': 'Сайт', 'visible': True},
            {'name': 'city', 'display_name': 'Город', 'visible': True},
            {'name': 'address', 'display_name': 'Адрес', 'visible': True},
            {'name': 'company', 'display_name': 'Компания', 'visible': True},
            {'name': 'position', 'display_name': 'Должность', 'visible': True},
            {'name': 'review_count', 'display_name': 'Отзывы', 'visible': True},
            {'name': 'notes', 'display_name': 'Примечания', 'visible': True},
            {'name': 'created_at', 'display_name': 'Дата создания', 'visible': False}
        ]
        
        # Convert contacts to JSON serializable format
        contacts_json = []
        for contact in contacts:
            contact_dict = {
                'id': contact.id,
                'file_id': contact.file_id,
                'category': contact.category,
                'name': contact.name,
                'email': contact.email,
                'phone': contact.phone,
                'facebook': contact.facebook,
                'website': contact.website,
                'city': contact.city,
                'address': contact.address,
                'company': contact.company,
                'position': contact.position,
                'review_count': contact.review_count,
                'notes': contact.notes,
                'merged': contact.merged,
                'created_at': contact.created_at.isoformat() if contact.created_at else None
            }
            contacts_json.append(contact_dict)
        
        # Sort by review count (descending)
        contacts_json.sort(key=lambda x: (x.get('review_count') or 0), reverse=True)
        
        return jsonify({
            'filename': 'Вся база данных',
            'columns': columns,
            'contacts': contacts_json
        })
    except Exception as e:
        app.logger.error(f"Error fetching all contacts: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_file_data/<file_id>')
def get_file_data(file_id):
    try:
        # Get all contacts for the given file
        contacts = Contact.query.filter_by(file_id=file_id).all()
        
        # Get file info
        file_info = ProcessedFile.query.get(file_id)
        
        if not file_info:
            return jsonify({'error': 'File not found'}), 404
        
        # Convert contacts to dictionaries for JSON serialization
        contact_list = []
        for contact in contacts:
            contact_dict = {
                'id': contact.id,
                'category': contact.category,
                'name': contact.name,
                'email': contact.email,
                'phone': contact.phone,
                'facebook': contact.facebook,
                'website': contact.website,
                'city': contact.city,
                'address': contact.address,
                'company': contact.company,
                'position': contact.position,
                'review_count': contact.review_count,
                'notes': contact.notes,
                'merged': contact.merged
            }
            contact_list.append(contact_dict)
            
        # Сортировка по количеству отзывов (более высокие значения выше)
        contact_list = sorted(contact_list, key=lambda x: x.get('review_count', 0) or 0, reverse=True)
        
        # Generate column list
        columns = []
        if contact_list:
            for key in contact_list[0].keys():
                if key not in ['id', 'file_id']:
                    columns.append({
                        'name': key,
                        'display_name': key.replace('_', ' ').title(),
                        'visible': True
                    })
        
        return jsonify({
            'filename': file_info.filename,
            'columns': columns,
            'contacts': contact_list
        })
    
    except Exception as e:
        logging.error(f"Error fetching file data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/find_duplicates/<file_id>')
def find_duplicates(file_id):
    try:
        # Get all contacts for the file
        contacts = Contact.query.filter_by(file_id=file_id).all()
        
        # Convert to dictionaries for easier processing
        contact_list = []
        for contact in contacts:
            contact_dict = {
                'id': contact.id,
                'category': contact.category,
                'name': contact.name,
                'email': contact.email,
                'phone': contact.phone,
                'facebook': contact.facebook,
                'website': contact.website,
                'city': contact.city,
                'address': contact.address,
                'company': contact.company,
                'position': contact.position,
                'review_count': contact.review_count,
                'notes': contact.notes,
                'merged': contact.merged
            }
            contact_list.append(contact_dict)
        
        # Use the JavaScript duplicate detection approach in Python
        # Group contacts by email and phone
        groups_by_email = {}
        groups_by_phone = {}
        
        for contact in contact_list:
            if contact['email']:
                email = contact['email'].lower()
                if email not in groups_by_email:
                    groups_by_email[email] = []
                groups_by_email[email].append(contact)
                
            if contact['phone']:
                # Normalize phone by removing non-digit characters
                phone = ''.join(char for char in contact['phone'] if char.isdigit())
                if phone and phone not in groups_by_phone:
                    groups_by_phone[phone] = []
                groups_by_phone[phone].append(contact)
        
        # Find groups with more than one contact
        duplicate_groups = []
        processed_ids = set()
        
        # Process email groups
        for email, group in groups_by_email.items():
            if len(group) > 1:
                # Ensure we don't duplicate contacts that might be in both email and phone groups
                group_ids = [c['id'] for c in group]
                if any(id not in processed_ids for id in group_ids):
                    duplicate_groups.append(group)
                    processed_ids.update(group_ids)
        
        # Process phone groups
        for phone, group in groups_by_phone.items():
            if len(group) > 1:
                # Ensure we don't duplicate contacts that might be in both email and phone groups
                group_ids = [c['id'] for c in group]
                if any(id not in processed_ids for id in group_ids):
                    duplicate_groups.append(group)
                    processed_ids.update(group_ids)
        
        return jsonify({
            'success': True,
            'duplicates': duplicate_groups
        })
    
    except Exception as e:
        logging.error(f"Error finding duplicates: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/merge_duplicates', methods=['POST'])
def merge_duplicates():
    try:
        data = request.json
        if not data or 'duplicates' not in data:
            return jsonify({'error': 'Invalid request data'}), 400
        
        duplicates = data['duplicates']
        
        for group in duplicates:
            if len(group) < 2:
                continue
            
            # Use the first record as the primary
            primary_id = group[0]['id']
            primary_contact = Contact.query.get(primary_id)
            
            if not primary_contact:
                continue
            
            # Mark as merged
            primary_contact.merged = True
            
            # Merge data from other records
            merged_notes = primary_contact.notes or ''
            
            for i in range(1, len(group)):
                dup_id = group[i]['id']
                dup_contact = Contact.query.get(dup_id)
                
                if not dup_contact:
                    continue
                
                # For each field, if we have a value in the duplicate but not in the primary, copy it
                for field in ['category', 'name', 'email', 'phone', 'facebook', 'website', 'city', 'address', 'company', 'position']:
                    primary_value = getattr(primary_contact, field)
                    dup_value = getattr(dup_contact, field)
                    
                    if dup_value and dup_value != primary_value:
                        # If primary doesn't have a value for this field, use the duplicate's value
                        if not primary_value:
                            setattr(primary_contact, field, dup_value)
                        # Otherwise, note the merged value
                        else:
                            merged_notes += f"\nMerged {field}: {dup_value}"
                
                # Для review_count берем максимальное значение
                if dup_contact.review_count > primary_contact.review_count:
                    primary_contact.review_count = dup_contact.review_count
                
                # Also merge any notes
                if dup_contact.notes and dup_contact.notes != primary_contact.notes:
                    merged_notes += f"\nMerged notes: {dup_contact.notes}"
                
                # Delete the duplicate
                db.session.delete(dup_contact)
            
            # Update primary record's notes
            primary_contact.notes = merged_notes
            
            # Commit changes
            db.session.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        logging.error(f"Error merging duplicates: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_processed_files')
def get_processed_files():
    try:
        # Get all processed files
        files = ProcessedFile.query.order_by(ProcessedFile.processed_date.desc()).all()
        
        # Convert to dictionaries for JSON serialization
        file_list = []
        for f in files:
            file_dict = {
                'id': f.id,
                'filename': f.filename,
                'file_size': f.file_size,
                'processed_date': f.processed_date.strftime('%Y-%m-%d %H:%M:%S'),
                'row_count': f.row_count
            }
            file_list.append(file_dict)
        
        return jsonify({'files': file_list})
    
    except Exception as e:
        logging.error(f"Error fetching processed files: {str(e)}")
        return jsonify({'error': str(e)}), 500
        
@app.route('/delete_file/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Delete a file and all its contacts from the database."""
    try:
        # Begin transaction
        with db.session.begin():
            # Delete all contacts associated with the file
            Contact.query.filter_by(file_id=file_id).delete()
            
            # Delete the file record
            file = ProcessedFile.query.get(file_id)
            if not file:
                return jsonify({'error': 'File not found'}), 404
                
            db.session.delete(file)
            
        return jsonify({'success': True, 'message': 'File deleted successfully'})
    except Exception as e:
        logging.error(f"Error deleting file: {str(e)}")
        return jsonify({'error': str(e)}), 500

# MySQL related routes and functions
@app.route('/export_to_mysql', methods=['POST'])
def export_to_mysql():
    """Export contacts to MySQL database with uniqueness check."""
    try:
        data = request.json
        if not data or 'mysql_config' not in data:
            return jsonify({'error': 'Invalid request data'}), 400
        
        mysql_config = data['mysql_config']
        export_all = data.get('export_all', False)
        file_id = data.get('file_id', None)
        check_uniqueness = data.get('check_uniqueness', True)  # По умолчанию проверять уникальность
        
        # Validate MySQL config
        required_fields = ['host', 'port', 'database', 'user', 'password']
        for field in required_fields:
            if field not in mysql_config:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create MySQL SQLAlchemy engine
        connection_uri = f"mysql+pymysql://{mysql_config['user']}:{mysql_config['password']}@{mysql_config['host']}:{mysql_config['port']}/{mysql_config['database']}"
        
        try:
            mysql_engine = sa.create_engine(connection_uri)
            mysql_engine.connect()  # Test connection
        except Exception as e:
            return jsonify({'error': f'Error connecting to MySQL: {str(e)}'}), 500
        
        # Get contacts to export
        if export_all:
            contacts = Contact.query.all()
        else:
            if not file_id:
                return jsonify({'error': 'Missing file_id for single file export'}), 400
            contacts = Contact.query.filter_by(file_id=file_id).all()
        
        if not contacts:
            return jsonify({'error': 'No contacts to export'}), 404
        
        # Create table if it doesn't exist
        table_name = 'contacts'
        metadata = sa.MetaData()
        
        # Define the contacts table for MySQL
        contacts_table = sa.Table(
            table_name, metadata,
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('category', sa.String(255)),
            sa.Column('name', sa.String(255)),
            sa.Column('email', sa.String(255)),
            sa.Column('phone', sa.String(255)),
            sa.Column('facebook', sa.String(255)),
            sa.Column('website', sa.String(255)),
            sa.Column('city', sa.String(255)),
            sa.Column('address', sa.String(255)),
            sa.Column('company', sa.String(255)),
            sa.Column('position', sa.String(255)),
            sa.Column('review_count', sa.Integer, default=0),
            sa.Column('notes', sa.Text),
            sa.Column('created_at', sa.DateTime, default=datetime.utcnow),
        )
        
        # Create the table if it doesn't exist
        metadata.create_all(mysql_engine)
        
        # Get existing records for uniqueness check if enabled
        existing_emails = set()
        existing_phones = set()
        
        if check_uniqueness:
            with mysql_engine.connect() as conn:
                # Get existing emails
                email_result = conn.execute(sa.text("SELECT email FROM contacts WHERE email IS NOT NULL AND email != ''"))
                for row in email_result:
                    if row[0]:
                        existing_emails.add(row[0].lower())
                
                # Get existing phone numbers (normalized)
                phone_result = conn.execute(sa.text("SELECT phone FROM contacts WHERE phone IS NOT NULL AND phone != ''"))
                for row in phone_result:
                    if row[0]:
                        # Normalize phone by removing non-digit characters
                        phone = ''.join(char for char in row[0] if char.isdigit())
                        if phone:
                            existing_phones.add(phone)
        
        # Export contacts, checking for uniqueness if enabled
        exported_count = 0
        skipped_count = 0
        
        with mysql_engine.connect() as conn:
            for contact in contacts:
                # Check uniqueness if enabled
                skip = False
                if check_uniqueness:
                    # Check email uniqueness
                    if contact.email and contact.email.lower() in existing_emails:
                        skip = True
                    
                    # Check phone uniqueness
                    if contact.phone:
                        normalized_phone = ''.join(char for char in contact.phone if char.isdigit())
                        if normalized_phone and normalized_phone in existing_phones:
                            skip = True
                
                if not skip:
                    # Insert the contact
                    insert_stmt = sa.insert(contacts_table).values(
                        category=contact.category,
                        name=contact.name,
                        email=contact.email,
                        phone=contact.phone,
                        facebook=contact.facebook,
                        website=contact.website,
                        city=contact.city,
                        address=contact.address,
                        company=contact.company,
                        position=contact.position,
                        review_count=contact.review_count,
                        notes=contact.notes,
                        created_at=datetime.utcnow()
                    )
                    result = conn.execute(insert_stmt)
                    conn.commit()
                    
                    # Update uniqueness tracking
                    if check_uniqueness:
                        if contact.email:
                            existing_emails.add(contact.email.lower())
                        if contact.phone:
                            normalized_phone = ''.join(char for char in contact.phone if char.isdigit())
                            if normalized_phone:
                                existing_phones.add(normalized_phone)
                    
                    exported_count += 1
                else:
                    skipped_count += 1
        
        # Get MySQL tables information
        mysql_tables = []
        inspector = sa.inspect(mysql_engine)
        table_names = inspector.get_table_names()
        
        for name in table_names:
            mysql_tables.append({
                'name': name,
                'active': True  # Assume all tables are active by default
            })
        
        return jsonify({
            'success': True,
            'exported_count': exported_count,
            'skipped_count': skipped_count,
            'mysql_tables': mysql_tables
        })
    
    except Exception as e:
        logging.error(f"Error exporting to MySQL: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/find_similar_records', methods=['POST'])
def find_similar_records():
    """Find similar records based on email and phone number."""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Invalid request data'}), 400
        
        file_id = data.get('file_id')
        
        if not file_id:
            return jsonify({'error': 'Missing file_id parameter'}), 400
        
        # Get contacts from the file
        contacts = Contact.query.filter_by(file_id=file_id).all()
        
        if not contacts:
            return jsonify({'error': 'No contacts found for the file'}), 404
        
        # Collect emails and phones from the current file
        emails = set()
        phones = set()
        file_contacts = []
        
        for contact in contacts:
            contact_dict = {
                'id': contact.id,
                'category': contact.category,
                'name': contact.name,
                'email': contact.email,
                'phone': contact.phone,
                'facebook': contact.facebook,
                'website': contact.website,
                'city': contact.city,
                'address': contact.address,
                'company': contact.company,
                'position': contact.position,
                'review_count': contact.review_count,
                'notes': contact.notes,
                'file_id': contact.file_id
            }
            file_contacts.append(contact_dict)
            
            if contact.email:
                emails.add(contact.email.lower())
            
            if contact.phone:
                normalized_phone = ''.join(char for char in contact.phone if char.isdigit())
                if normalized_phone:
                    phones.add(normalized_phone)
        
        # Find similar contacts in other files
        similar_contacts = []
        
        # Query by emails
        if emails:
            similar_by_email = Contact.query.filter(
                Contact.email.isnot(None),
                sa.func.lower(Contact.email).in_(emails),
                Contact.file_id != file_id
            ).all()
            
            for contact in similar_by_email:
                similar_contacts.append({
                    'id': contact.id,
                    'category': contact.category,
                    'name': contact.name,
                    'email': contact.email,
                    'phone': contact.phone,
                    'facebook': contact.facebook,
                    'website': contact.website,
                    'city': contact.city,
                    'address': contact.address,
                    'company': contact.company,
                    'position': contact.position,
                    'review_count': contact.review_count,
                    'notes': contact.notes,
                    'file_id': contact.file_id,
                    'match_type': 'email'
                })
        
        # Query by normalized phone numbers
        phone_matches = []
        if phones:
            all_contacts = Contact.query.filter(
                Contact.phone.isnot(None),
                Contact.file_id != file_id
            ).all()
            
            for contact in all_contacts:
                if contact.phone:
                    normalized_phone = ''.join(char for char in contact.phone if char.isdigit())
                    if normalized_phone in phones:
                        phone_matches.append({
                            'id': contact.id,
                            'category': contact.category,
                            'name': contact.name,
                            'email': contact.email,
                            'phone': contact.phone,
                            'facebook': contact.facebook,
                            'website': contact.website,
                            'city': contact.city,
                            'address': contact.address,
                            'company': contact.company,
                            'position': contact.position,
                            'review_count': contact.review_count,
                            'notes': contact.notes,
                            'file_id': contact.file_id,
                            'match_type': 'phone'
                        })
        
        # Combine results, removing potential duplicates
        seen_ids = set()
        combined_results = []
        
        for contact in similar_contacts + phone_matches:
            if contact['id'] not in seen_ids:
                seen_ids.add(contact['id'])
                combined_results.append(contact)
        
        # Get file information for matches
        file_info = {}
        file_ids = set(contact['file_id'] for contact in combined_results)
        
        if file_ids:
            files = ProcessedFile.query.filter(ProcessedFile.id.in_(file_ids)).all()
            for f in files:
                file_info[f.id] = f.filename
        
        return jsonify({
            'success': True,
            'file_contacts': file_contacts,
            'similar_contacts': combined_results,
            'file_info': file_info
        })
    
    except Exception as e:
        logging.error(f"Error finding similar records: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/toggle_mysql_table', methods=['POST'])
def toggle_mysql_table():
    """Toggle the active state of a MySQL table."""
    try:
        data = request.json
        if not data or 'table_name' not in data:
            return jsonify({'error': 'Invalid request data'}), 400
        
        table_name = data['table_name']
        
        # TODO: Implement actual table status storage
        # For now, we'll just return a success response
        return jsonify({
            'success': True,
            'table_name': table_name,
            'active': False  # Toggle to inactive for demonstration
        })
    
    except Exception as e:
        logging.error(f"Error toggling MySQL table: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Database management routes
@app.route('/get_database_info')
def get_database_info():
    """Get information about available databases."""
    try:
        # Путь к папке с базами данных
        db_folder = 'instance'
        
        # Получение списка файлов баз данных
        databases = []
        if os.path.exists(db_folder):
            for file in os.listdir(db_folder):
                if file.endswith('.db'):
                    db_path = os.path.join(db_folder, file)
                    db_size = os.path.getsize(db_path)
                    db_modified = os.path.getmtime(db_path)
                    db_modified_date = datetime.fromtimestamp(db_modified).strftime('%Y-%m-%d %H:%M:%S')
                    
                    # Определение текущей активной базы данных
                    current_db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
                    is_active = os.path.abspath(current_db_path) == os.path.abspath(db_path)
                    
                    databases.append({
                        'name': file,
                        'path': db_path,
                        'size': db_size,
                        'size_formatted': format_file_size(db_size),
                        'modified': db_modified_date,
                        'is_active': is_active
                    })
        
        # Получение текущего пути базы данных
        current_db = app.config['SQLALCHEMY_DATABASE_URI']
        
        return jsonify({
            'success': True,
            'databases': databases,
            'current_db': current_db,
            'db_folder': os.path.abspath(db_folder)
        })
    
    except Exception as e:
        logging.error(f"Error getting database info: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/create_database', methods=['POST'])
def create_database():
    """Create a new database."""
    try:
        data = request.json
        if not data or 'db_name' not in data:
            return jsonify({'error': 'Missing database name'}), 400
        
        db_name = data['db_name']
        
        # Проверка и добавление расширения .db, если отсутствует
        if not db_name.endswith('.db'):
            db_name += '.db'
        
        # Создание путем к новой базе данных
        db_folder = 'instance'
        if not os.path.exists(db_folder):
            os.makedirs(db_folder)
        
        db_path = os.path.join(db_folder, db_name)
        
        # Проверка, существует ли уже база данных с таким именем
        if os.path.exists(db_path):
            return jsonify({'error': f'Database {db_name} already exists'}), 400
        
        # Создание новой базы данных
        new_db_uri = f'sqlite:///{db_path}'
        
        # Временно изменяем URI базы данных
        old_db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        app.config['SQLALCHEMY_DATABASE_URI'] = new_db_uri
        
        # Создаем таблицы в новой базе данных
        with app.app_context():
            db.create_all()
        
        # Возвращаем старый URI
        app.config['SQLALCHEMY_DATABASE_URI'] = old_db_uri
        
        return jsonify({
            'success': True,
            'message': f'Database {db_name} created successfully',
            'db_path': db_path
        })
    
    except Exception as e:
        logging.error(f"Error creating database: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/switch_database', methods=['POST'])
def switch_database():
    """Switch to another database."""
    try:
        data = request.json
        if not data or 'db_path' not in data:
            return jsonify({'error': 'Missing database path'}), 400
        
        db_path = data['db_path']
        
        # Проверка существования базы данных
        if not os.path.exists(db_path):
            return jsonify({'error': f'Database file not found: {db_path}'}), 404
        
        # Изменение URI базы данных
        new_db_uri = f'sqlite:///{db_path}'
        app.config['SQLALCHEMY_DATABASE_URI'] = new_db_uri
        
        # Перезагрузка соединения с базой данных
        with app.app_context():
            db.create_all()  # Убедимся, что все таблицы существуют
        
        return jsonify({
            'success': True,
            'message': f'Switched to database: {db_path}',
            'db_uri': new_db_uri
        })
    
    except Exception as e:
        logging.error(f"Error switching database: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/delete_database', methods=['POST'])
def delete_database():
    """Delete a database file."""
    try:
        data = request.json
        if not data or 'db_path' not in data:
            return jsonify({'error': 'Missing database path'}), 400
        
        db_path = data['db_path']
        
        # Проверка существования базы данных
        if not os.path.exists(db_path):
            return jsonify({'error': f'Database file not found: {db_path}'}), 404
        
        # Проверка, не удаляем ли мы текущую активную базу данных
        current_db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        if os.path.abspath(current_db_path) == os.path.abspath(db_path):
            return jsonify({'error': 'Cannot delete the currently active database'}), 400
        
        # Удаление файла базы данных
        os.remove(db_path)
        
        return jsonify({
            'success': True,
            'message': f'Database deleted: {db_path}'
        })
    
    except Exception as e:
        logging.error(f"Error deleting database: {str(e)}")
        return jsonify({'error': str(e)}), 500

def format_file_size(size_bytes):
    """Форматирование размера файла в читаемый вид."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1048576:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / 1048576:.1f} MB"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
