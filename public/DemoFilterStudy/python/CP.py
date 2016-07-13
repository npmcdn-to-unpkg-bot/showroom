import numpy as np
from numpy.polynomial import Polynomial
from scipy import optimize, interpolate, signal, sparse
#import matplotlib.pyplot as plt
#import sympy
#from sympy.tensor import IndexedBase, Idx
import tempfile

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

    rootF = U.roots() * 1j; # w domain to s domain
    polyF = Polynomial.fromroots(rootF)

    if len(rootP) == 0:
        polyP = Polynomial([1])
    else:
        polyP = Polynomial.fromroots(rootP)

    epsilon = polyP(1j) / (polyF(1j) * np.sqrt(10 ** (np.abs(returnLoss) / 10) - 1))
    rootE = FP2E(epsilon, rootF, rootP);
    polyE = Polynomial.fromroots(rootE);
    return epsilon, polyP.coef, polyF.coef, polyE.coef
    
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

#        Y1, info = sparse.linalg.gmres(Z, np.append(np.array([1.]), np.zeros((N - 1,))))
#        S11[k] = 1. + 2j * R1 * Y1[0];
#        S21[k] = -2j * np.sqrt(R1 * RN) * Y1[-1];


    return S21, S11

def FP2E(epsilon, rootF, rootP):
    polyF = Polynomial.fromroots(rootF)
    if rootF.shape[0] % 2 == 0:
        polyFminus = Polynomial.fromroots(-np.conj(rootF)) # polyF(-s)
#        polyFminus = Polynomial.fromroots(-rootF) # polyF(-s)
    else:
        polyFminus = -Polynomial.fromroots(-np.conj(rootF))
#        polyFminus = -Polynomial.fromroots(-rootF)
    if len(rootP) == 0:
        polyP = Polynomial([1])
        polyPminus = Polynomial([1])
    else:
        polyP = Polynomial.fromroots(rootP)
        if len(rootP) % 2 == 0:
            polyPminus = Polynomial.fromroots(-np.conj(rootP))
#            polyPminus = Polynomial.fromroots(-rootP)
        else:
            polyPminus = -Polynomial.fromroots(-np.conj(rootP))
#            polyPminus = -Polynomial.fromroots(-rootP)
    E2 = polyF * polyFminus + polyP * polyPminus / (np.abs(epsilon) * np.abs(epsilon))
    rootE2 = E2.roots()
#    rootE = rootE2[(np.real(rootE2) < 0) & (np.abs(np.real(rootE2)) > 1.e-9)]
    rootE = rootE2[np.real(rootE2) < -1.e-9]
    return rootE

def FPE2S(epsilon, epsilonE, rootF, rootP, rootE, normalizedFreq):
    polyF = epsilon * Polynomial.fromroots(rootF)
    if len(rootP) == 0:
        polyP = Polynomial([1])
    else:
        polyP = Polynomial.fromroots(rootP)
    
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

def S2FP(inFreq, inS21, inS11, filterOrder, w1, w2, wga, wgb=0.1, method=0):
    def RectifyInputData(inFreq, inS21, inS11):
        widths = np.arange(5, 45)
        sig = -20. * np.log10(np.abs(inS11))
        sig[sig<3.] = 0.
        peakIndS11Inv = signal.find_peaks_cwt(sig, widths, min_length=widths.shape[0] - 1)
        sig = -20. * np.log10(np.abs(inS21))
        peakIndS21Inv = signal.find_peaks_cwt(sig, widths, min_length=widths.shape[0] - 1)
        sig = 20. * np.log10(np.abs(inS21))
        peakIndS21 = signal.find_peaks_cwt(sig, widths, min_length=widths.shape[0] - 1)
#        bandIndS21 = np.nonzero((np.abs(np.gradient(np.abs(inS11))) / (inFreq[1] - inFreq[0])) > 1.7e-8)[0]
        bandIndS21 = FindEdge(inS21)
#        print(inFreq[int(bandIndS21[:])])
        temp1 = np.hstack((peakIndS11Inv, peakIndS21Inv, peakIndS21, bandIndS21))
        temp2 = temp1[(temp1 > 10) & (temp1 < inFreq.shape[0] - 10)]
        indexMin = int(np.max([np.min(temp2) - 5, 0]))
        indexMax = int(np.min([np.max(temp2) + 5, inFreq.shape[0]-1]))
