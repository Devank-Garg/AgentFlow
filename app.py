from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import jwt
import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DATA_FILE = 'users.txt'
SECRET_KEY = 'super_secret_key_for_demo_only' # In production, use environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
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
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=365) # 
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

@app.route('/generate_agent', methods=['POST'])
def generate_agent():
    try:
        data = request.get_json()
        prompt = data.get('prompt')
        
        if not prompt:
            return jsonify({'error': 'No prompt provided'}), 400

        # API Keys from Environment
        google_key = os.environ.get('GEMINI_API_KEY')
        openai_key = os.environ.get('OPENAI_API_KEY')
        
        response_text = ""

        # 1. Google Gemini
        if google_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=google_key)
                model = genai.GenerativeModel('gemini-2.5-flash')
                
                system_instruction = """
                You are an expert AI Agent Architect. 
                Generate a JSON configuration for an AI agent based on the user's description.
                Structure:
                {
                    "meta": { "name": "Agent Name", "version": "1.0.0" },
                    "neural_config": { "system_prompt": "Detailed system prompt...", "model_id": "gpt-4-turbo", "parameters": { "temperature": 0.7, "max_tokens": 2048 } },
                    "skills": [ { "id": "web_search", "enabled": true }, { "id": "file_access", "enabled": false } ]
                }
                Return ONLY the JSON. No markdown formatting.
                """
                
                chat = model.start_chat()
                response = chat.send_message(f"{system_instruction}\n\nUser Description: {prompt}")
                response_text = response.text
                print(response_text)
            except Exception as e:
                print(f"Gemini Error: {e}")
                
        # 2. OpenAI (Fallback)
        if not response_text and openai_key:
            try:
                import openai
                client = openai.OpenAI(api_key=openai_key)
                completion = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are an expert AI Agent Architect. Return ONLY a valid JSON configuration for the described agent. keys: meta(name, version), neural_config(system_prompt, model_id, parameters), skills(list of {id, enabled})."},
                        {"role": "user", "content": prompt}
                    ]
                )
                response_text = completion.choices[0].message.content
            except Exception as e:
                print(f"OpenAI Error: {e}")

        # 3. Smart Mock (Default)
        if not response_text:
            print("Using Smart Mock Generation")
            # Simple keyword analysis
            name = "My Agent"
            sys_prompt = "You are a helpful AI assistant."
            temp = 0.7
            skills = [{"id": "web_search", "enabled": False}, {"id": "file_access", "enabled": False}]
            
            p_lower = prompt.lower()
            
            if "coder" in p_lower or "developer" in p_lower:
                name = "CodeWizard"
                sys_prompt = "You are an expert software engineer. Write clean, efficient code."
                temp = 0.2
            elif "chef" in p_lower or "cook" in p_lower:
                name = "Gordon Ramsey Bot"
                sys_prompt = "You are a world-class chef. You are strict but fair. Give detailed recipes."
                temp = 0.8
            elif "pirate" in p_lower:
                name = "Captain Hook"
                sys_prompt = "You are a pirate. Speak in nautical terms and always seek treasure."
                temp = 0.9
            elif "search" in p_lower or "research" in p_lower:
                skills[0]["enabled"] = True
                name = "Researcher"

            mock_response = {
                "meta": { "name": name, "version": "1.0.0" },
                "neural_config": {
                    "system_prompt": sys_prompt,
                    "model_id": "gpt-4-turbo",
                    "parameters": { "temperature": temp, "max_tokens": 2048 }
                },
                "skills": skills
            }
            return jsonify(mock_response), 200

        # Parse LLM Response
        import json
        import re
        try:
            # Clean md blocks
            cleaned = re.sub(r'```json\s*|\s*```', '', response_text).strip()
            json_obj = json.loads(cleaned)
            return jsonify(json_obj), 200
        except:
            return jsonify({'error': 'Failed to parse LLM response'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save_config', methods=['POST'])
def save_config():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        with open('saved_agent_config.json', 'w') as f:
            import json
            json.dump(data, f, indent=4)
            
        return jsonify({'message': 'Configuration saved successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create file if it doesn't exist
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w') as f:
            pass
    
    app.run(debug=True, port=5000)
