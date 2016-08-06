# -*- coding: utf-8 -*-
"""
Spyder Editor

This is a temporary script file.
"""

import time, cProfile, pstats, io
import CP
import numpy as np
from numpy.polynomial import Polynomial
from scipy import optimize, interpolate, signal, sparse
import matplotlib.pyplot as plt

rootP = np.array([1.0900j, 1.1691j, 1.5057j]) #np.array([-2j, 2j])
N = 7
returnLoss= 22
#epsilon, coefP, coefF, coefE = CP.ChebyshevP2EF(rootP, N, returnLoss)

U = 1.
V = 0.

for k in np.arange(0, N):
    tempU = U;
    tempV = V;
    if k < len(rootP):
        a = Polynomial([-1j / rootP[k], 1])
        b = np.sqrt(1 + 1 / (rootP[k] * rootP[k]))
    else:
        a = Polynomial([0., 1.])
        b = 1.
    U = a * tempU + b * Polynomial([-1, 0, 1]) * tempV;
    V = a * tempV + b * tempU;

rootF = np.real(U.roots()) * 1j; # w domain to s domain
polyF = Polynomial.fromroots(rootF)

if len(rootP) == 0:
    polyP = Polynomial([1])
else:
    polyP = Polynomial.fromroots(rootP)

epsilon = polyP(1j) / (polyF(1j) * np.sqrt(10 ** (np.abs(returnLoss) / 10) - 1))
#epsilon = np.abs(epsilon)

#temp1 = (len(polyF) + len(polyP) + 1) % 4
#temp2 = polyF + (1j) ** temp1 * polyP / np.abs(epsilon)
#rootE = temp2.roots()
#rootE = -np.abs(np.real(rootE)) + 1j * np.imag(rootE)
rootE = CP.FP2E(epsilon, rootF, rootP);

def costFunc(s, c, rootP, N):
    temp1 = np.array([np.arccos(1j * (x + (1 + x * x) / (s[0] + 1j * s[1] - x))) for x in rootP])
    temp2 = np.sum(temp1) + (N - len(rootP)) * np.arccos(-1j * s[0] + s[1]) - c
    return np.array([np.real(temp2), np.imag(temp2)])

def jacobFunc(s, c, rootP, N):
#    temp1 = np.array([np.arccos(1j * (x + (1 + x * x) / (s[0] + 1j * s[1] - x))) for x in rootP])
#    temp2 = np.sum(temp1) + (N - len(rootP)) * np.arccos(-1j * s[0] + s[1]) - c
    temp3 = np.array([(-1 / np.sqrt(1 +  (x + (1 + x * x) / (s[0] + 1j * s[1] - x)) ** 2)) * (-1j * (1 + x * x) / ((s[0] + 1j * s[1] - x) * (s[0] + 1j * s[1] - x))) for x in rootP])
    temp4 = np.sum(temp3) + (N - len(rootP)) * (1j / np.sqrt(1 + (s[0] + 1j * s[1]) ** 2))
#    temp5 = temp4 * temp2.conj()
    return np.array([[np.real(temp4), -np.imag(temp4)], [np.imag(temp4), np.real(temp4)]])

#temp1 = np.arccos(1j / np.abs(epsilon / 2 ** (N - 1 - 0.2)))
#temp2 = np.hstack((temp1 + np.arange(N) * np.pi, np.pi - temp1 + np.arange(N) * np.pi))
#result = np.array([optimize.root(fun=costFunc, x0=[0, 0], args=(x, rootP, N), jac=jacobFunc, method='hybr') for x in temp2])
#result2 = np.array([x.x[0] + 1j * x.x[1] for x in result])
#rootE1 = result2[np.real(result2) < 0]
#rootE = rootE1
#plt.clf()
#plt.plot(np.real(rootE), np.imag(rootE), '*')
#plt.plot(np.real(rootE1), np.imag(rootE1), '+')