#        indexMin, indexMax = 880, 3500
        step = np.max([int((indexMax - indexMin) / 400), 1])
        temp1 = np.arange(indexMin, indexMax, step, dtype=int)
#        temp1 = np.arange(0, 400)
        print(inFreq[temp1[0]], inFreq[temp1[-1]])
        freq, S21, S11 = inFreq[temp1], inS21[temp1], inS11[temp1]
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

    def GetEpsilonRootE(rootF, rootP, S11, S21, normalizedFreq, Qu=5000., epsilon=1.e10):
        polyF = Polynomial.fromroots(rootF)
        if len(rootP) == 0:
            polyP = Polynomial([1])
        else:
            polyP = Polynomial.fromroots(rootP)
        if np.abs(epsilon) > 1.e9:
#            tempIndex = np.argmin(np.abs(normalizedFreq - 1.0))
#            epsilon = ((S11[tempIndex] / S21[tempIndex]) * polyP(1j * normalizedFreq[tempIndex] + 1./Qu) / polyF(1j * normalizedFreq[tempIndex] + 1./Qu)) # polyP(1./Qu) / polyF(1./Qu) is very close to polyP(0) / polyF(0)
            nF = rootF.shape[0]
            nP = len(rootP)
            M = np.hstack((np.diag(S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True).dot(np.array([polyF.coef]).T)), -np.diag(S11).dot(np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True).dot(np.array([polyP.coef]).T))))
            V = np.linalg.svd(M)[2]
            temp1 = np.conj(V[-1, :]) # b
            epsilon = temp1[0] / temp1[1]
        rootE = FP2E(epsilon, rootF, rootP)
        polyE = Polynomial.fromroots(rootE)
#        tempIndex = np.argmin(np.abs(normalizedFreq - 1.0))

#        temp1 = polyF(1j * normalizedFreq[tempIndex] + 1./Qu) / (polyE(1j * normalizedFreq[tempIndex] + 1./Qu) * S11[tempIndex])
#        temp2 = np.array([1., 1.j, -1., -1.j])
#        temp3 = temp2[np.argmin(np.abs(np.angle(temp1 / temp2)))]
#        epsilonE = epsilon * temp3
        nF = rootF.shape[0]
        nP = len(rootP)
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
        tempEqn = lambda x: np.abs(polyP(1j * normalizedFreq[tempIndex] + 1. / x)) - np.abs(S21[tempIndex] * epsilonE * polyE(1j * normalizedFreq[tempIndex] + 1. / x))
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
        epsilon, rootE = GetEpsilonRootE(rootF, rootP, S11, S21, normalizedFreq, Qu)
        S11fromFP, S21fromFP = FPE2S(epsilon, epsilonE, rootF, rootP, rootE, normalizedFreq - 1.j / Qu);
        
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
            epsilon, epsilonE, Qu, rootF, rootP, rootE = S2FP(freq, S21, S11, filterOrder, w1, w2, wga, wgb=0.1, method=1)
            initialValue = SerializeFP(rootF, rootP)[0]
        return initialValue

    freq, S21, S11 = RectifyInputData(inFreq, inS21, inS11)
    normalizedFreq = NormalizeFreq(freq, w1, w2);
    cutoffFrequency = 299792458. / (2. * wga);
    Qu = 5000.e6 # initial Qu value
    
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
        epsilon, epsilonE, rootE = GetEpsilonRootE(rootF, rootP, S11, S21, normalizedFreq, Qu)
    elif (method == 1) or (method == 2):
        rootF, rootP = DeserializeFP(np.arange(filterOrder.shape[0] * 2), filterOrder)
        nF = rootF.shape[0]
        nP = len(rootP)
        for i in np.arange(0, 2):
            if (method == 2): # increase order
                originalNF = nF
                nF += int(0.49 * nF)
