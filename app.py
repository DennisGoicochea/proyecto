from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os
import mysql.connector
from mysql.connector import Error
import requests
from datetime import datetime

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}

def get_db_connection():
    """Create database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html')

@app.route('/api/holidays', methods=['GET'])
def get_holidays():
    """Fetch holidays from external API"""
    try:
        response = requests.get('https://date.nager.at/api/v3/publicholidays/2025/US')
        response.raise_for_status()
        holidays = response.json()
        return jsonify(holidays)
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/calculate', methods=['POST'])
def calculate_days():
    """Calculate days until holiday and save to database"""
    try:
        data = request.get_json()
        holiday_name = data.get('holiday_name')
        holiday_date_str = data.get('holiday_date')
        
        # Parse holiday date
        holiday_date = datetime.strptime(holiday_date_str, '%Y-%m-%d').date()
        today = datetime.now().date()
        
        # Calculate days until holiday
        days_until = (holiday_date - today).days
        
        # Save to database
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            query = """
                INSERT INTO holiday_searches (holiday_name, holiday_date, days_until)
                VALUES (%s, %s, %s)
            """
            cursor.execute(query, (holiday_name, holiday_date, days_until))
            connection.commit()
            cursor.close()
            connection.close()
        
        return jsonify({
            'success': True,
            'days_until': days_until,
            'holiday_name': holiday_name,
            'holiday_date': holiday_date_str
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Get search history from database"""
    try:
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            query = """
                SELECT id, holiday_name, holiday_date, days_until, 
                       DATE_FORMAT(searched_at, '%Y-%m-%d %H:%i:%s') as searched_at
                FROM holiday_searches
                ORDER BY searched_at DESC
                LIMIT 50
            """
            cursor.execute(query)
            history = cursor.fetchall()
            cursor.close()
            connection.close()
            return jsonify(history)
        else:
            return jsonify({'error': 'Database connection failed'}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)