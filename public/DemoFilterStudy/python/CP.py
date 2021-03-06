import numpy as np
import scipy as sp
import scipy.constants
from numpy.polynomial import Polynomial
from scipy import optimize, interpolate, signal
#import matplotlib.pyplot as plt
#import sympy
#from sympy.tensor import IndexedBase, Idx
import tempfile, itertools

def WriteString2TempFile(text):
    fp = tempfile.SpooledTemporaryFile(max_size=1000000, mode='r')
    fp.write(text)
    fp.seek(0)
    return fp
    
def GetTopology(N):
    T = np.eye(N + 2)
    T[0, 0] = 0
    T[-1, -1] = 0
    
    for i in np.arange(N + 2):
        for j in np.arange(N + 2):
            if ((j - i) == 1) or ((i - j) == 1) or ((i + j) == (N + 1)) or ((i + j) == (N + 2)):
                T[i, j] = 1

    return T

def StepFunction(length, width):
    temp1 = int(length / 2)
    temp2 = int(width / 2)
    result = np.zeros((int(length),))
    result[temp1-temp2:temp1] = - 0.5 / width
    result[temp1:temp1+temp2] = 0.5 / width
    return result

def FindEdge(a):
    oneTenth = int(a.shape[0] / 10)
    normalizedA = np.abs(a) / np.max(np.abs(a))
    y = np.abs(signal.convolve(normalizedA, StepFunction(oneTenth, oneTenth - 2), mode='same'))
    widths = np.arange(10, oneTenth + 10)
    peakInd = np.array(signal.find_peaks_cwt(y, widths, min_length=widths.shape[0]-1))
    if peakInd.shape[0] > 2:
        temp1 = np.argsort(y[peakInd])
        return peakInd[temp1[-2:]]
    else:
        return peakInd

def NormalizeFreq(freq, w1, w2, Qu=np.inf):
    w0 = np.sqrt(w1 * w2);
#    w0 = (w1 + w2) / 2.;
    return (w0/(w2-w1)) * (freq/w0 - w0/freq) - 1j / Qu

def DenormalizeFreq(normalizedFreq, w1, w2):
    w0 = np.sqrt(w1 * w2);
#    w0 = (w1 + w2) / 2.;
    tempFreq = np.real(normalizedFreq)
    return (tempFreq * (w2 - w1) + np.sqrt(tempFreq * (w2 - w1) * tempFreq * (w2 - w1) + 4 * w0 *w0)) / 2.;

def ChebyshevP2EF(rootP, N, returnLoss):
    U = 1.
    V = 0.

    for k in np.arange(0, N):
        tempU = U;
        tempV = V;
        if k < len(rootP):
#            a = Polynomial([-1 / rootP[k].imag, 1])
#            b = np.sqrt(1 - 1 / (rootP[k].imag * rootP[k].imag))
            a = Polynomial([-1j / rootP[k], 1])
            b = np.sqrt(1 + 1 / (rootP[k] * rootP[k]))
        else:
            a = Polynomial([0., 1.])
            b = 1.
        U = a * tempU + b * Polynomial([-1, 0, 1]) * tempV;
        V = a * tempV + b * tempU;

#    rootF = U.roots() * 1j; # w domain to s domain
#    polyF = Polynomial.fromroots(rootF)
#    coefF = polyF.coef
    temp1 = (1j) ** (np.arange(N + 1) % 4)
    coefF = U.coef * temp1[-1::-1]
    coefF /= coefF[-1]
    polyF = Polynomial(coefF)

    if len(rootP) == 0:
        polyP = Polynomial([1])
    else:
        polyP = Polynomial.fromroots(rootP)
    coefP = polyP.coef

    epsilon = polyP(1j) / (polyF(1j) * np.sqrt(10 ** (np.abs(returnLoss) / 10) - 1))
    rootE = FP2E(epsilon, coefF, coefP);
#    polyE = Polynomial.fromroots(rootE);
    return epsilon, coefP, coefF, rootE
    
def signedEpsilon(nF, nP, epsilon):
    temp1 = (nF + nP + 3) % 4
    return np.abs(epsilon) / (1j) ** temp1
        
def CM2S(M, normalizedFreq):
    R1 = 1.;
    RN = 1.;
    N=M.shape[0];

    U=np.eye(N);
    U[0, 0] = 0.;
    U[-1, -1] = 0.;

    R=np.zeros((N, N));
    R[0, 0] = R1;
    R[N-1, N-1] = RN;

    S21=1j * np.zeros(normalizedFreq.shape);
    S11=1j * np.zeros(normalizedFreq.shape);
    for k in np.arange(0, normalizedFreq.shape[0]):
        Z = normalizedFreq[k] * U - 1j * R + M;

        Y = np.linalg.inv(Z);
        S11[k] = 1. + 2j * R1 * Y[0, 0];
        S21[k] = -2j * np.sqrt(R1 * RN) * Y[-1, 0];

#        Y00 = np.linalg.det(Z[1:, 1:]) / np.linalg.det(Z)
#        if N % 2 == 0:
#            Y10 = -np.linalg.det(Z[:-1, 1:]) / np.linalg.det(Z)
#        else:            
#            Y10 = np.linalg.det(Z[:-1, 1:]) / np.linalg.det(Z)
#        S11[k] = 1. + 2j * R1 * Y00;
#        S21[k] = -2j * np.sqrt(R1 * RN) * Y10;
        
#        Y1, info = sparse.linalg.gmres(Z, np.append(np.array([1.]), np.zeros((N - 1,))))
#        S11[k] = 1. + 2j * R1 * Y1[0];
#        S21[k] = -2j * np.sqrt(R1 * RN) * Y1[-1];


    return S21, S11

#def FP2E(epsilon, rootF, rootP, method = 1):
#    if method == 1:
#        polyF = Polynomial.fromroots(rootF)
#        if len(rootP) == 0:
#            polyP = Polynomial([1])
#        else:
#            polyP = Polynomial.fromroots(rootP)
#        temp1 = polyF + polyP / signedEpsilon(len(rootF), len(rootP), epsilon)
#        rootE = temp1.roots()
#        rootE = -np.abs(np.real(rootE)) + 1j * np.imag(rootE)
#    elif method == 2:
#        polyF = Polynomial.fromroots(rootF)
#        if rootF.shape[0] % 2 == 0:
#            polyFminus = Polynomial.fromroots(-np.conj(rootF)) # polyF(-s)
#        else:
#            polyFminus = -Polynomial.fromroots(-np.conj(rootF))
#        if len(rootP) == 0:
#            polyP = Polynomial([1])
#            polyPminus = Polynomial([1])
#        else:
#            polyP = Polynomial.fromroots(rootP)
#            if len(rootP) % 2 == 0:
#                polyPminus = Polynomial.fromroots(-np.conj(rootP))
#            else:
#                polyPminus = -Polynomial.fromroots(-np.conj(rootP))
#        E2 = polyF * polyFminus + polyP * polyPminus / (np.abs(epsilon) * np.abs(epsilon))
#        rootE2 = E2.roots()
#        rootE = rootE2[np.real(rootE2) < -1.e-9]
#    return rootE

def FP2E(epsilon, coefF, coefP, method = 1):
    N = len(coefF) - 1
    if method == 1:
        polyF = Polynomial(coefF)
        polyP = Polynomial(coefP)
        temp1 = polyF + polyP / signedEpsilon(len(coefF) - 1, len(coefP) - 1, epsilon)
        rootE = temp1.roots()
        rootE = -np.abs(np.real(rootE)) + 1j * np.imag(rootE)
    elif method == 2:
        polyF = Polynomial(coefF)
        temp1 = 1 - (np.arange(N + 1) % 2) * 2
        coefFminus = -np.conj(coefF.copy()) * temp1
        polyFminus = Polynomial(coefFminus)
        
        polyP = Polynomial(coefP)
        temp1 = 1 - (np.arange(len(coefP)) % 2) * 2
        coefPminus = -np.conj(coefP.copy()) * temp1
        polyPminus = Polynomial(coefPminus)

        E2 = polyF * polyFminus + polyP * polyPminus / (np.abs(epsilon) * np.abs(epsilon))
        rootE2 = E2.roots()
        rootE = rootE2[np.real(rootE2) < -1.e-9]
    return rootE
    
def FPE2S(epsilon, epsilonE, coefF, coefP, rootE, normalizedFreq):
    polyF = epsilon * Polynomial(coefF)
    polyP = Polynomial(coefP)

    polyE = epsilonE * Polynomial.fromroots(rootE)
    return polyF(1j * normalizedFreq) / polyE(1j * normalizedFreq), polyP(1j * normalizedFreq) / polyE(1j * normalizedFreq) # S11, S21

def BuildMatrixFromElementM(elementM, folding):
    M = np.zeros(folding.shape);
    indexElementM = 0;
    for i in np.arange(0, folding.shape[0]):
        for j in np.arange(i, folding.shape[1]):
            if (folding[i, j] > 0):
                M[i, j] = elementM[indexElementM];
                M[j, i] = elementM[indexElementM];
                indexElementM = indexElementM + 1;
    return M;

def ExtractElementMFromMatrix(M):
    folding = np.where(np.abs(M)<1.0e-6, 0, 1) + np.eye(M.shape[0]);
    folding[0,0] = 0;
    folding[-1,-1] = 0;

    elementM = np.array([]);
    for i in np.arange(0, folding.shape[0]):
        for j in np.arange(i, folding.shape[1]):
            if (folding[i, j] > 0):
                elementM = np.append(elementM, M[i, j]);
    return elementM, folding;

def Distance(a, b, option=0):
    if option == 0:
        tempA = (abs(a) > np.roll(abs(a), 1)) & (abs(a) > np.roll(abs(a), -1));
        tempA[0] = False;
        tempA[-1] = False;
        indexA = np.where(tempA)[0];
        magA = abs(a[tempA]);
        
        tempB = (abs(b) > np.roll(abs(b), 1)) & (abs(b) > np.roll(abs(b), -1));
        tempB[0] = False;
        tempB[-1] = False;
        indexB = np.where(tempB)[0];
        magB = abs(b[tempB]);
    
    #        plt.clf()
    #        plt.subplot(1, 2, 1)
    #        plt.plot(20*np.log10(np.abs(a)), 'o');
    #        plt.plot( 20*np.log10(np.abs(b)), '*');
    #        plt.title('S11(dB)')
    #        plt.subplot(1, 2, 2)
    #        plt.plot(20*np.log10(np.abs(a)), 'o');
    #        plt.title('S21(dB)')
    #        plt.draw()
    
        if indexA.shape[0] == indexB.shape[0]:
            result = np.sum(np.square(indexA - indexB)) + np.sum(np.square(magA - magB));
        elif indexA.shape[0] > indexB.shape[0]:
            result = np.sum(np.square(indexA[:indexB.shape[0]] - indexB)) + np.sum(np.square(magA[:indexB.shape[0]] - magB)) + 20 * np.abs(indexA.shape[0] - indexB.shape[0]);
        elif indexA.shape[0] < indexB.shape[0]:
            result = np.sum(np.square(indexA - indexB[:indexA.shape[0]])) + np.sum(np.square(magA - magB[:indexA.shape[0]])) + 20 * np.abs(indexA.shape[0] - indexB.shape[0]);       
        return result
    elif option == 1:
        logA = np.log10(np.abs(a));
        logB = np.log10(np.abs(b));
        temp1 = np.abs(logA * np.exp(1j*np.angle(a)) - logB * np.exp(1j*np.angle(b)));
        temp1[(logA < -40.) | (logB < -40.)] = 0.;
        return np.sum(np.square(temp1));
    elif option == 2:
        return np.sum(np.square(np.abs(np.log10(np.abs(a)) - np.log10(np.abs(b)))));
    elif option == 3:
        logA = np.log10(np.abs(a));
        logB = np.log10(np.abs(b));
        temp1 = np.abs(logA - logB);
    #    temp1[(logA < -4.) | (logB < -4.)] = 0.;
        return np.sum(np.square(temp1));
    elif option == 4:
        return np.sum(np.square(np.abs(a - b)));
    elif option == 5:
        return np.sum(np.square(np.abs(a) - np.abs(b)));