#            M = np.hstack((np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True), -np.diag(S11 / S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True))))
            M = np.hstack((np.diag(S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True)), -np.diag(S11).dot(np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True))))
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
                M = np.hstack((np.diag(S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True)), -np.diag(S11).dot(np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True).dot(np.array([coefP]).T))))
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
        epsilon, epsilonE, rootE = GetEpsilonRootE(rootF, rootP, S11, S21, normalizedFreq, Qu, epsilon)
    elif method == 3:
        rootF, rootP = DeserializeFP(np.arange(filterOrder.shape[0] * 2), filterOrder)
        nF = rootF.shape[0]
        nP = len(rootP)
        for i in np.arange(0, 2):
            M = np.hstack((np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True), -np.diag(S11 / S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True))))
#            M = np.hstack((np.diag(S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True)), -np.diag(S11).dot(np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True))))
            Q, R = np.linalg.qr(M, mode='complete')
            R11 = R[:nF+1, :nF+1]
            R12 = R[:nF+1, nF+1:]
            R22 = R[nF+1:, nF+1:]
            V = np.linalg.svd(R22)[2]
            coefP = np.conj(V[-1, :]) # b
            rootP = Polynomial(coefP).roots()
#            coefF = -np.linalg.inv(R11).dot(R12.dot(coefP))
#            rootF = Polynomial(coefF).roots()
#            if (method == 2): # decrease order
#                nF = originalNF
            bandIndS21 = FindEdge(S21)
            temp1 = np.ones((S21.shape[0],))
#            for j in bandIndS21:
#                temp1[j - 10 : j + 10] = 0.5e-2
#            for j in rootP:
#                tempIndex = np.argmin(np.abs(normalizedFreq - np.imag(j)))
#                temp1[tempIndex - 10 : tempIndex + 10] = 0.2e-4 / np.abs(S21[tempIndex])
            M = np.diag(temp1).dot(np.hstack((np.diag(S21).dot(np.vander(1j * normalizedFreq + 1./Qu, nF+1, increasing=True)), -np.diag(S11).dot(np.vander(1j * normalizedFreq + 1./Qu, nP+1, increasing=True).dot(np.array([coefP]).T)))))
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
        epsilon, epsilonE, rootE = GetEpsilonRootE(rootF, rootP, S11, S21, normalizedFreq, Qu, epsilon)
#        epsilon, epsilonE, rootE = GetEpsilonRootE(rootF, rootP, S11, S21, normalizedFreq, Qu)

#        epsilon, epsilonE, rootE = GetEpsilonRootE(rootF, rootP, S11, S21, normalizedFreq, Qu)
    Qu = GetQu(epsilon, epsilonE, Qu, rootF, rootP, rootE, S11, S21, normalizedFreq)
    print('epsilon:', epsilon)
    print('epsilonE:', epsilonE)
    print('Qu:', Qu)
    print('rootF:', rootF)
    print('rootP:', rootP)
    print('rootE:', rootE)
    return epsilon, epsilonE, Qu, rootF, rootP, rootE

def FPE2M(epsilon, epsilonE, rootF, rootP, rootE, method=1):
    if method == 1:
    #    EF = Polynomial.fromroots(rootE).coef + np.exp(1j * np.pi * 180 / 180) * (epsilon / epsilonE) * Polynomial.fromroots(rootF).coef
        EF = Polynomial.fromroots(rootE).coef + np.abs(epsilon / epsilonE) * Polynomial.fromroots(rootF).coef
        realEF = np.real(EF)
        imagEF = np.imag(EF)
        
        N = rootF.shape[0]
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
        if len(rootP) > 0:
            coefP = Polynomial.fromroots(rootP).coef
        else:
            coefP = np.array([1.])
        y21n = -1j *  coefP / np.abs(epsilonE)
    
        y21n /= yd[-1]
        y22n /= yd[-1]
        yd /= yd[-1]
    
        r21k, lambdak, k21 = signal.residue(y21n[-1::-1], yd[-1::-1])
        r22k, lambdak, k22 = signal.residue(y22n[-1::-1], yd[-1::-1])

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
        M[0, 1:-1] = Msk
        M[1:-1, 0] = Msk
        M[-1, 1:-1] = Mlk
        M[1:-1, -1] = Mlk
        
        return M#np.real(M)

    elif method == 2:
        initM = GetTopology(rootF.shape[0])
        initialValue, folding = ExtractElementMFromMatrix(initM);
    
        specialFreq = np.array([-1., 0., 1.])
        S11atSpecialFreq, S21atSpecialFreq = FPE2S(epsilon, epsilonE, rootF, rootP, rootE, specialFreq)

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
