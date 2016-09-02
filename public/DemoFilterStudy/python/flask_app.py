import flask, tempfile, json
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
        epsilon, coefP, coefF, rootE = CP.ChebyshevP2EF(rootP, N, returnLoss)
        coefE = Polynomial.fromroots(rootE).coef
        epsilonE = epsilon
        topology = np.array(reqJson['topology'])
        matrixMethod = 5
        targetMatrix, msg = CP.FPE2MComprehensive(epsilon, epsilonE, coefF, coefP, rootE, topology, refRootP = rootP, method = matrixMethod)
        resJson = {'epsilon': [epsilon.real, epsilon.imag], 'coefP': [[x.real, x.imag] for x in coefP], 'coefF': [[x.real, x.imag] for x in coefF], 'coefE': [[x.real, x.imag] for x in coefE], 'targetMatrix': targetMatrix.tolist(), 'message': msg}
        return json.dumps(resJson, separators = (',', ':'))
    elif method == "ExtractMatrix":
        reqJson = flask.request.get_json()
        np.save("tempData3", np.array([reqJson]))
        #print(json.dumps(reqJson, separators = (',', ':')))
        freq = np.array(reqJson['freq']) * 1e6
        S21_amp = 10 ** (np.array(reqJson['S21_db']) / 20)
        S21 = S21_amp * (np.cos(np.array(reqJson['S21_angRad'])) + 1j * np.sin(np.array(reqJson['S21_angRad'])))
        S11_amp = 10 ** (np.array(reqJson['S11_db']) / 20)
        S11 = S11_amp * (np.cos(np.array(reqJson['S11_angRad'])) + 1j * np.sin(np.array(reqJson['S11_angRad'])))
        N = reqJson['filterOrder']
        tranZeros = [x[0] + 1j * x[1] for x in reqJson['tranZeros']]
        numZeros = len(tranZeros)
        filterOrder = np.hstack((np.zeros((N, )), 2 * np.ones((numZeros, ))))
        w1 = (reqJson['centerFreq'] - reqJson['bandwidth'] / 2) * 1e9
        w2 = (reqJson['centerFreq'] + reqJson['bandwidth'] / 2) * 1e9
#        print(N, numZeros, filterOrder, w1, w2)
        startFreq = reqJson['captureStartFreqGHz'] * 1e9
        stopFreq = reqJson['captureStopFreqGHz'] * 1e9
        isSymmetric = reqJson['isSymmetric']
        extractMethod = 6
        fc = (w1 + w2) / 4
        epsilon, epsilonE, Qu, coefF, coefP, rootE, port1, port2 = CP.S2FP(freq, S21, S11, filterOrder, w1, w2, fc=fc, method=extractMethod, startFreq=startFreq, stopFreq=stopFreq, isSymmetric=isSymmetric)
        if Qu == np.inf:
            Qu = 1e9
#        print(Qu)
        topology = np.array(reqJson['topology'])
        matrixMethod = 5
        extractedMatrix, msg = CP.FPE2MComprehensive(epsilon, epsilonE, coefF, coefP, rootE, topology, refRootP = tranZeros, method = matrixMethod)
        targetMatrix = np.array(reqJson['targetMatrix'])
        deviateMatrix = targetMatrix - extractedMatrix
        resJson = {'q': Qu, 'extractedMatrix': extractedMatrix.tolist(), 'deviateMatrix': deviateMatrix.tolist(), 'message': msg}
        return json.dumps(resJson, separators = (',', ':'))
    elif method == "SpaceMappingCalculate":
        reqJson = flask.request.get_json()
        np.save("tempData2", np.array([reqJson]))
        B = np.array(reqJson['B'], dtype = float)
#        print(np.around(B, 2))
        h = np.array(reqJson['h'], dtype = float)
        xc = np.array(reqJson['xc'], dtype = float)
        xc_star = np.array(reqJson['xc_star'], dtype = float)
        xf = np.array(reqJson['xf'], dtype = float)
        lowerLimit = np.array(reqJson['lowerLimit'], dtype = float)
        upperLimit = np.array(reqJson['upperLimit'], dtype = float)
        f = xc - xc_star
        B += np.array(np.mat(f).T * np.mat(h)) / h.dot(h)
        h = np.linalg.solve(B, -f)
        xf_old = xf.copy()
        xf += h
        xf = np.where(xf > lowerLimit, xf, lowerLimit)
        xf = np.where(xf < upperLimit, xf, upperLimit)
        h = xf - xf_old
        if f.dot(f) < 4e-10 * len(xc):
            toStop = 1
        else:
            toStop = 0
        resJson = {'B': B.tolist(), 'h': h.tolist(), 'xf': xf.tolist(), 'f': f.tolist(), 'toStop': toStop}
        return json.dumps(resJson, separators = (',', ':'))
    elif method == "CoarseModelUpdate":
        reqJson = flask.request.get_json()
        np.save("tempData", np.array([reqJson]))
#        reqJson = np.load('tempData.npy')[0]
        dimension = np.array(reqJson['dimension'])
        extractedMatrix = np.array(reqJson['extractedMatrix'])
        topology = np.array(reqJson['topology'])
        isSymmetric = reqJson['isSymmetric']
        slopeM, invSlopeM, intepM = CP.CoarseModelUpdate(dimension, extractedMatrix, topology, isSymmetric)
        resJson = {'slopeM': slopeM.tolist(), 'invSlopeM': invSlopeM.tolist(), 'intepM': intepM.tolist()}
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