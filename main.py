from flask import Flask, send_from_directory
import subprocess
import os

app = Flask(__name__)

FRONTEND="dialogic"

# Serve the React app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path == '':
        path = 'index.html'
    if os.path.exists(f'{FRONTEND}/build/' + path):
        return send_from_directory(f'{FRONTEND}/build', path)
    else:
        return send_from_directory(f'{FRONTEND}/build', 'index.html')

# Start the React development server
def start_react_dev_server():
    subprocess.Popen(['npm.cmd', 'start'], cwd=f'{FRONTEND}', stdout=subprocess.PIPE, stderr=subprocess.PIPE)

if __name__ == '__main__':
    start_react_dev_server()
    app.run(debug=True)