def S2CM(freq, S21, S11, initM, w1, w2, wga, wgb=0.1):
#    itemLocation = None;
#    for i in np.arange(0, folding.shape[0]):
#        for j in np.arange(i, folding.shape[1]):
#            if (folding[i, j] > 0):
#                if itemLocation is None:
#                    itemLocation = np.array([i, j]);
#                else:
#                    itemLocation = np.vstack([itemLocation, np.array([i, j])]);
    initialValue, folding = ExtractElementMFromMatrix(initM);

    normalizedFreq = NormalizeFreq(freq, w1, w2);
    
    curveS21 = interpolate.interp1d(normalizedFreq, S21);
    curveS11 = interpolate.interp1d(normalizedFreq, S11);
    sampledNomalizedFreq = np.linspace(-1.1, 1.1, num=9*folding.shape[0]+10);
    sampledFreq = DenormalizeFreq(sampledNomalizedFreq, w1, w2);
    sampledS21 = curveS21(sampledNomalizedFreq);
    sampledS11 = curveS11(sampledNomalizedFreq);

    cutoffFrequency = 299792458. / (2. * wga);


    def CostFunc(elementM, considerPhase=False):
#        M = np.zeros(folding.shape);
#        indexElementM = 0;
#        for i in itemLocation:
#            M[i[0], i[1]] = elementM[indexElementM];
#            M[i[1], i[0]] = elementM[indexElementM];
#            indexElementM = indexElementM + 1;

        M = BuildMatrixFromElementM(elementM, folding);

        S21fromM, S11fromM = CM2S(M, sampledNomalizedFreq);
        
        if considerPhase:
            theta1 = -2. * np.pi * np.sqrt(sampledFreq * sampledFreq - cutoffFrequency * cutoffFrequency) * elementM[-2] / 299792458.;
            theta2 = -2. * np.pi * np.sqrt(sampledFreq * sampledFreq - cutoffFrequency * cutoffFrequency) * elementM[-1] / 299792458.;
            S11fromM = S11fromM * np.exp(2j * theta1);
            S21fromM = S21fromM * np.exp(1j * (theta1 + theta2));
    
    #        return 0.000*np.sum(np.square(np.abs(S21fromM - sampledS21))) + 1.*np.sum(np.square(np.abs(S11fromM - sampledS11)));
    #        return np.sum(np.square(np.angle(S21fromM) - np.angle(sampledS21))) + np.sum(np.square(np.abs(S11fromM - sampledS11)));
            return Distance2(sampledS21, S21fromM) + Distance2(sampledS11, S11fromM);
    #        return 0.*np.sum(np.square(np.abs(S21fromM - sampledS21))) + np.sum(np.square(np.abs(S11fromM) - np.abs(sampledS11)));
        else:
            return Distance4(sampledS21, S21fromM) + Distance4(sampledS11, S11fromM);

#    print(CostFunc(np.array([1.0600, 0.0151, -0.0022, 0.8739, -0.3259, 0.0313, 0.0483, 0.8360, 0.0342, -0.0668, 0.8723, 0.0171, 1.0595])));
#    print(CostFunc(np.array([1.0600, 0.0151, -0.0022, -0.8739, -0.3259, 0.0313, 0.0483, -0.8360, -0.0342, -0.0668, 0.8723, 0.0171, 1.0595])));
#    print(CostFunc(np.array([1.0651, 0.3858,  0.4835, 1.1200, 0.4835, 1.0651, -1.3470, 0.3858])));
#    initialValue = np.ones((itemLocation.shape[0],)) * 1.0;
#    initialValue = np.array([1., 1., 1., 1., 1., 1.]);
#    initialValue = np.array([1.0651, 0.3858,  0.4835, 1.1200, 0.4835, 1.0651, -1.3470, 0.3858]) * 1.1;
    #initialValue = np.array([1.22521, 1.09828, 0.73857, 0.73857, 1.09828, 1.22521]);
    #initialValue = np.array([1.42521, 0.89828, 0.93857, 0.53857, 0.90828, 1.02521]);
#    initialValue = np.array([1., 0.00810, 0.81907, 0.00810, 0.55673, -0.21356, 0.00810, 0.72067, 0.00810, 0.79802, 0.00810, 1.]);
#    initialValue = np.array([np.sqrt(1.1355), -0.0708, 0.8737, -0.0807, 0.5847, -0.0885, 0.5413, -0.0880, 0.5320, -0.0859, 0.5416, -0.0885, 0.5855, -0.0812, 0.8773, -0.0778, np.sqrt(1.1445)]);
#    initialValue = np.array([1.17846, 0., 1.00750, 0., 0.65537, 0., 0.59303, 0., 0.57983, 0., 0.59303, 0., 0.65537, 0., 1.00750, 0., 1.17846]);
    #initialValue = np.array([1.0600, 0.0151, -0.0022, 0.8739, -0.3259, 0.0313, 0.0483, 0.8360, 0.0342, -0.0668, 0.8723, 0.0171, 1.0595]);
#    initialValue = np.array([1.06384, 0.00000, 0.90019, 0.00000, 0.63257, 0.00000, 0.59993, 0.00000, 0.63257, 0.00000, 0.90019, 0.00000, 1.06384]);
#    initialValue = np.array([1.14398, -0.1268, 0.9862, -0.0556, 0.6513, -0.0332, 0.6172, -0.0795, 0.6138, -0.1055, 0.9902, -0.1440, 1.14634]);
#    initialValue = np.array([1.13702, -0.01816, 0.84015, -0.46021, 0.57462, 0.51511, -0.12135, 0.5757, -0.06194, 0.53132, -0.16953, 0.28364, 0.53132, -0.06194, 0.5757, -0.12135, 0.51511, -0.46021, 0.57462, 0.84015, -0.01816, 1.13702]);
    initialValue = np.append(initialValue, [0.*0.0254, 0.*0.0254]);
    print(initialValue, CostFunc(initialValue));
#    if False:
    if True:
        minFun = 10000.;
        for i in np.arange(0, 1):
            res = optimize.minimize(CostFunc, initialValue, args=(False,), bounds=((-1.8, 1.8),) * (initialValue.shape[0] - 2) + ((0., 299792458. / (2. * w1)),) * 2, tol=1e-9);
            print(res.message, res.fun, res.success, res.nit);
#            res = optimize.minimize(CostFunc, res.x, args=(True,), bounds=((-1.8, 1.8),) * itemLocation.shape[0] + ((0., 299792458. / (2. * w1)),) * 2, tol=1e-9);
#            print(res.message, res.fun, res.success, res.nit);
            if res.fun < minFun:
                minFun = res.fun;
                minRes = res;
#            if res.fun > 1.e-3:
#                initialValue = -initialValue * 0.9;
#                initialValue = np.random.rand(itemLocation.shape[0],) * 2. - 1.;
#            else:
#                break
        resultElementM = minRes.x;
        print(resultElementM[-2]/0.0254, resultElementM[-1]/0.0254);
        print(minRes.message, minRes.fun, minRes.success, minRes.nit);
    else:
        print(CostFunc(initialValue));
        resultElementM = initialValue;

#    resultM = np.zeros(folding.shape);
#    indexElementM = 0;
#    for i in itemLocation:
#        resultM[i[0], i[1]] = resultElementM[indexElementM];
#        resultM[i[1], i[0]] = resultElementM[indexElementM];
#        indexElementM = indexElementM + 1;
    resultM = BuildMatrixFromElementM(resultElementM, folding);

    return resultM, normalizedFreq;

def S2FP(inFreq, inS21, inS11, filterOrder, w1, w2, fc=np.nan, method=0, startFreq=0, stopFreq=0, isSymmetric=False):
    def RectifyInputData(inFreq, inS21, inS11):
        widths = np.arange(5, 15)
        sig = -20. * np.log10(np.abs(inS11))
        sig[sig<3.] = 0.
        peakIndS11Inv = signal.find_peaks_cwt(sig, widths, min_length=widths.shape[0] - 1)
        sig = -20. * np.log10(np.abs(inS21))
        peakIndS21Inv = signal.find_peaks_cwt(sig, widths, min_length=widths.shape[0] - 1)
#        print(peakIndS21Inv, NormalizeFreq(inFreq[peakIndS21Inv], w1, w2))
        sig = 20. * np.log10(np.abs(inS21))
        peakIndS21 = signal.find_peaks_cwt(sig, widths, min_length=widths.shape[0] - 1)
        bandIndS21 = FindEdge(inS21)
        temp1 = np.hstack((peakIndS11Inv, peakIndS21Inv, peakIndS21, bandIndS21))
        temp2 = temp1[(temp1 > 5) & (temp1 < inFreq.shape[0] - 5)]
        indexMinAuto = int(np.max([np.min(temp2) - 0, 0]))
        indexMaxAuto = int(np.min([np.max(temp2) + 0, inFreq.shape[0]-1]))
        if (startFreq == 0) and (stopFreq == 0):
            indexMin, indexMax = indexMinAuto, indexMaxAuto
        elif (startFreq == 0) and (stopFreq != 0):
            indexMin, indexMax = indexMinAuto, np.argmin(np.abs(stopFreq - inFreq))
        elif (startFreq != 0) and (stopFreq == 0):
            indexMin, indexMax = np.argmin(np.abs(startFreq - inFreq)), indexMaxAuto
        else:
            indexMin = np.argmin(np.abs(startFreq - inFreq))
            indexMax = np.argmin(np.abs(stopFreq - inFreq))

        step = np.max([int((indexMax - indexMin) / 400), 1])
        temp1 = np.arange(indexMin, indexMax, step, dtype=int)
        freq, S21, S11 = inFreq[temp1], inS21[temp1], inS11[temp1]
#        print(temp1[0], temp1[-1])
#        print(inFreq[temp1[0]], inFreq[temp1[-1]])
        return freq, S21, S11
        
    def SerializeFP(rootF, rootP):
        eFP = np.array([])
        filterOrder = np.array([])
        tempPos = np.array([])
#        tempNeg = np.array([])
        for i in np.arange(rootF.shape[0]):
            eFP = np.append(eFP, np.imag(rootF[i]))
            filterOrder = np.append(filterOrder, 0)
        for i in np.arange(len(rootP)):
            if np.abs(np.real(rootP[i])) < 0.1:
                eFP = np.append(eFP, np.imag(rootP[i]))
                filterOrder = np.append(filterOrder, 2)
            elif np.real(rootP[i]) > 0.:
                tempPos = np.append(tempPos, rootP[i])
#            else:
#                tempNeg = np.append(tempNeg, rootP[i])
        tempPosSort = tempPos[np.argsort(np.imag(tempPos))]
#        tempNegSort = tempNeg[np.argsort(np.imag(tempNeg))]
        for i in np.arange(tempPosSort.shape[0]):
            eFP = np.append(eFP, np.array([np.real(tempPosSort[i]), np.imag(tempPosSort[i])]))
            filterOrder = np.append(filterOrder, 4)
        return eFP, filterOrder

    def DeserializeFP(eFP, filterOrder):
        rootF = np.array([])
        rootP = np.array([])
        eFP_index = 0
        for i in np.arange(filterOrder.shape[0]):
            if filterOrder[i] == 0:
                rootF = np.append(rootF, 1j * eFP[eFP_index])
                eFP_index += 1
            elif filterOrder[i] == 1:
                rootF = np.append(rootF, [1j * eFP[eFP_index], -1j * eFP[eFP_index]])
                eFP_index += 1
            elif filterOrder[i] == 2:
                rootP = np.append(rootP, 1j * eFP[eFP_index])
                eFP_index += 1
            elif filterOrder[i] == 3:
                rootP = np.append(rootP, [1j * eFP[eFP_index], -1j * eFP[eFP_index]])
                eFP_index += 1
            elif filterOrder[i] == 4:
                rootP = np.append(rootP, [eFP[eFP_index] + 1j * eFP[eFP_index+1], -eFP[eFP_index] + 1j * eFP[eFP_index+1]])
                eFP_index += 2
        return rootF, rootP

    def GetEpsilonRootE(coefF, coefP, S11, S21, normalizedFreq, Qu=5000., epsilon=1.e10, method=2):
#        normalizedS = 1j * normalizedFreq + 1./Qu
        normalizedS = 1j * normalizedFreq + np.sqrt(w2 * w1) / (Qu * (w2 - w1))
        polyF = Polynomial(coefF)
#        if len(rootP) == 0:
#            polyP = Polynomial([1])
#        else:
#            polyP = Polynomial.fromroots(rootP)
        polyP = Polynomial(coefP)
        if np.abs(epsilon) > 1.e9:
#            tempIndex = np.argmin(np.abs(normalizedFreq - 1.0))
#            epsilon = ((S11[tempIndex] / S21[tempIndex]) * polyP(1j * normalizedFreq[tempIndex] + 1./Qu) / polyF(1j * normalizedFreq[tempIndex] + 1./Qu)) # polyP(1./Qu) / polyF(1./Qu) is very close to polyP(0) / polyF(0)
            nF = len(coefF) - 1
            nP = len(coefP) - 1
            M = np.hstack((np.diag(S21).dot(np.vander(normalizedS, nF+1, increasing=True).dot(np.array([polyF.coef]).T)), -np.diag(S11).dot(np.vander(normalizedS, nP+1, increasing=True).dot(np.array([polyP.coef]).T))))
            V = np.linalg.svd(M)[2]
            temp1 = np.conj(V[-1, :]) # b
            epsilon = temp1[0] / temp1[1]
        rootE = FP2E(epsilon, coefF, coefP, method=method)
        polyE = Polynomial.fromroots(rootE)
