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
N = 12
returnLoss= 20.0
epsilon, coefP, coefF, coefE = CP.ChebyshevP2EF(rootP, N, returnLoss)

normalizedFreq = np.arange(-5.5, 5.5, 0.01)
polyF = Polynomial(coefF)
polyE = Polynomial(coefE)
rootF = polyF.roots()
rootE = polyE.roots()
epsilonE = epsilon
S11, S21 = CP.FPE2S(epsilon, epsilonE, rootF, rootP, rootE, normalizedFreq)

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
y21n = -1j *  coefP / epsilonE

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
#
#print(np.round(M, 2))

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

    
topology = np.eye(N + 2)
topology[0, 0] = 0
topology[-1, -1] = 0
for i in np.arange(N + 1):
    topology[i, i + 1] = 1
    topology[i + 1, i] = 1
#topology[2, 5] = 1
topology[3, 5] = 1

pr = cProfile.Profile()
pr.enable()


#def EvaluateR(M, serializedT, cr, sr):
#    N = M.shape[0] - 2
#    numTheta = int(N * (N - 1) / 2)
#    MRotated = M
#    indexTheta = numTheta - 1
#    for i in np.arange(N, 1, -1):
#        for j in np.arange(i - 1, 0, -1):
#            MRotated = RotateM(MRotated, j, i, cr[indexTheta], sr[indexTheta])
#            indexTheta -= 1
#    r = SerializeM(MRotated)[serializedT == 0]
#    return r, MRotated

#def EvaluateJ(M, serializedT, cr, sr):
#    N = M.shape[0] - 2
#    numR = np.count_nonzero(1 - serializedT)
#    numTheta = int(N * (N - 1) / 2)
#    MDeriv1 = np.zeros((numTheta, N + 2, N + 2))
#    MDeriv2 = np.zeros((numTheta, N + 2, N + 2))
#    MRotated = M
#    indexTheta = numTheta - 1
#    for i in np.arange(N, 1, -1):
#        for j in np.arange(i - 1, 0, -1):
#            MDeriv1[indexTheta, :, :] = RotateMDeriv(MRotated, j, i, cr[indexTheta], sr[indexTheta], sideDeriv = 0)
#            MDeriv2[indexTheta, :, :] = RotateMDeriv(MRotated, j, i, cr[indexTheta], sr[indexTheta], sideDeriv = 1)
#            MRotated = RotateM(MRotated, j, i, cr[indexTheta], sr[indexTheta])
#            for k in np.arange(indexTheta + 1, numTheta):
#                MDeriv1[k, :, :] = RotateM(MDeriv1[k, :, :], j, i, cr[indexTheta], sr[indexTheta])
#                MDeriv2[k, :, :] = RotateM(MDeriv2[k, :, :], j, i, cr[indexTheta], sr[indexTheta])
#            indexTheta -= 1
#    MDeriv = MDeriv1 + MDeriv2    
#    J = np.zeros((numR, numTheta))
#    for i in np.arange(numTheta):
#        J[:, i] = SerializeM(MDeriv[i, :, :])[serializedT == 0]
#    r = SerializeM(MRotated)[serializedT == 0]
#    return J, r, MRotated

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

M = np.real(M)
serializedT = SerializeM(topology)
numTheta = int(N * (N - 1) / 2)
theta = np.random.rand(numTheta) * np.pi
numIter = 150
cost = np.zeros((numIter, ))
dumpFactor = 0.1
v = 1.5

for i in np.arange(numIter):
    cr = np.cos(theta)
    sr = np.sin(theta)
    J, r, MRotated = EvaluateJ(M, serializedT, cr, sr)
    costCurr = r.T.dot(r)
    cost[i] = costCurr
    if costCurr < 1e-8:
        break
    
    b = -J.T.dot(r)
    a1 = J.T.dot(J)
    a2 = np.diag(np.diag(a1))
    
    for j in np.arange(30):
        delta1 = np.linalg.solve(a1 + a2 * dumpFactor / v, b)
        r1 = EvaluateR(M, serializedT, np.cos(theta + delta1), np.sin(theta + delta1))[0]
        costCurr1 = r1.T.dot(r1)
        if costCurr1 < costCurr:
            if dumpFactor > 1e-9:
                dumpFactor /= v
            theta += delta1
            break
        else:
            delta2 = np.linalg.solve(a1 + a2 * dumpFactor, b)
            r2 = EvaluateR(M, serializedT, np.cos(theta + delta2), np.sin(theta + delta2))[0]
            costCurr2 = r2.T.dot(r2)
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