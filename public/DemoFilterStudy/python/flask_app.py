import flask, urllib.request, tempfile, json
import numpy as np
from numpy.polynomial import Polynomial
import CP
# import skrf as rf

def WriteString2TempFile(text):
    fp = tempfile.SpooledTemporaryFile(max_size=10000000, mode='r')
    fp.write(text)
    fp.seek(0)
    return fp

app = flask.Flask(__name__)
app.debug = True

@app.route('/', methods=['GET'])
def get_tasks():
    return flask.jsonify({'freq': 100})
    # fileUrl = 'http://gongfan99.github.io/try.s2p'
    # if fileUrl.split('.')[-1].lower() != 's2p':
        # return 'It is not a s2p file'
    # try:
        # resource = urllib.request.urlopen(fileUrl)
    # except:
        # return 'Cannot retrieve file'
    # content =  resource.read().decode('utf-8')
    # sFile = WriteString2TempFile(content)
    # ntwk = rf.Network()
    # try:
        # ntwk.read_touchstone(sFile)
    # except:
        # return 's2p file format is not correct'
    # sFile.close()
    # originalFreq = ntwk.frequency.f;
    # originalS21 = ntwk.s[::, 1, 0];
    # originalS11 = ntwk.s[::, 0, 0];
    # return flask.jsonify({'freq': originalFreq[:].tolist()})

@app.route('/<method>', methods=['POST'])
def get_task(method):
    if method == "try":
        sFile = WriteString2TempFile("hello sam")
        fileContent = sFile.read()
        sFile.close()
        print(flask.request.is_json)
        print(method, fileContent)
        bodyJson = flask.request.get_json()
        bodyJson['pythonVal'] = 'back from python'
        print(json.dumps(bodyJson, separators = (',', ':')))
        return json.dumps(bodyJson, separators = (',', ':'))
#        ntwk = rf.Network(sFile);
#        originalFreq = ntwk.frequency.f;
#        originalS21 = ntwk.s[::, 1, 0];
#        originalS11 = ntwk.s[::, 0, 0];
    elif method == "SynthesizeFromTranZeros":
        reqJson = flask.request.get_json()
        # print(json.dumps(reqJson, separators = (',', ':')))
        N = reqJson['N']
        returnLoss= reqJson['returnLoss']
        rootP = np.array([x[0] + 1j * x[1] for x in reqJson['rootP']])
        epsilon, coefP, coefF, coefE = CP.ChebyshevP2EF(rootP, N, returnLoss)
        epsilonE = epsilon
        polyF = Polynomial(coefF)
        polyE = Polynomial(coefE)
        rootF = polyF.roots()
        rootE = polyE.roots()
        targetMatrix = CP.FPE2M(epsilon, epsilonE, rootF, rootP, rootE, method=1)
        resJson = {'epsilon': [epsilon.real, epsilon.imag], 'coefP': [[x.real, x.imag] for x in coefP], 'coefF': [[x.real, x.imag] for x in coefF], 'coefE': [[x.real, x.imag] for x in coefE], 'targetMatrix': targetMatrix.tolist()}
        return json.dumps(resJson, separators = (',', ':'))
    else:
        flask.abort(404)


@app.route('/shutdown', methods=['POST'])
def shutdown():
    def shutdown_server():
        func = flask.request.environ.get('werkzeug.server.shutdown')
        if func is None:
            raise RuntimeError('Not running with the Werkzeug Server')
        func()
    shutdown_server()
    return 'Server shutting down...'

if __name__ == '__main__':
    app.run(port=4000, threaded=True)