#        tempIndex = np.argmin(np.abs(normalizedFreq - 1.0))

#        temp1 = polyF(1j * normalizedFreq[tempIndex] + 1./Qu) / (polyE(1j * normalizedFreq[tempIndex] + 1./Qu) * S11[tempIndex])
#        temp2 = np.array([1., 1.j, -1., -1.j])
#        temp3 = temp2[np.argmin(np.abs(np.angle(temp1 / temp2)))]
#        epsilonE = epsilon * temp3
        nF = len(coefF) - 1
        nP = len(coefP) - 1
        nE = int(np.max([nF, nP]))
#        nFreq = normalizedFreq.shape[0]
#        temp1 = np.hstack((np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True).dot(np.array([polyF.coef]).T), np.zeros((nFreq, 1)), -np.diag(S11).dot(np.vander(1j * normalizedFreq + 1./Qu, nE+1, increasing=True))))
#        temp2 = np.hstack((np.zeros((nFreq, 1)), np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True).dot(np.array([polyP.coef]).T), -np.diag(S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nE+1, increasing=True))))
#        M = np.vstack((temp1, temp2))
#        V = np.linalg.svd(M)[2]
#        temp3 = np.conj(V[-1, :]) # b
#        epsilon = temp3[0] / temp3[1]
#        epsilonE = temp3[-1] / temp3[1]
#        rootE = Polynomial(temp3[2:]).roots()
        
#        temp1 = np.hstack((np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True).dot(np.array([polyF.coef]).T), -np.diag(S11).dot(np.vander(1j * normalizedFreq + 1./Qu, nE+1, increasing=True).dot(np.array([polyE.coef]).T))))
        temp2 = np.hstack((np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True).dot(np.array([polyP.coef]).T), -np.diag(S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nE+1, increasing=True).dot(np.array([polyE.coef]).T))))
#        temp3 = np.hstack((np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True), -np.diag(S11 / S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True))))
        M = temp2
        V = np.linalg.svd(M)[2]
        temp3 = np.conj(V[-1, :]) # b
#        epsilon = temp3[nF] / temp3[-1]
        epsilonE = temp3[-1] / temp3[0]#epsilon * temp3[-1] / temp3[0]
        epsilonE = np.abs(epsilon) * epsilonE / np.abs(epsilonE)
#        rootE = Polynomial(temp3[1:]).roots()
        return epsilon, epsilonE, rootE

    def GetQu(epsilon, epsilonE, Qu, rootF, rootP, rootE, S11, S21, normalizedFreq):
        polyE = Polynomial.fromroots(rootE)
#        polyF = epsilon * Polynomial.fromroots(rootF)
        if len(rootP) == 0:
            polyP = lambda x: 1.
        else:
            polyP = Polynomial.fromroots(rootP)
#        tempIndex = np.argmin(np.abs(normalizedFreq - 0))
        tempIndex = np.argmin(np.abs(S11))
#        tempIndex = np.argmax(np.abs(S21))
        tempEqn = lambda x: np.abs(polyP(1j * normalizedFreq[tempIndex] + np.sqrt(w2 * w1) / (x * (w2 - w1)))) - np.abs(S21[tempIndex] * epsilonE * polyE(1j * normalizedFreq[tempIndex] + np.sqrt(w2 * w1) / (x * (w2 - w1))))
#        plt.clf()
#        aaa = np.arange(10, 10000, 10)
#        plt.plot(aaa, tempEqn(aaa))
        a = 0.1
        b = 1.e19
        if (tempEqn(a) * tempEqn(b)) < 0:
            Qu = optimize.brenth(tempEqn, a, b)
        else:
            return np.inf
        return Qu

    def CostFunc(eFP, filterOrder, Qu=5000, considerPhase=False):
        rootF, rootP = DeserializeFP(eFP, filterOrder)
        coefF = Polynomial.fromroots(rootF)
        coefP = Polynomial.fromroots(rootP)
        epsilon, rootE = GetEpsilonRootE(coefF, coefP, S11, S21, normalizedFreq, Qu)
        S11fromFP, S21fromFP = FPE2S(epsilon, epsilonE, coefF, coefP, rootE, normalizedFreq - 1.j / Qu);
        
        if considerPhase:
            temp1 = -2. * np.pi * np.sqrt(freq * freq - cutoffFrequency * cutoffFrequency) / 299792458.
            theta1 = temp1 * L1;
            theta2 = temp1 * L2;
            S11fromFP = S11fromFP * np.exp(2j * theta1);
            S21fromFP = S21fromFP * np.exp(1j * (theta1 + theta2));
            return Distance(S21, S21fromFP, option=5) + Distance(S11, S11fromFP, option=5);
        else:
            return Distance(S21, S21fromFP, option=4) + Distance(S11, S11fromFP, option=4);

#        curveS21 = interpolate.interp1d(np.append(normalizedFreq, [-10., 10]), np.append(S21, [0., 0.]))
#        curveS11 = interpolate.interp1d(np.append(normalizedFreq, [-10., 10]), np.append(S11, [1., 1.]))
#        return np.sum(np.abs(curveS21(np.imag(rootP)))) + np.sum(np.abs(curveS11(np.imag(rootF))))

    def GetInitialValue(filterOrder, method=0):
        if method == 0:
            initialValue = np.array([])
            for i in np.arange(filterOrder.shape[0]):
                if filterOrder[i] == 0:
                    initialValue = np.append(initialValue, 2 * np.random.random() - 1)
                elif filterOrder[i] == 1:
                    temp1 = np.random.random()
                    initialValue = np.append(initialValue, [temp1, -temp1])
                elif filterOrder[i] == 2:
                    temp1 = 2 * np.random.random() - 1
                    if temp1 > 0:
                        temp1 = 1 + temp1 / 2
                    elif temp1 < 0:
                        temp1 = -1 + temp1 / 2
                    initialValue = np.append(initialValue, temp1)
                elif filterOrder[i] == 3:
                    temp1 = 2 * np.random.random() - 1
                    if temp1 > 0:
                        temp1 = 1 + temp1 / 2
                    elif temp1 < 0:
                        temp1 = -1 + temp1 / 2
                    initialValue = np.append(initialValue, [temp1, -temp1])
                elif filterOrder[i] == 4:
                    initialValue = np.append(initialValue, [np.random.random(), np.random.random()])
        elif method == 1:
            epsilon, epsilonE, Qu, rootF, rootP, rootE = S2FP(freq, S21, S11, filterOrder, w1, w2, fc, method=1)
            initialValue = SerializeFP(rootF, rootP)[0]
        return initialValue

    freq, S21, S11 = RectifyInputData(inFreq, inS21, inS11)
    normalizedFreq = NormalizeFreq(freq, w1, w2)
    if np.isnan(fc):
        fc = (w1 + w2) / 4
    Qu = 1e9 # initial Qu value
    
    if method == 0:
        initialValue = GetInitialValue(filterOrder, method=1)
        print(initialValue, CostFunc(initialValue, filterOrder));
    #    if False:
        if True:
            minFun = 1.e19
            for i in np.arange(0, 1):
                res = optimize.minimize(CostFunc, initialValue, args=(filterOrder, Qu), bounds=((-2.8, 2.8),) * initialValue.shape[0], tol=1.e-9);
                print(res.message, res.fun, res.success, res.nit);
                initialValue = GetInitialValue(filterOrder)
                if res.fun < minFun:
                    minFun = res.fun;
                    minRes = res;
                    if res.fun < 1.e-3:
                        break
            resultFP = minRes.x;
            print(minRes.message, minRes.fun, minRes.success, minRes.nit);
        else:
            print(CostFunc(initialValue, filterOrder, False));
            resultFP = initialValue;
        rootF, rootP = DeserializeFP(resultFP, filterOrder)
        coefF = Polynomial.fromroots(rootF)
        coefP = Polynomial.fromroots(rootP)
        epsilon, epsilonE, rootE = GetEpsilonRootE(coefF, coefP, S11, S21, normalizedFreq, Qu)
    elif (method == 1) or (method == 2):
        normalizedS = 1j * normalizedFreq + 0*np.sqrt(w2 * w1) / (Qu * (w2 - w1))
        rootF, rootP = DeserializeFP(np.arange(filterOrder.shape[0] * 2), filterOrder)
        nF = len(rootF)
        nP = len(rootP)
        for i in np.arange(0, 2):
            if (method == 2): # increase order
                originalNF = nF
                nF += int(0.49 * nF)
#            M = np.hstack((np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True), -np.diag(S11 / S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True))))
            M = np.hstack((np.diag(S21).dot(np.vander(normalizedS, nF+1, increasing=True)), -np.diag(S11).dot(np.vander(normalizedS, nP+1, increasing=True))))
#            M = np.hstack((np.diag(S21 / S11).dot(np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True)), -np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True)))
            Q, R = np.linalg.qr(M, mode='complete')
            R11 = R[:nF+1, :nF+1]
            R12 = R[:nF+1, nF+1:]
            R22 = R[nF+1:, nF+1:]
            V = np.linalg.svd(R22)[2]
            coefP = np.conj(V[-1, :]) # b
            rootP = Polynomial(coefP).roots()
            coefF = -np.linalg.inv(R11).dot(R12.dot(coefP))
            rootF = Polynomial(coefF).roots()
            if (method == 2): # decrease order
                nF = originalNF
                M = np.hstack((np.diag(S21).dot(np.vander(normalizedS, nF+1, increasing=True)), -np.diag(S11).dot(np.vander(normalizedS, nP+1, increasing=True).dot(np.array([coefP]).T))))
                V = np.linalg.svd(M)[2]
                temp1 = np.conj(V[-1, :]) # b
                coefF = temp1[:-1]
                rootF = Polynomial(coefF).roots()
                coefP = temp1[-1] * coefP
            if np.all((np.real(rootF) < 0.01) & (np.real(rootF) > -0.01)): 
                Qu = 1. / (1. / Qu - np.median(np.real(rootF)))
            else:
                break
        epsilon = coefF[-1] / coefP[-1]
        epsilon, epsilonE, rootE = GetEpsilonRootE(coefF, coefP, S11, S21, normalizedFreq, Qu, epsilon)
        Qu = GetQu(epsilon, epsilonE, Qu, rootF, rootP, rootE, S11, S21, normalizedFreq)
        rootF += np.sqrt(w2 * w1) / (Qu * (w2 - w1))
        rootP += np.sqrt(w2 * w1) / (Qu * (w2 - w1))
    elif (method == 3) or (method == 4):
        rootF, rootP = DeserializeFP(np.arange(filterOrder.shape[0] * 2), filterOrder)
        nF = len(rootF)
        nP = len(rootP)
        for i in np.arange(0, 1):
            normalizedS = 1j * normalizedFreq + 0*np.sqrt(w2 * w1) / (Qu * (w2 - w1))
            if (method == 4): # increase order
                originalNF = nF
                nF += int(0.49 * nF)
            if nP > 0:
                M = np.hstack((np.vander(normalizedS, nF+1, increasing=True), -np.diag(S11 / S21).dot(np.vander(normalizedS, nP+1, increasing=True))))
                M = np.hstack((np.diag(S21).dot(np.vander(normalizedS, nF+1, increasing=True)), -np.diag(S11).dot(np.vander(normalizedS, nP+1, increasing=True))))
                Q, R = np.linalg.qr(M, mode='complete')
                R11 = R[:nF+1, :nF+1]
                R12 = R[:nF+1, nF+1:]
                R22 = R[nF+1:, nF+1:]
                V = np.linalg.svd(R22)[2]
                coefP = np.conj(V[-1, :]) # b
                coefP /= coefP[-1]
                rootP = Polynomial(coefP).roots()
            else:
                coefP = np.array([1.0])
                rootP = np.array([])
