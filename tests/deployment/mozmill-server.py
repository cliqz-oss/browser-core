#!C:\Python27\python.exe
import sys
import json
import flask
import mozmill

from subprocess import Popen, PIPE


app = flask.Flask('MozmillServer')


@app.route('/')
def index():
    return 'Mozmill-Server\n'


@app.route('/exec', methods=['GET', 'POST'])
def exec_mozmill():
    print 'data', flask.request.data
    data = json.loads(flask.request.data)
    args = data['cmd']

    try:
        p_mozmill = Popen(args, stdout=PIPE, stderr=PIPE)
        stdout, stderr = p_mozmill.communicate()

        return flask.jsonify({'stdout': stdout, 'stderr': stderr})
    except Exception, e:
        return flask.jsonify({'err': e})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=True)