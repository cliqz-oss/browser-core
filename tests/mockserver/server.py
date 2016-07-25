import json

from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route('/')
def home():
    if request.method == 'GET':
        return 'Cliqz-Results Mock Server\n'
    else:
        #logging system call
        return jsonify(success=True)


@app.route('/api/v1/results')
def cliqz_results():
    q = request.values.get('q', '')

    if q.startswith('face'):
        res = {
            "result": [
                {
                    "snippet": {
                        "q": "face",
                        "snippet": "Willkommen bei Facebook",
                        "title": "Willkommen bei Facebook",
                        "url": "https://www.facebook.com/"
                    },
                    "url": "https://www.facebook.com/",
                    "source": "cache"
                }
            ]
        }
    elif q.startswith('google'):
        res = []
    else:
        res = []

    return jsonify(res)


@app.route('/complete/search')
def suggestions():
    q = request.values.get('q', '')
    return json.dumps([q, ['one', 'two', 'three']])


@app.route('/anleitung')
def tutorial():
    return 'Cliqz-Results Mock Server\n'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)