#            print("rootP: ", rootP)
#            coefF = -np.linalg.inv(R11).dot(R12.dot(coefP))
#            rootF = Polynomial(coefF).roots()
#            if (method == 2): # decrease order
#                nF = originalNF
#            bandIndS21 = FindEdge(S21)
#            temp1 = np.ones((S21.shape[0],))
#            for j in bandIndS21:
#                temp1[j - 10 : j + 10] = 0.5e-2
#            for j in rootP:
#                tempIndex = np.argmin(np.abs(normalizedFreq - np.imag(j)))
#                temp1[tempIndex - 10 : tempIndex + 10] = 0.2e-4 / np.abs(S21[tempIndex])
#            M = np.diag(temp1).dot(np.hstack((np.diag(S21).dot(np.vander(normalizedS, nF+1, increasing=True)), -np.diag(S11).dot(np.vander(normalizedS, nP+1, increasing=True).dot(np.array([coefP]).T)))))

            if (method == 4): # increase order
                originalNP = nP
                nP += 2
                nF = originalNF + 0
            M = np.hstack((np.diag(S21 * S21 * S21).dot(np.vander(normalizedS, nF+1, increasing=True)), -np.diag(S11 * S21 * S21).dot(np.vander(normalizedS, nP+1, increasing=True))))
            V = np.linalg.svd(M)[2]
            temp1 = np.conj(V[-1, :]) # b
            coefF = temp1[:nF + 1]
            rootF = Polynomial(coefF).roots()
#            tempSort = np.argsort(np.abs(rootF - 1j * np.median(np.imag(rootF))))
            tempSort = np.argsort(np.abs(rootF))
            rootF = rootF[tempSort]
#            print(rootF)
            if (method == 4): # decrease order
                nF = originalNF
                nP = originalNP
            rootF = rootF[:nF]
            polyF = Polynomial.fromroots(rootF)
            coefF = polyF.coef
            M = np.hstack((np.diag(S21 * S21 * S21).dot(np.vander(normalizedS, nF+1, increasing=True).dot(np.array([coefF]).T)), -np.diag(S11 * S21 * S21).dot(np.vander(normalizedS, nP+1, increasing=True).dot(np.array([coefP]).T))))
            V = np.linalg.svd(M)[2]
            temp1 = np.conj(V[-1, :]) # b
            epsilon = temp1[0] / temp1[1]
            
#            if (method == 4): # decrease order
#                nF = originalNF
#            M = np.hstack((np.diag(S21 * S21 * S21).dot(np.vander(normalizedS, nF+1, increasing=True)), -np.diag(S11 * S21 * S21).dot(np.vander(normalizedS, nP+1, increasing=True).dot(np.array([coefP]).T))))
#            V = np.linalg.svd(M)[2]
#            temp1 = np.conj(V[-1, :]) # b
#            coefF = temp1[:-1]
#            rootF = Polynomial(coefF).roots()
#            coefP = temp1[-1] * coefP
#            epsilon = coefF[-1] / coefP[-1]
            
#            if np.all((np.real(rootF) < 1) & (np.real(rootF) > -1)):
#                deviateRootF = np.median(np.real(rootF))
#                Qu = 1. / (1. / Qu - deviateRootF * (w2 - w1) / np.sqrt(w2 * w1))
##                print('i: ', i, ', rootF:', rootF, Qu, deviateRootF)
##                print('i: ', i, ', rootP:', rootP)
#                rootF -= deviateRootF
#                coefF = Polynomial.fromroots(rootF).coef
#                if len(rootP) == 0:
#                    polyP = Polynomial([1])
#                else:
#                    rootP -= deviateRootF
#                    polyP = Polynomial.fromroots(rootP)
#                coefP = polyP.coef
#            else:
#                break
#        for i in np.arange(len(rootP)):
#            if np.abs(np.real(rootP[i])) < 1e-2:
#                rootP[i] -= np.real(rootP[i])
#            else:
#                for j in np.arange(i, len(rootP)):
#                    if (i != j) and (np.abs(np.real(rootP[i] + rootP[j])) < 1e-2) and (np.abs(np.imag(rootP[i] - rootP[j])) < 1e-2):
#                        rootP[i] = (np.real(rootP[i] - rootP[j]) + 1j * np.imag(rootP[i] + rootP[j])) / 2
#                        rootP[j] = -rootP[i].conj()
        epsilon, epsilonE, rootE = GetEpsilonRootE(coefF, coefP, S11, S21, normalizedFreq, Qu, epsilon)
        Qu = GetQu(epsilon, epsilonE, Qu, rootF, rootP, rootE, S11, S21, normalizedFreq)
        rootF += np.sqrt(w2 * w1) / (Qu * (w2 - w1))
        rootP += np.sqrt(w2 * w1) / (Qu * (w2 - w1))
    elif method == 5:
        normalizedS = 1j * normalizedFreq + 0*np.sqrt(w2 * w1) / (Qu * (w2 - w1))
        rootF, rootP = DeserializeFP(np.arange(filterOrder.shape[0] * 2), filterOrder)
        nF = len(rootF)
        nP = len(rootP)
        
        originalNF = nF # increase order
        nF += int(0.49 * nF)
        if nP > 0:
            if ((nF + nP + 3) % 2 == 1) and (nF % 2 == 0):
                riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1.0, 1j)
            else:
                riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1j, 1.0)
            riSeqP = np.where(np.arange(nP + 1) % 2 == 0, 1.0, 1j)
            vanderF = riSeqF * np.diag(S21).dot(np.vander(normalizedS, nF+1, increasing=True))
            vanderP = -riSeqP * np.diag(S11).dot(np.vander(normalizedS, nP+1, increasing=True))
            tempM = np.hstack((vanderF, vanderP))
            M = np.vstack((np.real(tempM), np.imag(tempM)))
            Q, R = np.linalg.qr(M, mode='complete')
            R11 = R[:nF+1, :nF+1]
            R12 = R[:nF+1, nF+1:]
            R22 = R[nF+1:, nF+1:]
            V = np.linalg.svd(R22)[2]
            coefP = np.conj(V[-1, :]) * riSeqP # b
            coefP /= coefP[-1]
            rootP = Polynomial(coefP).roots()
        else:
            coefP = np.array([1.0])
            rootP = np.array([])

        originalNP = nP
        nP += 2
        nF = originalNF
        if ((nF + nP + 3) % 2 == 1) and (nF % 2 == 0):
            riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1.0, 1j)
        else:
            riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1j, 1.0)
        riSeqP = np.where(np.arange(nP + 1) % 2 == 0, 1.0, 1j)
        vanderF = riSeqF * np.diag(S21 * S21 * S21).dot(np.vander(normalizedS, nF+1, increasing=True))
        vanderP = -riSeqP * np.diag(S11 * S21 * S21).dot(np.vander(normalizedS, nP+1, increasing=True))
        tempM = np.hstack((vanderF, vanderP))
        M = np.vstack((np.real(tempM), np.imag(tempM)))
        V = np.linalg.svd(M)[2]
        temp1 = np.conj(V[-1, :]) # b
        coefF = temp1[:nF + 1] * riSeqF
        coefF /= coefF[-1]
        rootF = Polynomial(coefF).roots()

        nP = originalNP
        nF = originalNF
        M = np.hstack((np.diag(S21 * S21 * S21).dot(np.vander(normalizedS, nF+1, increasing=True).dot(np.array([coefF]).T)), -np.diag(S11 * S21 * S21).dot(np.vander(normalizedS, nP+1, increasing=True).dot(np.array([coefP]).T))))
        V = np.linalg.svd(M)[2]
        temp1 = np.conj(V[-1, :]) # b
        epsilon = temp1[0] / temp1[1]
        rootE = FP2E(epsilon, coefF, coefP)
        epsilonE = epsilon
#        epsilon, epsilonE, rootE = GetEpsilonRootE(rootF, rootP, S11, S21, normalizedFreq, Qu, epsilon)
        Qu = GetQu(epsilon, epsilonE, Qu, rootF, rootP, rootE, S11, S21, normalizedFreq)
    elif method == 6:
#        print(normalizedFreq[0], normalizedFreq[-1])
        rootF, rootP = DeserializeFP(np.arange(filterOrder.shape[0] * 2), filterOrder)
        originalNF = len(rootF)
        originalNP = len(rootP)
        originalS11 = S11
        originalS21 = S21
#        bandIndS21 = FindEdge(S21)
#        tempArg1 = bandIndS21[0] + int(0.2 * (bandIndS21[1] - bandIndS21[0]))
#        tempArg2 = bandIndS21[0] + int(0.8 * (bandIndS21[1] - bandIndS21[0]))
#        freq_ExtractPort = freq[tempArg1 : tempArg2]
#        S11_ExtractPort = S11[tempArg1 : tempArg2]
#        S21_ExtractPort = S21[tempArg1 : tempArg2]
        numIter = 3
        for i in np.arange(0, numIter):
            toDoSymmetric = isSymmetric and (i == numIter - 1)
            normalizedS = 1j * normalizedFreq + np.sqrt(w2 * w1) / (Qu * (w2 - w1))
            if originalNP > 0:
                nP = originalNP
                nF = originalNF + 2
                if ((nF + nP + 3) % 2 == 1) and (nF % 2 == 0):
                    riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1.0, 1j)
                else:
                    riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1j, 1.0)
                riSeqP = np.where(np.arange(nP + 1) % 2 == 0, 1.0, 1j)
                
                weight = 1.0 / np.sqrt(np.abs(S21))
#                vanderF = riSeqF * np.diag(S21 * weight).dot(np.vander(normalizedS, nF+1, increasing=True))
                vanderF = np.diag(S21 * weight).dot(np.vander(normalizedS, nF+1, increasing=True))
                vanderP = -riSeqP * np.diag(S11 * weight).dot(np.vander(normalizedS, nP+1, increasing=True))
                tempM = np.hstack((vanderF, 1j * vanderF, vanderP))
                M = np.vstack((np.real(tempM), np.imag(tempM)))
                Q, R = np.linalg.qr(M, mode='complete')
                R11 = R[:2*nF+2, :2*nF+2]
                R12 = R[:2*nF+2, 2*nF+2:]
                R22 = R[2*nF+2:, 2*nF+2:]

                V = np.linalg.svd(R22)[2]
                coefP = np.conj(V[-1, :]) * riSeqP # b
                coefP /= coefP[-1]
                rootP = Polynomial(coefP).roots()
            else:
                coefP = np.array([1.0])
                rootP = np.array([])
            
            if np.abs(w1 - w2) > 0.08 * np.sqrt(w1 * w2):
                nP = originalNP + 0 #int(originalNP * 1.5)
            else:
                nP = originalNP + 2
            nF = originalNF + 0
            if ((nF + nP + 3) % 2 == 1) and (nF % 2 == 0):
                riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1.0, 1j)
            else:
                riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1j, 1.0)
            riSeqP = np.where(np.arange(nP + 1) % 2 == 0, 1.0, 1j)
            weight = np.abs(S21)
            if toDoSymmetric:
                vanderF = riSeqF * np.diag(S21 * weight).dot(np.vander(normalizedS, nF+1, increasing=True))
                vanderP = -np.diag(S11 * weight).dot(np.vander(normalizedS, nP+1, increasing=True))
                tempM = np.hstack((vanderF, vanderP, 1j * vanderP))
                M = np.vstack((np.real(tempM), np.imag(tempM)))
            else:
                vanderF = np.diag(S21 * weight).dot(np.vander(normalizedS, nF+1, increasing=True))
                vanderP = -np.diag(S11 * weight).dot(np.vander(normalizedS, nP+1, increasing=True))
                M = np.hstack((vanderF, vanderP))
            V = np.linalg.svd(M)[2]
            temp1 = np.conj(V[-1, :]) # b
            if toDoSymmetric:
                coefF = temp1[:nF + 1] * riSeqF
            else:
                coefF = temp1[:nF + 1]
            coefF /= coefF[-1]
            rootF = Polynomial(coefF).roots()
            
