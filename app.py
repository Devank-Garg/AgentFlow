from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import jwt
import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DATA_FILE = 'users.txt'
SECRET_KEY = 'super_secret_key_for_demo_only' # In production, use environment variable

@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        full_name = data.get('fullName')
        email = data.get('email')
        password = data.get('password')

        if not all([full_name, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Generate JWT
        token = jwt.encode({
            'email': email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=365) # Long expiry for demo
        }, SECRET_KEY, algorithm='HS256')

        # Save to file (insecure plain text as requested)
        # Format: Name,Email,Password,Token
        with open(DATA_FILE, 'a') as f:
            f.write(f"{full_name},{email},{password},{token}\n")

        return jsonify({'message': 'User created successfully', 'token': token}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not all([email, password]):
            return jsonify({'error': 'Missing credentials'}), 400

        # Verify against file
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                for line in f:
                    parts = line.strip().split(',')
                    if len(parts) >= 4:
                        stored_name, stored_email, stored_pass, stored_token = parts[0], parts[1], parts[2], parts[3]
                        if stored_email == email and stored_pass == password:
                            return jsonify({'message': 'Login successful', 'token': stored_token, 'name': stored_name}), 200
        
        return jsonify({'error': 'Invalid credentials'}), 401

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create file if it doesn't exist
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            pass
    
    app.run(debug=True, port=5000)
