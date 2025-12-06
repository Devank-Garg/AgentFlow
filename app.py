from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DATA_FILE = 'users.txt'

@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        full_name = data.get('fullName')
        email = data.get('email')
        password = data.get('password')

        if not all([full_name, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Save to file (insecure plain text as requested)
        with open(DATA_FILE, 'a') as f:
            f.write(f"{full_name},{email},{password}\n")

        return jsonify({'message': 'User created successfully'}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create file if it doesn't exist
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            pass
    
    app.run(debug=True, port=5000)