#aaa = np.arange(0.1, 3, 0.1) * 1j
#iter = 14
#cost = np.zeros((iter,))
#rootE1 = rootE.copy()
#tempJ = np.zeros((len(aaa), len(rootE1)), dtype=complex)
#for i in np.arange(iter):
#    polyE1 = Polynomial.fromroots(rootE1)
#    polyEResult = polyE1(aaa)
#    r = polyEResult * polyEResult.conj() - polyF(aaa) * polyF(aaa).conj() - polyP(aaa) * polyP(aaa).conj() / (epsilon * epsilon.conj())
#    r = np.real(r)
#    for m in np.arange(len(aaa)):
#        for n in np.arange(len(rootE1)):
#            tempJ[m, n] = -polyE1(aaa[m]) * polyE1(aaa[m]).conj() / (aaa[m] - rootE1[n])
#    J = 2 * np.hstack((np.real(tempJ), -np.imag(tempJ)))
#    delta = -0.8 * np.linalg.solve(J.T.dot(J), J.T.dot(r))
#    rootE1 += delta[:N] + 1j * delta[N:]
#    rootE1 = -np.abs(np.real(rootE1)) + 1j * np.imag(rootE1)
#    cost[i] = r.dot(r)

#rootE = rootE1.copy()
polyE = Polynomial.fromroots(rootE);


normalizedFreq = np.arange(-5.5, 5.5, 0.01)
#polyF = Polynomial(coefF)
#polyE = Polynomial(coefE)
#rootF = polyF.roots()
#rootE = polyE.roots()
epsilonE = epsilon
S11_old, S21_old = CP.FPE2S(epsilon, epsilonE, rootF, rootP, rootE, normalizedFreq - 50j / 100000)
#print(rootF)
#print(rootP)
#print(rootE)


topology = np.eye(N + 2, dtype=int)
topology[0, 0] = 0
topology[-1, -1] = 0
for i in np.arange(N + 1):
    topology[i, i + 1] = 1
    topology[i + 1, i] = 1
topology[1, 3] = 1
topology[3, 1] = 1
topology[1, 4] = 1
topology[4, 1] = 1
topology[4, 6] = 1
topology[6, 4] = 1
#topology[3, 5] = 1
#topology[5, 3] = 1
#topology[5, 7] = 1
#topology[7, 5] = 1
#topology[8, 10] = 1
#topology[10, 8] = 1
#topology[9, 11] = 1
#topology[11, 9] = 1
#topology[7, 9] = 1
#topology[9, 7] = 1

polyE = Polynomial.fromroots(rootE)
polyF = Polynomial.fromroots(rootF)
if len(rootP) > 0:
    polyP = Polynomial.fromroots(rootP)
else:
    polyP = Polynomial([1.])

N = len(rootF)
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
if len(rootP) < len(rootF):
    C = Polynomial(C.coef[:-2])

if (len(rootF) - len(rootP)) % 2 == 0:
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
    
    tempA = A
    tempB = B
    A = -1j * C
    B = -1j * D
    C = -1j * tempA
    D = -1j * tempB        

