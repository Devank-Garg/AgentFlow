import json

def read_config(file_path):
    try:
        with open(file_path, 'r') as file:
            config = json.load(file)
        return config
    except FileNotFoundError:
        return None

file_path = 'saved_agent_config.json'
config = read_config(file_path)