#            nP = originalNP + 0
#            nF = originalNF + 0
#            if ((nF + nP + 3) % 2 == 1) and (nF % 2 == 0):
#                riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1.0, 1j)
#            else:
#                riSeqF = np.where(np.arange(nF + 1) % 2 == 0, 1j, 1.0)
#            riSeqP = np.where(np.arange(nP + 1) % 2 == 0, 1.0, 1j)
#            weight = np.abs(S21)
#            if toDoSymmetric:
#                vanderF = riSeqF * np.diag(S21 * weight).dot(np.vander(normalizedS, nF+1, increasing=True))
#                vanderP = -riSeqP * np.diag(S11 * weight).dot(np.vander(normalizedS, nP+1, increasing=True))
#                tempM = np.hstack((vanderF, vanderP))
#                M = np.vstack((np.real(tempM), np.imag(tempM)))
#            else:
#                vanderF = np.diag(S21 * weight).dot(np.vander(normalizedS, nF+1, increasing=True))
#                vanderP = -riSeqP * np.diag(S11 * weight).dot(np.vander(normalizedS, nP+1, increasing=True))
#                tempM = np.hstack((vanderF, 1j * vanderF, vanderP))
#                M = np.vstack((np.real(tempM), np.imag(tempM)))
#            V = np.linalg.svd(M)[2]
#            temp1 = np.conj(V[-1, :]) # b
#            if toDoSymmetric:
#                coefF = temp1[:nF + 1] * riSeqF
#            else:
#                coefF = temp1[:nF + 1] + 1j * temp1[nF + 1 : 2 * nF + 2]
##                print(Polynomial(temp1[-nP-1:] * riSeqP).roots())
#            coefF /= coefF[-1]
#            rootF = Polynomial(coefF).roots()
#            tempSort = np.argsort(np.abs(rootF))
#            rootF = rootF[tempSort]

            nF = originalNF
            nP = originalNP
            rootF = rootF[:nF]
            polyF = Polynomial.fromroots(rootF)
            coefF = polyF.coef
            weight = np.abs(S21 * S21)
            vanderF = np.diag(S21 * weight).dot(np.vander(normalizedS, nF+1, increasing=True).dot(np.array([coefF]).T))
            vanderP = -np.diag(S11 * weight).dot(np.vander(normalizedS, nP+1, increasing=True).dot(np.array([coefP]).T))
            M = np.hstack((vanderF, vanderP))
            V = np.linalg.svd(M)[2]
            temp1 = np.conj(V[-1, :]) # b
            epsilon = temp1[0] / temp1[1]

            if toDoSymmetric:
                fp2eMethod = 1
            else:
                fp2eMethod = 2
#            epsilon, epsilonE, rootE = GetEpsilonRootE(coefF, coefP, S11, S21, normalizedFreq, Qu, epsilon, method=fp2eMethod)
            rootE = FP2E(epsilon, coefF, coefP, method=fp2eMethod)
            epsilonE = epsilon
            Qu = GetQu(epsilon, epsilonE, Qu, rootF, rootP, rootE, S11, S21, normalizedFreq)
#            port1, port2 = ExtractPort(freq_ExtractPort, S11_ExtractPort, S21_ExtractPort, w1, w2, fc, epsilon, coefP, coefF, rootE, Qu)
#            print(fc, port1, port2, coefF, Qu)
#            S11, S21 = DeembedS(freq, originalS11, originalS21, fc, port1, port2)

#        if not toDoSymmetric:
#            rootF += np.sqrt(w2 * w1) / (Qu * (w2 - w1))
#            coefF = Polynomial.fromroots(rootF).coef
#            rootE = FP2E(epsilon, coefF, coefP, method=fp2eMethod)


#        epsilon, epsilonE, rootE = GetEpsilonRootE(rootF, rootP, S11, S21, normalizedFreq, Qu)
#    Qu = GetQu(epsilon, epsilonE, Qu, rootF, rootP, rootE, S11, S21, normalizedFreq)
#    rootF += np.sqrt(w2 * w1) / (Qu * (w2 - w1))
#    rootP += np.sqrt(w2 * w1) / (Qu * (w2 - w1))
#    rootE += np.sqrt(w2 * w1) / (Qu * (w2 - w1))

#    print('epsilon:', epsilon)
#    print('epsilonE:', epsilonE)
#    print('Qu:', Qu)
#    print('rootF:', rootF)
#    print('rootP:', rootP)
#    print('rootE:', rootE)
    port1 = {"L": 0, "phi": 0}
    port2 = {"L": 0, "phi": 0}
    return epsilon, epsilonE, Qu, coefF, coefP, rootE, port1, port2

def WaveguideDelay(freq, fc, L):
    return -2 * np.pi * np.sqrt(freq * freq - fc * fc) * L / sp.constants.speed_of_light

def ExtractWaveguide(freq, angleRad, fc):
    np.save("tempData4", np.array([{"freq": freq, "angleRad": angleRad}]))
    unwrappedAngleRad = np.unwrap(angleRad)
#    A = np.ones((len(freq), 2))
#    A[:, 0] = -2 * np.pi * np.sqrt(freq * freq - fc * fc) / sp.constants.speed_of_light
#    B = unwrappedAngleRad
#    x, residuals = np.linalg.lstsq(A, B)[0:2]
#    return x[0], x[1]
    A = np.matrix(-2 * np.pi * np.sqrt(freq * freq - fc * fc) / sp.constants.speed_of_light).T
    B = unwrappedAngleRad
    x, residuals = np.linalg.lstsq(A, B)[0:2]
    return x[0], 0.0

def ExtractPort(freq, S11, S21, w1, w2, fc, epsilon, coefP, coefF, rootE, Qu):
    normalizedFreq = NormalizeFreq(freq, w1, w2)
    normalizedS = 1j * normalizedFreq + np.sqrt(w2 * w1) / (Qu * (w2 - w1))
    polyP = Polynomial(coefP)
    polyF = Polynomial(coefF)
    polyE = Polynomial.fromroots(rootE)
    angleRad = np.angle(S21 / S11) - np.angle(polyP(normalizedS) / (signedEpsilon(len(coefF) - 1, len(coefP) - 1, epsilon) * polyF(normalizedS)))
    L1, phi1 = ExtractWaveguide(freq, angleRad, fc)
    angleRad = np.angle(S21) - np.angle(polyP(normalizedS) / (signedEpsilon(len(coefF) - 1, len(coefP) - 1, epsilon) * polyE(normalizedS)))
    L2, phi2 = ExtractWaveguide(freq, angleRad, fc)
    port1 = {"L": (L1 + L2) / 2, "phi": (phi1 + phi2) / 2}
    port2 = {"L": (L2 - L1) / 2, "phi": (phi2 - phi1) / 2}
    return port1, port2

def DeembedS(freq, S11, S21, fc, port1, port2):
    temp1 = WaveguideDelay(freq, fc, 2 * port1["L"]) + 2 * port1["phi"]
    S11_new = S11 / (np.cos(temp1) + 1j * np.sin(temp1))
    temp1 = WaveguideDelay(freq, fc, port1["L"] + port2["L"]) + port1["phi"] + port2["phi"]
    S21_new = S21 / (np.cos(temp1) + 1j * np.sin(temp1))
    return S11_new, S21_new

def embedS(freq, S11, S21, fc, port1, port2):
    temp1 = 1.5*np.pi + WaveguideDelay(freq, fc, 2 * port1["L"]) + 2 * port1["phi"]
    S11_new = S11 * (np.cos(temp1) + 1j * np.sin(temp1))
    temp1 = WaveguideDelay(freq, fc, port1["L"] + port2["L"]) + port1["phi"] + port2["phi"]
    S21_new = S21 * (np.cos(temp1) + 1j * np.sin(temp1))
    return S11_new, S21_new