if np.sum(np.abs(B.coef)) > 1e-9:
    sCJB.append(D // B)
else:
    sCJB.append(Polynomial([0.0]))

B = np.imag([x.coef[0] for x in sCJB])
C = np.real([x.coef[1] if len(x.coef) > 1 else 1.0 for x in sCJB])

M = np.zeros((N + 2, N + 2))
for i in np.arange(N + 2):
    M[i, i] = B[i] / C[i]
for i in np.arange(N):
    M[i, i + 1] = 1 / np.sqrt(C[i] * C[i + 1])
    M[i + 1, i] = M[i, i + 1]

M[:-1, -1] = J / np.sqrt(C[:-1] * C[-1])
M[-1, :-1] = M[:-1, -1]

M[np.abs(M) < 1e-5] = 0.0
print("Transversal M: \n", np.round(M, 2), "\n")

M = CP.FPE2M(epsilon, epsilonE, rootF, rootP, rootE, method=3)

#for i in np.arange(0, 4):
#    for j in np.arange(4, 7):
#        M[i, j] *= -1
#        M[j, i] = M[i, j]

#print("Transversal M: \n", np.round(M, 2), "\n")

S21, S11 = CP.CM2S(M, normalizedFreq)

plt.clf()
plt.subplot(1, 2, 1)
plt.plot(normalizedFreq, 20*np.log10(np.abs(S11_old)), 'o');
plt.plot(normalizedFreq, 20*np.log10(np.abs(S11)), '*');
plt.title('S11(dB)')
plt.subplot(1, 2, 2)
plt.plot(normalizedFreq, 20*np.log10(np.abs(S21_old)), 'o');
plt.plot(normalizedFreq, 20*np.log10(np.abs(S21)), '*');
plt.title('S21(dB)')
plt.draw()


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


def RotateMReduce(M, pivotI, pivotJ, removeRow, removeCol, isComplex = False):
    if np.abs(M[removeRow, removeCol]) < 1e-9:
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
    if np.abs(M[otherRow, otherCol]) < 1e-9:
        tr = 1e9
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

def RotateM2Arrow(M):
    N = M.shape[0] - 2
    MRotated = M.copy()
    for i in np.arange(N):
        for j in np.arange(N, i + 1, -1):
            MRotated = RotateMReduce(MRotated, i + 1, j, i, j)
    for i in np.arange(N + 1):
        if MRotated[i, i + 1] < 0:
            MRotated[i + 1, :] *= -1
            MRotated[:, i + 1] *= -1
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
            MRotated = MoveZero(MRotated, N - 1, i, -1j * tranZeros[indexZeros])
            point = np.sum(np.abs(MRotated[topology == 0]))
            indexZeros += 1
            if indexZeros > len(tranZeros) - 1:
                break
    return AdjustPrimaryCouple(np.real(MRotated)), point



M = np.real(M)


pr = cProfile.Profile()
pr.enable()

#resultM = CP.FPE2MComprehensive(epsilon, epsilonE, rootF, rootP, rootE, topology)
#print(np.round(resultM, 2), "\n")

arrowM = RotateM2Arrow(M)
print(np.round(arrowM, 2))
tranZeros = rootP
#foldedM, foldedPoint = RotateArrow2Folded(arrowM, topology)
#print(np.round(np.real(foldedM), 4), "folded point:", foldedPoint, "\n")
#ctcqM, ctcqPoint = RotateArrow2CTCQ(arrowM, topology, tranZeros)
#print(np.round(np.real(ctcqM), 2), "ctcq point:", ctcqPoint, "\n")
#print("ctcq point:", ctcqPoint, "\n")
#foldedM, point = RotateArrow2Folded(arrowM, topology)
#print(np.round(M, 2), "\n")
#print(np.round(foldedM, 2))
#if np.abs(point) < 1e-4:
#    MRotated = foldedM
#    print("folded M found")
#else:
#    M = np.real(foldedM)
#    serializedT = SerializeM(topology)
#    serializedT[0] = 1
#    serializedT[N + 1] = 1
#    serializedT[-1] = 1
#    numTheta = int(N * (N - 1) / 2)
#    theta = np.zeros((numTheta, ))
#    numIter = 10 + int(3600 / (N * N))
#    cost = np.zeros((numIter, ))
#    dumpFactor = 0.1
#    v = 1.5
#    
#    for i in np.arange(numIter):
#        cr = np.cos(theta)
#        sr = np.sin(theta)
#        J, r, MRotated = EvaluateJ(M, serializedT, cr, sr)
#        costCurr = r.dot(r)
#        cost[i] = costCurr
#        if costCurr < 1e-8:
#            break
#        
#        b = -J.T.dot(r)
#        a1 = J.T.dot(J)
#        a2 = np.diag(np.diag(a1))
#        
#        for j in np.arange(30):
#            delta1 = np.linalg.solve(a1 + a2 * dumpFactor / v, b)
#            r1 = EvaluateR(M, serializedT, np.cos(theta + delta1), np.sin(theta + delta1))[0]
#            costCurr1 = r1.dot(r1)
#            if costCurr1 < costCurr:
#                if dumpFactor > 1e-9:
#                    dumpFactor /= v
#                theta += delta1
#                break
#            else:
#                delta2 = np.linalg.solve(a1 + a2 * dumpFactor, b)
#                r2 = EvaluateR(M, serializedT, np.cos(theta + delta2), np.sin(theta + delta2))[0]
#                costCurr2 = r2.dot(r2)
#                if costCurr2 < costCurr:
#                    theta += delta2
#                    break
#            dumpFactor *= v
#    
#    MRotated = AdjustPrimaryCouple(MRotated)

pr.disable()
s = io.StringIO()
sortby = 'cumulative'
ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
ps.print_stats()
#print(s.getvalue())

#print(np.round(MRotated, 2))
#plt.clf()
#plt.plot(cost)


