from datetime import datetime
import json
from app import db

class Contact(db.Model):
    """Model for storing contact information from uploaded files."""
    id = db.Column(db.Integer, primary_key=True)
    file_id = db.Column(db.String(255), nullable=False)
    # Основные стандартные поля
    category = db.Column(db.String(255))  # Категория
    name = db.Column(db.String(255))      # Имя/Заведение
    email = db.Column(db.String(255))     # Email
    phone = db.Column(db.String(255))     # Телефон
    facebook = db.Column(db.String(255))  # Facebook
    website = db.Column(db.String(255))   # Сайт
    city = db.Column(db.String(255))      # Город
    address = db.Column(db.String(255))   # Адрес (полный)
    company = db.Column(db.String(255))   # Компания
    position = db.Column(db.String(255))  # Должность
    review_count = db.Column(db.Integer, default=0)  # Количество отзывов
    notes = db.Column(db.Text)            # Примечания
    # Для хранения всех оригинальных колонок из CSV-файла
    extra_fields = db.Column(db.Text)     # JSON со всеми дополнительными полями из CSV
    merged = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_extra_fields(self, fields_dict):
        """Сохраняет дополнительные поля в формате JSON"""
        if fields_dict:
            self.extra_fields = json.dumps(fields_dict, ensure_ascii=False)
        else:
            self.extra_fields = None
    
    def get_extra_fields(self):
        """Возвращает дополнительные поля из JSON"""
        if self.extra_fields:
            return json.loads(self.extra_fields)
        return {}

class ProcessedFile(db.Model):
    """Model for storing information about processed files."""
    id = db.Column(db.String(255), primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_hash = db.Column(db.String(255), nullable=False)
    creation_date = db.Column(db.DateTime, nullable=False)
    processed_date = db.Column(db.DateTime, default=datetime.utcnow)
    row_count = db.Column(db.Integer, nullable=False)
    original_columns = db.Column(db.Text)  # JSON строка с оригинальными названиями колонок
    
    def set_original_columns(self, columns):
        """Сохраняет список оригинальных колонок в формате JSON"""
        if columns:
            self.original_columns = json.dumps(columns, ensure_ascii=False)
        else:
            self.original_columns = json.dumps([])
    
    def get_original_columns(self):
        """Возвращает список оригинальных колонок из JSON"""
        if self.original_columns:
            return json.loads(self.original_columns)
        return []