def Y2Ladder(yn, yd, evenModeOddDegree = False):
    tempYn = yn
    tempYd = yd
    polyArray = []
    while tempYn != Polynomial([0]):
        polyArray.append(tempYd // tempYn)
        temp1 = tempYd % tempYn
        tempYd = tempYn
        tempYn = temp1
    C = np.real([x.coef[1] if len(x.coef) > 1 else 1.0 for x in polyArray])
    B = np.imag([x.coef[0] for x in polyArray])
    bArray = B / C
    mArray = 1 / np.sqrt(C[:-1] * C[1:])
    if evenModeOddDegree:
        mArray[-1] /= np.sqrt(2.0)
    return bArray, mArray

def FPE2M(epsilon, epsilonE, coefF, coefP, rootE, method=1):
    if method == 1:
    #    EF = Polynomial.fromroots(rootE).coef + np.exp(1j * np.pi * 180 / 180) * (epsilon / epsilonE) * Polynomial.fromroots(rootF).coef
#        EF = Polynomial.fromroots(rootE).coef + np.abs(epsilon / epsilonE) * Polynomial.fromroots(rootF).coef
        EF = Polynomial.fromroots(rootE).coef + coefF
        realEF = np.real(EF)
        imagEF = np.imag(EF)
        
        N = len(coefF) - 1
        temp1 = np.arange(N + 1)
        temp2 = np.where(temp1 % 2 == 0, 0., 1.)
        m1 = (1. - temp2) * realEF + 1j * temp2 * imagEF
        n1 = temp2 * realEF + 1j * (1. - temp2) * imagEF
        
        if N % 2 == 0:
            yd = m1
            y22n = n1
        else:
            yd = n1
            y22n = m1
        y22n = y22n[:-1]

#        if len(rootP) > 0:
#            coefP = Polynomial.fromroots(rootP).coef
#        else:
#            coefP = np.array([1.])

        y21n = coefP / signedEpsilon(len(coefF) - 1, len(coefP) - 1, epsilon)
    
        y21n /= yd[-1]
        y22n /= yd[-1]
        yd /= yd[-1]
    
        r21k, lambdak, k21 = signal.residue(y21n[-1::-1], yd[-1::-1], tol=1e-9)
        r22k, lambdak, k22 = signal.residue(y22n[-1::-1], yd[-1::-1], tol=1e-9)

#        polyYd = Polynomial(yd)
#        yd2 = yd.copy()
#        for i in np.arange(len(yd)):
#            yd2[i] *= (1j) ** (i + N % 2)
#        yd2 = np.real(yd2)
#        rootYd = 1j * Polynomial(yd2).roots()
#        polyYdDer = polyYd.deriv()
#        polyY21n = Polynomial(y21n)
#        polyY22n = Polynomial(y22n)
#        polyYdDerDer = polyYdDer.deriv()
#        polyY21nDer = polyY21n.deriv()
#        polyY22nDer = polyY22n.deriv()
#        lambdak = rootYd
#        r21k = polyY21n(rootYd) / polyYdDer(rootYd)
#        r22k = polyY22n(rootYd) / polyYdDer(rootYd)
#        r21k2 = polyY21nDer(rootYd) / polyYdDerDer(rootYd)
#        r22k2 = polyY22nDer(rootYd) / polyYdDerDer(rootYd)
#        r21k = np.where(np.abs(polyYdDer(rootYd)) > 0.1, r21k, r21k2)
#        r22k = np.where(np.abs(polyYdDer(rootYd)) > 0.1, r22k, r22k2)
#        print("polyYdDer: ", polyYdDer)
#        print("polyY21n: ", polyY21n)
#        print("polyY22n: ", polyY22n)
#        print("rootYd: ", rootYd)
#        print("polyYdDer: ", polyYdDer(rootYd))
#        print("polyY21n: ", polyY21n(rootYd))
#        print("polyY22n: ", polyY22n(rootYd))

        tempSort = np.argsort(np.imag(lambdak))
        lambdak = lambdak[tempSort]
        r21k = r21k[tempSort]
        r22k = r22k[tempSort]

        Mkk = np.zeros((N + 2,), dtype=complex)
        Mkk[1:-1] = 1j * lambdak
        M = np.diag(Mkk)
    
        M[0, -1] = -k21[0]
        M[-1, 0] = -k21[0]
    
        Mlk = np.sqrt(r22k)
        Msk = r21k / Mlk
        
#        if np.abs(np.imag(Msk[0])) > np.abs(np.real(Msk[0])):
#            Msk *= 1j
        
        M[0, 1:-1] = Msk
        M[1:-1, 0] = Msk
        M[-1, 1:-1] = Mlk
        M[1:-1, -1] = Mlk
        
        return np.real(M)

    elif method == 2:
        N = len(coefF) - 1
        tempSort = np.argsort(np.imag(rootE))
        sortRootE = rootE[tempSort[-1::-1]]
        
        yEnEd = Polynomial.fromroots(sortRootE[np.arange(0, len(rootE), 2)])
        lenPolyYe = int((N + 1) / 2) + 1
        temp2 = np.where(np.arange(lenPolyYe) % 2 == 0, 0., 1.)
        if lenPolyYe % 2 == 0:
            yEd = Polynomial((1. - temp2) * np.real(yEnEd.coef) + 1j * temp2 * np.imag(yEnEd.coef))
            yEn = Polynomial(temp2 * np.real(yEnEd.coef) + 1j * (1. - temp2) * np.imag(yEnEd.coef))
        else:
            yEn = Polynomial((1. - temp2) * np.real(yEnEd.coef) + 1j * temp2 * np.imag(yEnEd.coef))
            yEd = Polynomial(temp2 * np.real(yEnEd.coef) + 1j * (1. - temp2) * np.imag(yEnEd.coef))
        Be, Me = Y2Ladder(yEn, yEd, evenModeOddDegree = (N % 2 == 1))
        
        yOnOd = Polynomial.fromroots(sortRootE[np.arange(1, len(rootE), 2)])
        lenPolyYo = int(N / 2) + 1
        temp2 = np.where(np.arange(lenPolyYo) % 2 == 0, 0., 1.)
        if lenPolyYo % 2 == 0:
            yOd = Polynomial((1. - temp2) * np.real(yOnOd.coef) + 1j * temp2 * np.imag(yOnOd.coef))
            yOn = Polynomial(temp2 * np.real(yOnOd.coef) + 1j * (1. - temp2) * np.imag(yOnOd.coef))
        else:
            yOn = Polynomial((1. - temp2) * np.real(yOnOd.coef) + 1j * temp2 * np.imag(yOnOd.coef))
            yOd = Polynomial(temp2 * np.real(yOnOd.coef) + 1j * (1. - temp2) * np.imag(yOnOd.coef))
        Bo, Mo = Y2Ladder(yOn, yOd, evenModeOddDegree = False)
        
        M = np.zeros((N + 2, N + 2))
        for i in np.arange(len(Bo)):
            M[i, i] = (Be[i] + Bo[i]) / 2
            M[-i - 1, -i - 1] = M[i, i]
            M[i, -i - 1] = (Be[i] - Bo[i]) / 2
            M[-i - 1, i] = M[i, -i - 1]
        if N % 2 == 1:
            M[len(Be) - 1, len(Be) - 1] = Be[-1]
        for i in np.arange(len(Mo)):
            M[i, i + 1] = (Me[i] + Mo[i]) / 2
            M[i + 1, i] = M[i, i + 1]
            M[-i - 1, -i - 2] = M[i, i + 1]
            M[-i - 2, -i - 1] = M[i, i + 1]
            M[i, -i - 2] = (Me[i] - Mo[i]) / 2
            M[-i - 1, i + 1] = M[i, -i - 2]
            M[i + 1, -i - 1] = M[i, -i - 2]
            M[-i - 2, i] = M[i, -i - 2]
        if N % 2 == 1:
            M[len(Me) - 1, len(Me)] = Me[-1]
            M[len(Me), len(Me) - 1] = M[len(Me) - 1, len(Me)]
            M[-len(Me), -len(Me) - 1] = M[len(Me) - 1, len(Me)]
            M[-len(Me) - 1, -len(Me)] = M[len(Me) - 1, len(Me)]
            
        return M

    elif method == 3:
        N = len(rootE)
        polyF = Polynomial(coefF)
#        if len(rootP) == 0:
#            polyP = Polynomial([1])
#        else:
#            polyP = Polynomial.fromroots(rootP)
        polyP = Polynomial(coefP)
#        polyE = Polynomial.fromroots(rootE)
        
        accurateEpsilon = signedEpsilon(len(coefF) - 1, len(coefP) - 1, epsilon)
        
        polyFplusP = polyF - polyP / accurateEpsilon
        rootFplusP = polyFplusP.roots()
        tempSort = np.argsort([np.min(np.abs(x - rootE)) for x in rootFplusP])
        rootFplusP = rootFplusP[tempSort]
        tempRoot = rootFplusP[int((N - 1) / 2):]
        tempPoly1 = Polynomial.fromroots(tempRoot)
        tempPoly2 = Polynomial.fromroots(-tempRoot.conj())
        yEd = (tempPoly2 - tempPoly1) / 2
        yEn = (tempPoly2 + tempPoly1) / 2
        
        polyFminusP = polyF + polyP / accurateEpsilon
        rootFminusP = polyFminusP.roots()
        tempSort = np.argsort([np.min(np.abs(x - rootE)) for x in rootFminusP])
        rootFminusP = rootFminusP[tempSort]
        tempRoot = rootFminusP[int((N + 1) / 2):]
        tempPoly1 = Polynomial.fromroots(tempRoot)
        tempPoly2 = Polynomial.fromroots(-tempRoot.conj())
        yOd = (tempPoly2 - tempPoly1) / 2
        yOn = (tempPoly2 + tempPoly1) / 2
        
        Be, Me = Y2Ladder(yEn, yEd, evenModeOddDegree = (N % 2 == 1))
        Bo, Mo = Y2Ladder(yOn, yOd, evenModeOddDegree = False)
        
        M = np.zeros((N + 2, N + 2))
        for i in np.arange(len(Bo)):
            M[i, i] = (Be[i] + Bo[i]) / 2
            M[-i - 1, -i - 1] = M[i, i]
            M[i, -i - 1] = (Be[i] - Bo[i]) / 2
            M[-i - 1, i] = M[i, -i - 1]
        if N % 2 == 1:
            M[len(Be) - 1, len(Be) - 1] = Be[-1]
        for i in np.arange(len(Mo)):
            M[i, i + 1] = (Me[i] + Mo[i]) / 2
            M[i + 1, i] = M[i, i + 1]
            M[-i - 1, -i - 2] = M[i, i + 1]
            M[-i - 2, -i - 1] = M[i, i + 1]
            M[i, -i - 2] = (Me[i] - Mo[i]) / 2
            M[-i - 1, i + 1] = M[i, -i - 2]
            M[i + 1, -i - 1] = M[i, -i - 2]
            M[-i - 2, i] = M[i, -i - 2]
        if N % 2 == 1:
            M[len(Me) - 1, len(Me)] = Me[-1]
            M[len(Me), len(Me) - 1] = M[len(Me) - 1, len(Me)]
            M[-len(Me), -len(Me) - 1] = M[len(Me) - 1, len(Me)]
            M[-len(Me) - 1, -len(Me)] = M[len(Me) - 1, len(Me)]
            
        return M
        
    elif method == 4:
        polyE = Polynomial.fromroots(rootE)
        polyF = Polynomial(coefF)
#        if len(rootP) > 0:
#            polyP = Polynomial.fromroots(rootP)
#        else:
#            polyP = Polynomial([1.])
        polyP = Polynomial(coefP)

        N = len(coefF) - 1
        temp1 = np.arange(N + 1)
        temp2 = np.where(temp1 % 2 == 0, 0., 1.)

        EF = polyE.coef + polyF.coef
        realEF = np.real(EF)
        imagEF = np.imag(EF)
        m1 = (1. - temp2) * realEF + 1j * temp2 * imagEF
        n1 = temp2 * realEF + 1j * (1. - temp2) * imagEF
        
        EF = polyE.coef - polyF.coef
        realEF = np.real(EF)
        imagEF = np.imag(EF)
        m2 = (1. - temp2) * realEF + 1j * temp2 * imagEF
        n2 = temp2 * realEF + 1j * (1. - temp2) * imagEF
        
        if N % 2 == 0:
            A = Polynomial(n1)
            B = Polynomial(m1)
            C = Polynomial(m2)
            D = Polynomial(n2)
        else:
            A = Polynomial(m1)
            B = Polynomial(n1)
            C = Polynomial(n2)
            D = Polynomial(m2)
        
        A = Polynomial(A.coef[:-1])
        D = Polynomial(D.coef[:-1])
        if len(coefP) < len(coefF):
            C = Polynomial(C.coef[:-2])

        if (len(coefF) - len(coefP)) % 2 == 0:
            pEpsilon = -polyP / np.abs(epsilon)
        else:
            pEpsilon = 1j * polyP / np.abs(epsilon)    
        J = np.zeros((N + 1, ))
        sCJB = []
        sCJB2 = []
        for i in np.arange(N + 1):
            if len(pEpsilon.coef) < len(B.coef):
                J[i] = 0.0
            else:
                J[i] = np.real(-pEpsilon.coef[-1] / B.coef[-1])
                C = C + 2 * J[i] * pEpsilon + J[i] * J[i] * B
                pEpsilon = pEpsilon % B
        
            if np.sum(np.abs(A.coef)) > 1e-9:
                sCJB2.append(C // A)
                C = C % A
            if np.sum(np.abs(B.coef)) > 1e-9:
                sCJB.append(D // B)
                D = D % B
            
            A, B, C, D = -1j * C, -1j * D, -1j * A, -1j * B
        
        if np.sum(np.abs(B.coef)) > 1e-9:
            sCJB.append(D // B)
        else:
            sCJB.append(Polynomial([0.0]))
        
        B = np.imag([x.coef[0] for x in sCJB])
        C = np.real([x.coef[1] if len(x.coef) > 1 else 1.0 for x in sCJB])
#        print(B, "\n", C)
        C[C < 0] = 1e9
        
        M = np.zeros((N + 2, N + 2))
        for i in np.arange(N + 2):
            M[i, i] = B[i] / C[i]
        for i in np.arange(N):
            M[i, i + 1] = 1 / np.sqrt(C[i] * C[i + 1])
            M[i + 1, i] = M[i, i + 1]
        
        M[:-1, -1] = J / np.sqrt(C[:-1] * C[-1])
        M[-1, :-1] = M[:-1, -1]
        
        return M

    elif method == 5:
        polyE = Polynomial.fromroots(rootE)
        polyF = Polynomial(coefF)
#        if len(rootP) > 0:
#            polyP = Polynomial.fromroots(rootP)
#        else:
#            polyP = Polynomial([1.])
        polyP = Polynomial(coefP)

        N = len(coefF) - 1
        temp1 = np.arange(N + 1)
        temp2 = np.where(temp1 % 2 == 0, 0., 1.)

        EF = polyE.coef + polyF.coef
        realEF = np.real(EF)
        imagEF = np.imag(EF)
        m1 = (1. - temp2) * realEF + 1j * temp2 * imagEF
        n1 = temp2 * realEF + 1j * (1. - temp2) * imagEF
        
        EF = polyE.coef - polyF.coef
        realEF = np.real(EF)
        imagEF = np.imag(EF)
        m2 = (1. - temp2) * realEF + 1j * temp2 * imagEF
        n2 = temp2 * realEF + 1j * (1. - temp2) * imagEF
        
        if N % 2 == 0:
            A = Polynomial(n1)
            B = Polynomial(m1)
            C = Polynomial(m2)
            D = Polynomial(n2)
        else:
            A = Polynomial(m1)
            B = Polynomial(n1)
            C = Polynomial(n2)
            D = Polynomial(m2)
        
        A = Polynomial(A.coef[:-1])
        D = Polynomial(D.coef[:-1])
        if len(coefP) < len(coefF):
            C = Polynomial(C.coef[:-2])

        if (len(coefF) - len(coefP)) % 2 == 0:
            pEpsilon = -polyP / np.abs(epsilon)
        else:
            pEpsilon = 1j * polyP / np.abs(epsilon)   

        J = []
        sCJB = np.zeros((N + 2, 2), dtype = complex)
        sCJB2 = np.zeros((N + 2, 2), dtype = complex)
        pointerS = 0
        pointerE = N + 1
#        print("AD-BC: ", (A*D - B*C).coef)
#        print("pEpsilon^2: ", (pEpsilon*pEpsilon).coef)
        for i in np.arange(int(N / 2) + 1):
            if len(pEpsilon.coef) < len(B.coef):
                tempJ = 0.0
            else:
                tempJ = np.real(-pEpsilon.coef[-1] / B.coef[-1])
                C = C + 2 * tempJ * pEpsilon + tempJ * tempJ * B
                pEpsilon = pEpsilon % B
            J.append({"J": tempJ, "node1": pointerS, "node2": pointerE})
        
            if np.sum(np.abs(A.coef)) > 1e-9:
                temp1 = (C // A).coef
                sCJB2[pointerS, 0] = temp1[0]
                if len(temp1) > 1:
                    sCJB2[pointerS, 1] = temp1[1]
                else:
                    sCJB2[pointerS, 1] = 1.0
                C = C % A
            if np.sum(np.abs(B.coef)) > 1e-9:
                temp1 = (D // B).coef
                sCJB[pointerS, 0] = temp1[0]
                if len(temp1) > 1:
                    sCJB[pointerS, 1] = temp1[1]
                else:
                    sCJB[pointerS, 1] = 1.0
                D = D % B

            if not ((i == int(N / 2)) and (N % 2 == 0)):
                A, B, C, D = -1j * C, -1j * D, -1j * A, -1j * B
                pointerS += 1
                
                if len(pEpsilon.coef) < len(B.coef):
                    tempJ = 0.0
                else:
                    tempJ = np.real(-pEpsilon.coef[-1] / B.coef[-1])
                    C = C + 2 * tempJ * pEpsilon + tempJ * tempJ * B
                    pEpsilon = pEpsilon % B
                J.append({"J": tempJ, "node1": pointerS, "node2": pointerE})
            
            A, D = D, A
            
            if np.sum(np.abs(A.coef)) > 1e-9:
                temp1 = (C // A).coef
                sCJB2[pointerE, 0] = temp1[0]
                if len(temp1) > 1:
                    sCJB2[pointerE, 1] = temp1[1]
                else:
                    sCJB2[pointerE, 1] = 1.0
                C = C % A
            if np.sum(np.abs(B.coef)) > 1e-9:
                temp1 = (D // B).coef
                sCJB[pointerE, 0] = temp1[0]
                if len(temp1) > 1:
                    sCJB[pointerE, 1] = temp1[1]
                else:
                    sCJB[pointerE, 1] = 1.0
                D = D % B

            if i != int(N / 2):
                A, B, C, D = -1j * C, -1j * D, -1j * A, -1j * B
                pointerE -= 1

            A, D = D, A

        if (N % 2 == 1):
            if np.sum(np.abs(A.coef)) > 1e-9:
                temp1 = (C // A).coef
                sCJB2[pointerS, 0] = temp1[0]
                if len(temp1) > 1:
                    sCJB2[pointerS, 1] = temp1[1]
                else:
                    sCJB2[pointerS, 1] = 1.0
                C = C % A
            if np.sum(np.abs(B.coef)) > 1e-9:
                temp1 = (D // B).coef
                sCJB[pointerS, 0] = temp1[0]
                if len(temp1) > 1:
                    sCJB[pointerS, 1] = temp1[1]
                else:
                    sCJB[pointerS, 1] = 1.0
                D = D % B

        B = np.imag([x[0] for x in sCJB])
        C = np.real([x[1] if len(x) > 1 else 1.0 for x in sCJB])
#        print(B, "\n", C)
        C[C < 0] = 1.0
        
        M = np.zeros((N + 2, N + 2))
        for i in np.arange(N + 2):
            M[i, i] = B[i] / C[i]
        for i in np.arange(N + 1):
            M[i, i + 1] = 1 / np.sqrt(C[i] * C[i + 1])
            M[i + 1, i] = M[i, i + 1]
        
        for i in J:
            nd1 = i["node1"]
            nd2 = i["node2"]
            M[nd1, nd2] = i["J"] / np.sqrt(C[nd1] * C[nd2])
            M[nd2, nd1] = M[nd1, nd2]

        return M

    elif method == 6:
        rootF = Polynomial(coefF).roots()
        rootP = Polynomial(coefP).roots()
        initM = GetTopology(rootF.shape[0])
        initialValue, folding = ExtractElementMFromMatrix(initM);
    
        specialFreq = np.array([-1., 0., 1.])
        S11atSpecialFreq, S21atSpecialFreq = FPE2S(epsilon, epsilonE, coefF, coefP, rootE, specialFreq)

        def CostFunc(elementM, considerPhase=False):
            M = BuildMatrixFromElementM(elementM, folding);
    
            S21atRootFfromM, S11atRootFfromM = CM2S(M, rootF)
            S21atRootPfromM, S11atRootPfromM = CM2S(M, rootP)
#            S21atRootEfromM, S11atRootEfromM = CM2S(M, rootE)
            S11atSpecialFreqfromM, S21atSpecialFreqfromM = CM2S(M, specialFreq)
            
            return (Distance(S11atRootFfromM, np.zeros((S11atRootFfromM.shape[0]),), option=4) + 
                    Distance(S21atRootPfromM, np.zeros((S21atRootPfromM.shape[0]),), option=4) +
#                    Distance(1. / S11atRootEfromM, np.zeros((S11atRootEfromM.shape[0]),), option=4) +
#                    Distance(1. / S21atRootEfromM, np.zeros((S21atRootEfromM.shape[0]),), option=4) +
                    Distance(S11atSpecialFreqfromM, S11atSpecialFreq, option=4) +
                    Distance(S21atSpecialFreqfromM, S21atSpecialFreq, option=4))
    
        print(initialValue, CostFunc(initialValue));
    #    if False:
        if True:
            minFun = 10000.;
            for i in np.arange(0, 10):
                res = optimize.minimize(CostFunc, initialValue, args=(False,), bounds=((-1.8, 1.8),) * (initialValue.shape[0]), tol=1e-9);
                print(res.message, res.fun, res.success, res.nit);
                if res.fun < minFun:
                    minFun = res.fun;
                    minRes = res;
                if res.fun > 1.e-3:
#                    initialValue = -initialValue * 0.9;
                    initialValue = np.random.rand(initialValue.shape[0],) * 2. - 1.;
                else:
                    break
            resultElementM = minRes.x;
            print(minRes.message, minRes.fun, minRes.success, minRes.nit);
        else:
            print(CostFunc(initialValue));
            resultElementM = initialValue;
    
        resultM = BuildMatrixFromElementM(resultElementM, folding);
    
        return resultM

def ExhaustiveCouplingMatrix(targetM, topology):
    N = targetM.shape[0] - 2
    H = IndexedBase('H', shape=(N * N,))
    
    P = sympy.zeros(N + 2, N + 2)
    P[0, 0] = 1.0
    P[-1, -1] = 1.0
    indexH = 0
    for i in np.arange(N):
        for j in np.arange(N):
            P[int(i+1),int(j+1)] = H[int(indexH)]
            indexH += 1
    
    PtMP = P.T * sympy.Matrix(targetM) * P
    
    polys = np.array([])
    for i in np.arange(N + 2):
        for j in np.arange(i + 1, N + 2):
            if np.abs(topology[i, j]) < 1.e-6:
                polys = np.append(polys, PtMP[i, j])
    
    unityArray = np.ones((1, N))
    UP = unityArray * P[1:-1, 1:-1]
    for i in np.arange(N):
        polys = np.append(polys, UP[0, i] - 1.0)
    
    HtH = P[1:-1, 1:-1].T * P[1:-1, 1:-1]
    for i in np.arange(N - 1):
        for j in np.arange(i + 1, N):
            polys = np.append(polys, HtH[i, j])
    
    polys = polys[polys!=0]

    solutionH = np.array(sympy.solve(list(sympy.groebner(polys, order='lex')), check=False))
    
    resultM = np.empty((solutionH.shape[0], N + 2, N + 2))
    resultRealM = np.empty((solutionH.shape[0], N + 2, N + 2))
    indexRealM = 0
    for i in np.arange(solutionH.shape[0]):
        evalP = sympy.matrix2numpy(P.evalf(subs=solutionH[i]))
        evalP /= (evalP * evalP).sum(axis=0)[np.newaxis, :]
        resultM[i, :, :] = evalP.T.dot(targetM).dot(evalP)
        if np.abs(np.amax(np.imag(resultM[i, :, :]))) < 1.e-6:
            resultRealM[indexRealM, :, :] = np.real(resultM[i, :, :])
            indexRealM += 1
    
    return resultRealM[:indexRealM, :, :]

def SerializeM(M):
    N = M.shape[0] - 2
    result = np.zeros((int((N + 3) * (N + 2) / 2), ))
    index = 0
    for i in np.arange(N + 2):
        for j in np.arange(N + 2 - i):
            result[index] = M[j, i + j]
            index += 1
    return result

def RotateM(M, i, j, cr, sr):
    R = np.eye(M.shape[0])
    R[i, i] = cr
    R[j, j] = cr
    R[i, j] = -sr
    R[j, i] = sr
    return R.dot(M).dot(R.T)

def EvaluateR(M, serializedT, cr, sr):
    N = M.shape[0] - 2
    tempEye = np.eye(N + 2)
    tempM = np.eye(N + 2)
    indexTheta = 0
    for j in np.arange(2, N + 1):
        for i in np.arange(1, j):
            tempEye[i, i] = cr[indexTheta]
            tempEye[j, j] = cr[indexTheta]
            tempEye[i, j] = -sr[indexTheta]
            tempEye[j, i] = sr[indexTheta]
            tempM = tempM.dot(tempEye)
            tempEye[i, i] = 1
            tempEye[j, j] = 1
            tempEye[i, j] = 0
            tempEye[j, i] = 0
            indexTheta += 1
    R = tempM
    RT = tempM.T
    MRotated = R.dot(M).dot(RT)
    r = SerializeM(MRotated)[serializedT == 0]
    return r, MRotated

def EvaluateJ(M, serializedT, cr, sr):
    N = M.shape[0] - 2
    numR = np.count_nonzero(1 - serializedT)
    numTheta = int(N * (N - 1) / 2)
    MDeriv = np.zeros((numTheta, N + 2, N + 2))

    tempEye = np.eye(N + 2)

    R1 = np.zeros((numTheta, N + 2, N + 2))
    R1T = np.zeros((numTheta, N + 2, N + 2))
    tempM = np.eye(N + 2)
    indexTheta = 0
    for j in np.arange(2, N + 1):
        for i in np.arange(1, j):
            R1[indexTheta, :, :] = tempM
            R1T[indexTheta, :, :] = tempM.T
            tempEye[i, i] = cr[indexTheta]
            tempEye[j, j] = cr[indexTheta]
            tempEye[i, j] = -sr[indexTheta]
            tempEye[j, i] = sr[indexTheta]
            tempM = tempM.dot(tempEye)
            tempEye[i, i] = 1
            tempEye[j, j] = 1
            tempEye[i, j] = 0
            tempEye[j, i] = 0
            indexTheta += 1
    R = tempM
    RT = tempM.T

    R2 = np.zeros((numTheta, N + 2, N + 2))
    R2T = np.zeros((numTheta, N + 2, N + 2))
    tempM = np.eye(N + 2)
    indexTheta = numTheta - 1
    for j in np.arange(N, 1, -1):
        for i in np.arange(j - 1, 0, -1):
            R2[indexTheta, :, :] = tempM
            R2T[indexTheta, :, :] = tempM.T
            tempEye[i, i] = cr[indexTheta]
            tempEye[j, j] = cr[indexTheta]
            tempEye[i, j] = -sr[indexTheta]
            tempEye[j, i] = sr[indexTheta]
            tempM = tempEye.dot(tempM)
            tempEye[i, i] = 1
            tempEye[j, j] = 1
            tempEye[i, j] = 0
            tempEye[j, i] = 0
            indexTheta -= 1
    
    tempZero = np.zeros((N + 2, N + 2))
    indexTheta = 0
    for j in np.arange(2, N + 1):
        for i in np.arange(1, j):
            tempZero[i, i] = -sr[indexTheta]
            tempZero[j, j] = -sr[indexTheta]
            tempZero[i, j] = -cr[indexTheta]
            tempZero[j, i] = cr[indexTheta]
            MDeriv[indexTheta, :, :] = R1[indexTheta, :, :].dot(tempZero).dot(R2[indexTheta, :, :]).dot(M).dot(RT) + R.dot(M).dot(R2T[indexTheta, :, :]).dot(tempZero.T).dot(R1T[indexTheta, :, :])
            tempZero[i, i] = 0
            tempZero[j, j] = 0
            tempZero[i, j] = 0
            tempZero[j, i] = 0
            indexTheta += 1
    J = np.zeros((numR, numTheta))
    indexT = 0
    indexR = 0
    for i in np.arange(N + 2):
        for j in np.arange(N + 2 - i):
            if serializedT[indexT] == 0:
                J[indexR, :] = MDeriv[:, j, i + j]
                indexR += 1
            indexT += 1

    MRotated = R.dot(M).dot(RT)
    r = SerializeM(MRotated)[serializedT == 0]
    return J, r, MRotated

def ReduceMAngleMethod(M, topology):
    N = M.shape[0] - 2
    serializedT = SerializeM(topology)
    serializedT[0] = 1
    serializedT[N + 1] = 1
    serializedT[-1] = 1
    numTheta = int(N * (N - 1) / 2)
    theta = np.zeros((numTheta, ))
    numIter = 10 + int(3600 / (N * N))
    cost = np.zeros((numIter, ))
    dumpFactor = 0.1
    v = 1.5
    
    for i in np.arange(numIter):
        cr = np.cos(theta)
        sr = np.sin(theta)
        J, r, MRotated = EvaluateJ(M, serializedT, cr, sr)
        costCurr = r.dot(r)
        cost[i] = costCurr
        if costCurr < 1e-8:
            break
        
        b = -J.T.dot(r)
        a1 = J.T.dot(J)
        a2 = np.diag(np.diag(a1))
        
        for j in np.arange(30):
            delta1 = np.linalg.solve(a1 + a2 * dumpFactor / v, b)
            r1 = EvaluateR(M, serializedT, np.cos(theta + delta1), np.sin(theta + delta1))[0]
            costCurr1 = r1.dot(r1)
            if costCurr1 < costCurr:
                if dumpFactor > 1e-9:
                    dumpFactor /= v
                theta += delta1
                break
            else:
                delta2 = np.linalg.solve(a1 + a2 * dumpFactor, b)
                r2 = EvaluateR(M, serializedT, np.cos(theta + delta2), np.sin(theta + delta2))[0]
                costCurr2 = r2.dot(r2)
                if costCurr2 < costCurr:
                    theta += delta2
                    break
            if (dumpFactor < 1e9):
                dumpFactor *= v
    
    MRotated = AdjustPrimaryCouple(MRotated)
    return MRotated

def RotateMReduce(M, pivotI, pivotJ, removeRow, removeCol, isComplex = False):
    if np.abs(M[removeRow, removeCol]) < 1e-12:
        return M

    if pivotI == removeRow:
        otherRow = pivotJ
        otherCol = removeCol
    elif pivotJ == removeRow:
        otherRow = pivotI
        otherCol = removeCol
    elif pivotI == removeCol:
        otherRow = removeRow
        otherCol = pivotJ
    elif pivotJ == removeCol:
        otherRow = removeRow
        otherCol = pivotI
    if np.abs(M[otherRow, otherCol]) < 1e-12:
        tr = 1e12
    elif (otherRow < removeRow) or (otherCol < removeCol):
        tr = -M[removeRow, removeCol] / M[otherRow, otherCol]
    else:
        tr = M[removeRow, removeCol] / M[otherRow, otherCol]
    cr = 1 / np.sqrt(1 + tr * tr)
    sr = tr * cr
    
    N = M.shape[0] - 2
    if isComplex == True:
        tempEye = np.eye(N + 2, dtype = complex)
    else:
        tempEye = np.eye(N + 2)
    tempEye[pivotI, pivotI] = cr
    tempEye[pivotJ, pivotJ] = cr
    tempEye[pivotI, pivotJ] = -sr
    tempEye[pivotJ, pivotI] = sr
    tempM = tempEye.dot(M).dot(tempEye.T)
    return tempM

def RotateMEqual(M, row, col, isComplex = False):
    if np.abs(M[row, col] - M[row - 1, col - 1]) < 1e-12:
        return M

    if np.abs(M[row - 1, col - 2] + M[row + 1, col]) < 1e-12:
        tr = 1e12
    else:
        tr = (M[row, col] - M[row - 1, col - 1]) / (M[row - 1, col - 2] + M[row + 1, col])
    cr = 1 / np.sqrt(1 + tr * tr)
    sr = tr * cr

    pivotI = row
    pivotJ = col - 1

    N = M.shape[0] - 2
    if isComplex == True:
        tempEye = np.eye(N + 2, dtype = complex)
    else:
        tempEye = np.eye(N + 2)
    tempEye[pivotI, pivotI] = cr
    tempEye[pivotJ, pivotJ] = cr
    tempEye[pivotI, pivotJ] = -sr
    tempEye[pivotJ, pivotI] = sr
    tempM = tempEye.dot(M).dot(tempEye.T)
    return tempM

def RotateM2Arrow(M, isComplex = False):
    N = M.shape[0] - 2
    MRotated = M.copy()
    for i in np.arange(N):
        for j in np.arange(N, i + 1, -1):
            MRotated = RotateMReduce(MRotated, i + 1, j, i, j, isComplex = isComplex)
    MRotated = AdjustPrimaryCouple(MRotated)
    return MRotated

def AdjustPrimaryCouple(M):
    N = M.shape[0] - 2
    MRotated = M.copy()
    for i in np.arange(N + 1):
        if MRotated[i, i + 1] < 0:
            MRotated[i + 1, :] *= -1
            MRotated[:, i + 1] *= -1
    return MRotated
            
def RotateArrow2Folded(M, topology):
    N = M.shape[0] - 2
    MRotated = M
    tempM = M
    point = np.sum(np.abs(tempM[topology == 0]))
    if np.abs(point) < 1e-4:
        return MRotated, point
    for i in np.arange(N - 1, -(N - 2), -1):
        for j in np.arange(int(1 + (N - 1 - i) / 2)):
            row = i + j
            col = N + 1 - j
            if (row > 0) and (np.abs(tempM[row, col]) > 1e-6):
                tempM = RotateMReduce(tempM, row, col - 1, row, col)
                newpoint = np.sum(np.abs(tempM[topology == 0]))
                if newpoint < point:
                    point = newpoint
                    MRotated = tempM
                if np.abs(newpoint) < 1e-4:
                    return AdjustPrimaryCouple(MRotated), newpoint

    return AdjustPrimaryCouple(MRotated), point

def MoveZero(M, startRow, stopRow, w):
    N = M.shape[0] - 2
    MRotated = M.astype(complex)
    tempEye = np.eye(N + 2, dtype = complex)

    if np.abs(w + M[startRow + 1, startRow + 1]) < 1e-9:
        tr = 1e9
    else:
        tr = M[startRow, startRow + 1] / (w + M[startRow + 1, startRow + 1])
    cr = 1 / np.sqrt(1 + tr * tr)
    sr = tr * cr
    tempEye[startRow, startRow] = cr
    tempEye[startRow + 1, startRow + 1] = cr
    tempEye[startRow, startRow + 1] = -sr
    tempEye[startRow + 1, startRow] = sr
    MRotated = tempEye.dot(MRotated).dot(tempEye.T)
    for i in np.arange(startRow - 1, stopRow, -1):
        MRotated = RotateMReduce(MRotated, i, i + 1, i, i + 2, isComplex = True)
    return MRotated

def RotateArrow2CTCQ(M, topology, tranZeros):
    N = M.shape[0] - 2
    indexZeros = 0
    MRotated = M.copy()
    point = np.sum(np.abs(MRotated[topology == 0]))
    for i in np.arange(N):
        if (i + 4 < N + 2) and np.any(topology[i, i + 4:]) :
            break
        if (i + 3 < N + 2) and (topology[i, i + 3] == 1):
            if (i > 0) and np.any(topology[i - 1, i + 1:]):
                break
            if (i + 4 < N + 2) and (np.any(topology[i, i + 4:]) or np.any(topology[i + 1, i + 4:])):
                break
            if (i + 2 < N) and (i + 4 < N + 2) and np.any(topology[i + 2, i + 4:]):
                break
            if indexZeros < len(tranZeros):
                MRotated = MoveZero(MRotated, N - 1, i, -1j * tranZeros[indexZeros])
                point = np.sum(np.abs(MRotated[topology == 0]))
                indexZeros += 1
            if indexZeros < len(tranZeros):
                MRotated = MoveZero(MRotated, N - 1, i + 1, -1j * tranZeros[indexZeros])
                point = np.sum(np.abs(MRotated[topology == 0]))
                indexZeros += 1
            if topology[i, i + 2] == 0:
                MRotated = RotateMReduce(MRotated, i + 1, i + 2, i, i + 2, isComplex = True)
                point = np.sum(np.abs(MRotated[topology == 0]))
            if topology[i + 1, i + 3] == 0:
                MRotated = RotateMReduce(MRotated, i + 1, i + 2, i + 1, i + 3, isComplex = True)
                point = np.sum(np.abs(MRotated[topology == 0]))
            if (topology[i, i + 2] == 1) and (topology[i + 1, i + 3] == 1):
                MRotated = RotateMEqual(MRotated, i + 1, i + 3, isComplex = True)
                point = np.sum(np.abs(MRotated[topology == 0]))
            if indexZeros > len(tranZeros) - 1:
                break
        if (i + 2 < N + 2) and (topology[i, i + 2] == 1) and (topology[i, i + 3] != 1):
            if (i > 0) and np.any(topology[i - 1, i + 3:]):
                break
            if (i + 4 < N + 2) and np.any(topology[i, i + 4:]):
                break
            if (i + 1 < N) and (i + 3 < N + 2) and np.any(topology[i + 1, i + 3:]):
                break
            if (i > 0) and (topology[i - 1, i + 2] == 1):
                continue
            if indexZeros < len(tranZeros):
                MRotated = MoveZero(MRotated, N - 1, i, -1j * tranZeros[indexZeros])
                point = np.sum(np.abs(MRotated[topology == 0]))
                indexZeros += 1
            if indexZeros > len(tranZeros) - 1:
                break
    return AdjustPrimaryCouple(np.real(MRotated)), point

def FPE2MComprehensive(epsilon, epsilonE, coefF, coefP, rootE, topology, refRootP, method = 1):
    N = len(rootE)
    transversalMatrix = FPE2M(epsilon, epsilonE, coefF, coefP, rootE, method = method)
    arrowMatrix = RotateM2Arrow(transversalMatrix)
    rootP = Polynomial(coefP).roots()
    rootP_perm = np.array([x for x in itertools.permutations(rootP)])
    deltaRootP = np.sum(np.abs(rootP_perm - refRootP), axis=1)
    rootP = rootP_perm[np.argmin(deltaRootP)]
    ctcqMatrix, ctcqPoint = RotateArrow2CTCQ(arrowMatrix, topology, rootP)
    if np.abs(ctcqPoint) < N * N * 1e-5:
        MRotated = ctcqMatrix
        MRotated[topology == 0] = 0
        if len(coefP) > 1:
            message = "CTCQ detected!"
        else:
            message = "Chebyshev detected!"
    else:
        foldedMatrix, foldedPoint = RotateArrow2Folded(arrowMatrix, topology)
        if np.abs(foldedPoint) < N * N * 1e-5:
            MRotated = foldedMatrix
            MRotated[topology == 0] = 0
            message = "Folded detected!"
        elif ctcqPoint < foldedPoint:
            MRotated = ReduceMAngleMethod(ctcqMatrix, topology)
            message = "Optimized."
        else:
            MRotated = ReduceMAngleMethod(foldedMatrix, topology)
            message = "Optimized."
    MRotated[np.abs(MRotated) < 1e-5] = 0.0
    return MRotated, message

def CoarseModelUpdate(dimension, extractedMatrix, topology, isSymmetric):
    N = topology.shape[0] - 2
    seqM = np.zeros((N + 2, N + 2), dtype = int) - 1
    index = 0
    for i in np.arange(N + 2):
        for j in np.arange(N + 2 - i):
            if (topology[j, j + i] == 1) and not (isSymmetric and (j + j + i) > (N + 1)):
                seqM[j, j + i] = index
                index += 1
                
    numDim = dimension.shape[1]
    impactM = np.zeros((numDim, numDim), dtype = int)
    for i in np.arange(N + 2):
        if seqM[i, i] != -1:
            impactM[seqM[i, i], seqM[i, i]] = 1
#            for j in np.arange(N + 2):
#                if seqM[i, j] != -1:
#                    impactM[seqM[i, j], seqM[i, i]] = 1
#                if seqM[j, i] != -1:
#                    impactM[seqM[j, i], seqM[i, i]] = 1
                    
    for i in np.arange(1, N + 2):
        for j in np.arange(N + 2 - i):
            if seqM[j, j + i] != -1:
                impactM[seqM[j, j + i], seqM[j, j + i]] = 1
                if seqM[j, j] != -1:
                    impactM[seqM[j, j], seqM[j, j + i]] = 1
                if seqM[j + i, j + i] != -1:
                    impactM[seqM[j + i, j + i], seqM[j, j + i]] = 1
                elif seqM[N + 1 - j - i, N + 1 - j - i] != -1:
                    impactM[seqM[N + 1 - j - i, N + 1 - j - i], seqM[j, j + i]] = 1
    
#    A = np.zeros((numDim * dimension.shape[0], np.sum(impactM) + numDim))
#    B = extractedMatrix.reshape(numDim * dimension.shape[0])
#    for i in np.arange(dimension.shape[0]):
#        index = 0
#        for j in np.arange(numDim):
#            tempL = np.sum(impactM[j])
#            A[i * numDim + j, index : index + tempL] = dimension[i, impactM[j] == 1]
#            index += tempL
#            A[i * numDim + j, j - numDim] = 1.0
#    
#    x, residuals = np.linalg.lstsq(A, B)[0 : 2]
#    slopeM = np.zeros((numDim, numDim))
#    index = 0
#    for i in np.arange(numDim):
#        for j in np.arange(numDim):
#            if impactM[i, j] == 1:
#                slopeM[i, j] = x[index]
#                index += 1
#    intepM = x[index:]
#    invSlopeM = np.linalg.inv(slopeM)
    slopeM = np.zeros((numDim, numDim))
    for i in np.arange(numDim):
        slopeM[:, i] = (extractedMatrix[i + 1] - extractedMatrix[0]) / (dimension[i + 1, i] - dimension[0, i])
    slopeM *= impactM
    invSlopeM = np.linalg.inv(slopeM)
    intepM = extractedMatrix[0] - slopeM.dot(dimension[0])
    #intepM + (slopeM.dot(dimension.T)).T - extractedMatrix
    
    return slopeM, invSlopeM, intepM