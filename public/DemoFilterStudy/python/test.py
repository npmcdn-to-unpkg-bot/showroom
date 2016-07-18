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

rootP = np.array([1.5j]) #np.array([-2j, 2j])
N = 6
returnLoss= 20.0
epsilon, coefP, coefF, coefE = CP.ChebyshevP2EF(rootP, N, returnLoss)

normalizedFreq = np.arange(-5.5, 5.5, 0.01)
polyF = Polynomial(coefF)
polyE = Polynomial(coefE)
rootF = polyF.roots()
rootE = polyE.roots()
epsilonE = epsilon
S11_old, S21_old = CP.FPE2S(epsilon, epsilonE, rootF, rootP, rootE, normalizedFreq)
#print(rootF)
#print(rootP)
#print(rootE)


topology = np.eye(N + 2)
topology[0, 0] = 0
topology[-1, -1] = 0
for i in np.arange(N + 1):
    topology[i, i + 1] = 1
    topology[i + 1, i] = 1
#topology[2, 5] = 1
topology[3, 5] = 1

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
#y21n = -1j *  coefP / epsilonE
y21n = -coefP / np.abs(epsilonE) + 0j

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

if np.abs(np.imag(Msk[0])) > np.abs(np.real(Msk[0])):
    Msk *= 1j
            
M[0, 1:-1] = Msk
M[1:-1, 0] = Msk
M[-1, 1:-1] = Mlk
M[1:-1, -1] = Mlk

#print(np.round(np.real(M), 2))

#plt.clf()
#plt.subplot(1, 2, 1)
#plt.plot(normalizedFreq, 20*np.log10(np.abs(S11)), 'o');
#plt.title('S11(dB)')
#plt.subplot(1, 2, 2)
#plt.plot(normalizedFreq, 20*np.log10(np.abs(S21)), 'o');
#plt.title('S21(dB)')
#plt.draw()


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


def RotateMReduce(M, pivotI, pivotJ, removeRow, removeCol):
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
    if (otherRow < removeRow) or (otherCol < removeCol):
        tr = -M[removeRow, removeCol] / M[otherRow, otherCol]
    else:
        tr = M[removeRow, removeCol] / M[otherRow, otherCol]
    tr2 = tr * tr
    sr = np.sqrt(tr2 / (1 + tr2))
    cr = np.sqrt(1 / (1 + tr2))
    if tr < 0:
        cr = -cr
    
    N = M.shape[0] - 2
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

def RotateArrow2Folded(M, topology):
    N = M.shape[0] - 2
    MRotated = M
    tempM = M
    point = (N + 2.0) * (N + 2.0)
    allOnes = np.ones((N + 2, N + 2))
    allZeros = np.zeros((N + 2, N + 2))
    for i in np.arange(N - 1, -(N - 2), -1):
        for j in np.arange(int(1 + (N - 1 - i) / 2), 0, -1):
            row = i + j - 1
            col = N + 2 - j
            if row > 0:
                tempM = RotateMReduce(tempM, row, col - 1, row, col)
                temp1 = np.where(np.abs(tempM) > 1e-4, allOnes, allZeros)
                newpoint = np.sum(np.sum(temp1 - topology))
                if np.abs(newpoint) < 1e-4:
                    return MRotated, newpoint
                elif newpoint < point:
                    point = newpoint
                    MRotated = tempM
    return MRotated, point
    
M = np.real(M)


pr = cProfile.Profile()
pr.enable()

M = RotateM2Arrow(M)
foldedM, point = RotateArrow2Folded(M, topology)
print(np.round(foldedM, 2))
print(np.round(M, 4), "\n")
serializedT = SerializeM(topology)
serializedT[0] = 1
serializedT[N + 1] = 1
serializedT[-1] = 1
numTheta = int(N * (N - 1) / 2)
theta = np.zeros((numTheta, ))
numIter = 10 + int(10000 / (N * N))
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
        dumpFactor *= v

for i in np.arange(N + 1):
    if MRotated[i, i + 1] < 0:
        MRotated[i + 1, :] *= -1
        MRotated[:, i + 1] *= -1

pr.disable()
s = io.StringIO()
sortby = 'cumulative'
ps = pstats.Stats(pr, stream=s).sort_stats(sortby)
ps.print_stats()
print(s.getvalue())

print(np.round(MRotated, 2))
plt.clf()
plt.plot(cost)


#reqJson = np.load('tempData.npy')[0]
#freq = np.array(reqJson['freq']) * 1e6
#S11_amp = 10 ** (np.array(reqJson['S21_db']) / 20)
#S11 = S11_amp * (np.cos(np.array(reqJson['S21_angRad'])) + 1j * np.sin(np.array(reqJson['S21_angRad'])))
#S21_amp = 10 ** (np.array(reqJson['S11_db']) / 20)
#S21 = S21_amp * (np.cos(np.array(reqJson['S11_angRad'])) + 1j * np.sin(np.array(reqJson['S11_angRad'])))
#N = reqJson['filterOrder']
#numZeros = len(reqJson['tranZeros'])
#filterOrder = np.hstack((np.zeros((N, )), 2 * np.ones((numZeros, ))))
#w1 = (reqJson['centerFreq'] - reqJson['bandwidth'] / 2) * 1e6
#w2 = (reqJson['centerFreq'] + reqJson['bandwidth'] / 2) * 1e6
#
#epsilon, epsilonE, Qu, rootF, rootP, rootE = CP.S2FP(freq, S21, S11, filterOrder, w1, w2, wga=1.122*0.0254, method=3)
#S11_new, S21_new = CP.FPE2S(epsilon, epsilonE, rootF, rootP, rootE, normalizedFreq)
#
#plt.clf()
#plt.subplot(2, 2, 1)
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S11_old)), 'o');
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S11_new)), '*');
#plt.title('S11(dB)')
#plt.subplot(2, 2, 3)
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S11_old, deg=True), 'o');
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S11_new, deg=True), '*');
#plt.title('S11(degree)')
#plt.subplot(2, 2, 2)
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S21_old)), 'o');
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S21_new)), '*');
#plt.title('S21(dB)')
#plt.subplot(2, 2, 4)
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S21_old, deg=True), 'o');
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S21_new, deg=True), '*');
##plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(resultS21, deg=True) - np.angle(S21, deg=True), '*');
#plt.title('S21(degree)')
#
#fullMatrix = CP.FPE2M(epsilon, epsilonE, rootF, rootP, rootE, method=1)
#topology = np.array(reqJson['topology'])
#extractedMatrix = CP.ReduceMAngleMethod(fullMatrix, topology)
#targetMatrix = np.array(reqJson['targetMatrix'])
#temp1 = targetMatrix.copy()
#temp1[np.abs(targetMatrix) < 1e-4] = 1e9
#deviateMatrix = (extractedMatrix - targetMatrix) / temp1
#
#print(np.round(fullMatrix, 4))
#print(np.round(extractedMatrix, 4))
#print(np.round(deviateMatrix, 4))

#
#M = np.real(M)
#print(np.round(M, 4), "\n")
#temp1 = RotateMReduce(M, 1, 6, 0, 6)
#temp2 = RotateM2Arrow(M)
#temp3 = RotateMReduce(temp2, 5, 6, 5, 7)
#print(np.round(temp2, 4), "\n")
#print(np.round(temp3, 4), "\n")
#N = M.shape[0] - 2