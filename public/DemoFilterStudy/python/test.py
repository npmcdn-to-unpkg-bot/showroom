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

rootP = np.array([-1.5j, 1.5j])#np.array([1.0900j, 1.1691j, 1.5057j]) #np.array([-2j, 2j])
N = 6
returnLoss= 22
epsilon, coefP, coefF, rootE = CP.ChebyshevP2EF(rootP, N, returnLoss)


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

polyF = Polynomial(coefF)
rootF = polyF.roots()

normalizedFreq = np.arange(-5.5, 5.5, 0.01)
#polyF = Polynomial(coefF)
#polyE = Polynomial(coefE)
#rootF = polyF.roots()
#rootE = polyE.roots()
epsilonE = epsilon
S11_old, S21_old = CP.FPE2S(epsilon, epsilonE, rootF, rootP, rootE, normalizedFreq)
#print(rootF)
#print(rootP)
#print(rootE)


topology = np.eye(N + 2, dtype=int)
topology[0, 0] = 0
topology[-1, -1] = 0
for i in np.arange(N + 1):
    topology[i, i + 1] = 1
    topology[i + 1, i] = 1
#topology[1, 3] = 1
#topology[3, 1] = 1
topology[2, 4] = 1
topology[4, 2] = 1
topology[2, 5] = 1
topology[5, 2] = 1
topology[3, 5] = 1
topology[5, 3] = 1
#topology[5, 7] = 1
#topology[7, 5] = 1
#topology[8, 10] = 1
#topology[10, 8] = 1
#topology[9, 11] = 1
#topology[11, 9] = 1
#topology[7, 9] = 1
#topology[9, 7] = 1


M = CP.FPE2M(epsilon, epsilonE, coefF, coefP, rootE, method=5)

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


M = np.real(M)


pr = cProfile.Profile()
pr.enable()

#resultM = CP.FPE2MComprehensive(epsilon, epsilonE, rootF, rootP, rootE, topology)
#print(np.round(resultM, 2), "\n")

arrowM = CP.RotateM2Arrow(M)
print(np.round(arrowM, 2))
tranZeros = rootP
#foldedM, foldedPoint = RotateArrow2Folded(arrowM, topology)
#print(np.round(np.real(foldedM), 4), "folded point:", foldedPoint, "\n")
ctcqM, ctcqPoint = CP.RotateArrow2CTCQ(arrowM, topology, tranZeros)
print(np.round(np.real(ctcqM), 2), "ctcq point:", ctcqPoint, "\n")
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


