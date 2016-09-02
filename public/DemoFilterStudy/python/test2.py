# -*- coding: utf-8 -*-
"""
Created on Sat Jul 23 20:22:50 2016

@author: sam
"""

import CP
import numpy as np
import scipy as sp
import scipy.constants
from numpy.polynomial import Polynomial
from scipy import optimize, interpolate, signal, sparse
import matplotlib.pyplot as plt

#aaa = rootYd
#aaa = np.arange(0.1, 3, 0.1) * 1j
#coefE1 = polyE.coef.copy()
#coefF = polyF.coef
#N = len(coefE) - 1
#print(polyE(aaa) * polyE(aaa).conj())
#print(polyF(aaa) * polyF(aaa).conj() + polyY21n(aaa) * polyY21n(aaa).conj())
#print(polyE(aaa) * polyE(aaa).conj() - polyF(aaa) * polyF(aaa).conj() - polyY21n(aaa) * polyY21n(aaa).conj())

#polyE1 = Polynomial(coefE1)
#rootE1 = polyE1.roots()
#cost = np.zeros((5,))
#for i in np.arange(15):
#    polyEResult = polyE1(aaa)
#    r = polyEResult * polyEResult.conj() - polyF(aaa) * polyF(aaa).conj() - polyY21n(aaa) * polyY21n(aaa).conj()
#    r = np.real(r)
#    tempVander = np.vander(aaa, N + 1, increasing = True)
#    J = (tempVander.T * polyEResult.conj()).T
#    J = 2 * np.hstack((np.real(J), -np.imag(J)))
#    delta = -1 * np.linalg.solve(J.T.dot(J), J.T.dot(r))
#    coefE1 += delta[:N + 1] + 1j * delta[N + 1:]
#    polyE1 = Polynomial(coefE1)
#    rootE1 = polyE1.roots()
##    rootE1 = -np.abs(np.real(rootE1)) + 1j * np.imag(rootE1)
##    polyE1 = Polynomial.fromroots(rootE1)
#    cost[i] = r.dot(r)
#tempJ = np.zeros((len(aaa), len(rootE1)), dtype=complex)
#for i in np.arange(5):
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
#print(cost)
#print(rootE1)
#
#
#rootP = np.array([-2.2j, 2.5j]) #np.array([-2j, 2j])
#N = 7
#
#topology = np.eye(N + 2, dtype=int)
#topology[0, 0] = 0
#topology[-1, -1] = 0
#for i in np.arange(N + 1):
#    topology[i, i + 1] = 1
#    topology[i + 1, i] = 1
#topology[1, 3] = 1
#topology[3, 1] = 1
#topology[4, 6] = 1
#topology[6, 4] = 1
##topology[5, 7] = 1
##topology[7, 5] = 1
##topology[8, 11] = 1
##topology[11, 8] = 1
##topology[9, 11] = 1
##topology[11, 9] = 1
##topology[7, 9] = 1
##topology[9, 7] = 1
#
#M = np.array([[0.00000,0.44140,0.00000,0.00000,0.00000,0.00000,0.00000,0.00000,0.00000],
#[0.44140,0.75180,0.16820,0.00000,0.00000,0.00000,0.00000,0.00000,0.00000],
#[0.00000,0.16820,0.78050,0.12880,0.00000,0.00000,0.00000,0.00000,0.00000],
#[0.00000,0.00000,0.12880,0.78280,0.12080,-0.00420,-0.00840,0.00000,0.00000],
#[0.00000,0.00000,0.00000,0.12080,0.79140,0.12890,0.00000,0.00000,0.00000],
#[0.00000,0.00000,0.00000,-0.00420,0.12890,0.78290,0.12890,0.00000,0.00000],
#[0.00000,0.00000,0.00000,-0.00840,0.00000,0.12890,0.78340,0.18000,0.00000],
#[0.00000,0.00000,0.00000,0.00000,0.00000,0.00000,0.18000,0.78280,0.46540],
#[0.00000,0.00000,0.00000,0.00000,0.00000,0.00000,0.00000,0.46540,0.00000]])
#
#arrowM = CP.RotateM2Arrow(M)
#tranZeros = rootP
#ctcqM, ctcqPoint = CP.RotateArrow2CTCQ(arrowM, topology, tranZeros)
#print(np.round(arrowM, 2))
#print(np.round(np.real(ctcqM), 2), "ctcq point:", ctcqPoint, "\n")
#print("ctcq point:", ctcqPoint, "\n")

#def costFunc(s, c, rootP, N):
#    temp1 = np.array([np.arccos(1j * (x + (1 + x * x) / (s[0] + 1j * s[1] - x))) for x in rootP])
#    temp2 = np.sum(temp1) + (N - len(rootP)) * np.arccos(-1j * s[0] + s[1]) - c
#    return np.array([np.real(temp2), np.imag(temp2)])
#
#def jacobFunc(s, c, rootP, N):
#    temp1 = np.array([np.arccos(1j * (x + (1 + x * x) / (s[0] + 1j * s[1] - x))) for x in rootP])
#    temp2 = np.sum(temp1) + (N - len(rootP)) * np.arccos(-1j * s[0] + s[1]) - c
#    temp3 = np.array([(-1 / np.sqrt(1 +  (x + (1 + x * x) / (s[0] + 1j * s[1] - x)) ** 2)) * (-1j * (1 + x * x) / ((s[0] + 1j * s[1] - x) * (s[0] + 1j * s[1] - x))) for x in rootP])
#    temp4 = np.sum(temp3) + (N - len(rootP)) * (1j / np.sqrt(1 + (s[0] + 1j * s[1]) ** 2))
#    temp5 = temp4 * temp2.conj()
#    return np.array([[np.real(temp4), -np.imag(temp4)], [np.imag(temp4), np.real(temp4)]])
#
#temp1 = np.arccos(1j / np.abs(epsilon))
#temp2 = np.hstack((temp1 + np.arange(N) * np.pi, np.pi - temp1 + np.arange(N) * np.pi))
#result = np.array([optimize.root(fun=costFunc, x0=[0, 0], args=(x, rootP, N), jac=jacobFunc, method='hybr') for x in temp2])
#result2 = np.array([x.x[0] + 1j * x.x[1] for x in result])
#rootE1 = result2[np.real(result2) < 0]
#print(rootE1)
#plt.clf()
#plt.plot(np.real(result2), np.imag(result2), '*')



#reqJson = np.load('tempData3.npy')[0]
#freq = np.array(reqJson['freq']) * 1e6
#w1 = (reqJson['centerFreq'] - reqJson['bandwidth'] / 2) * 1e9
#w2 = (reqJson['centerFreq'] + reqJson['bandwidth'] / 2) * 1e9
#normalizedFreq = CP.NormalizeFreq(freq, w1, w2)
#S11_amp = 10 ** (np.array(reqJson['S11_db']) / 20)
#S11 = S11_amp * (np.cos(np.array(reqJson['S11_angRad'])) + 1j * np.sin(np.array(reqJson['S11_angRad'])))
#S21_amp = 10 ** (np.array(reqJson['S21_db']) / 20)
#S21 = S21_amp * (np.cos(np.array(reqJson['S21_angRad'])) + 1j * np.sin(np.array(reqJson['S21_angRad'])))
#N = reqJson['filterOrder']
#numZeros = len(reqJson['tranZeros'])
#filterOrder = np.hstack((np.zeros((N, )), 2 * np.ones((numZeros, ))))

#extractMethod = 6
#isSymmetric = False
#epsilon, epsilonE, Qu, coefF, coefP, rootE = CP.S2FP(freq, S21, S11, filterOrder, w1, w2, wga=1.122*0.0254, method=extractMethod, startFreq=0, stopFreq=0, isSymmetric=isSymmetric)
#
#matrixMethod = 5
#transversalMatrix = CP.FPE2M(epsilon, epsilonE, coefF, coefP, rootE, method=matrixMethod)
#
#topology = np.array(reqJson['topology'])
#extractedMatrix, msg1 = CP.FPE2MComprehensive(epsilon, epsilonE, coefF, coefP, rootE, topology, refRootP = reqJson['tranZeros'], method = matrixMethod)
#print(msg1)
#targetMatrix = np.array(reqJson['targetMatrix'])
#temp1 = targetMatrix.copy()
#temp1[np.abs(targetMatrix) < 1e-4] = 1e9
#deviateMatrix = (extractedMatrix - targetMatrix) / temp1
#
#S11_new, S21_new = CP.FPE2S(epsilon, epsilonE, coefF, coefP, rootE, normalizedFreq - 1j * reqJson['centerFreq'] / (reqJson['bandwidth'] * Qu))
#S21_new, S11_new = CP.CM2S(transversalMatrix, normalizedFreq - 1j * reqJson['centerFreq'] / (reqJson['bandwidth'] * Qu))
#
#plt.clf()
#plt.subplot(2, 2, 1)
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S11)), 'o');
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S11_new)), '*');
#plt.title('S11(dB)')
#plt.subplot(2, 2, 3)
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S11, deg=True), 'o');
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S11_new, deg=True), '*');
#plt.title('S11(degree)')
#plt.subplot(2, 2, 2)
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S21)), 'o');
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S21_new)), '*');
#plt.title('S21(dB)')
#plt.subplot(2, 2, 4)
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S21, deg=True), 'o');
#plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S21_new, deg=True), '*');
#plt.title('S21(degree)')


#B = np.array(reqJson['B'], dtype = float)
#h = np.array(reqJson['h'], dtype = float)
#xc = np.array(reqJson['xc'], dtype = float)
#xc_star = np.array(reqJson['xc_star'], dtype = float)
#xf = np.array(reqJson['xf'], dtype = float)
#lowerLimit = np.array(reqJson['lowerLimit'], dtype = float)
#upperLimit = np.array(reqJson['upperLimit'], dtype = float)
#f = xc - xc_star
#B += np.array(np.mat(f).T * np.mat(h)) / h.dot(h)
#h = np.linalg.solve(B, -f)
#xf_old = xf.copy()
#xf += h
#xf = np.where(xf > lowerLimit, xf, lowerLimit)
#xf = np.where(xf < upperLimit, xf, upperLimit)
#h = xf - xf_old
#if np.abs(f.dot(f)) < 0.001:
#    toStop = 1
#else:
#    toStop = 0
#resJson = {'B': B.tolist(), 'h': h.tolist(), 'xf': xf.tolist(), 'toStop': toStop}
#print(json.dumps(resJson, separators = (',', ':')))


reqJson = np.load('tempData.npy')[0]
dimension = np.array(reqJson['dimension'])
extractedMatrix = np.array(reqJson['extractedMatrix'])
topology = np.array(reqJson['topology'])
isSymmetric = reqJson['isSymmetric']

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
#        for j in np.arange(N + 2):
#            if seqM[i, j] != -1:
#                impactM[seqM[i, j], seqM[i, i]] = 1
#            if seqM[j, i] != -1:
#                impactM[seqM[j, i], seqM[i, i]] = 1

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

slopeM = np.zeros((numDim, numDim))
for i in np.arange(numDim):
    slopeM[:, i] = (extractedMatrix[i + 1] - extractedMatrix[0]) / (dimension[i + 1, i] - dimension[0, i])
slopeM *= impactM
invSlopeM = np.linalg.inv(slopeM)
intepM = extractedMatrix[0] - slopeM.dot(dimension[0])

resJson = {'slopeM': slopeM.tolist(), 'invSlopeM': invSlopeM.tolist(), 'intepM': intepM.tolist()}
print(np.around(slopeM, 3))
aaa = intepM + (slopeM.dot(dimension.T)).T - extractedMatrix
print(np.around(aaa, 3))


#reqJson = np.load('tempData4.npy')[0]
#freq = reqJson["freq"]
#angleRad = np.unwrap(reqJson["angleRad"])
#
#c0 = sp.constants.speed_of_light

#piC0 = 4 * np.pi * np.pi / (c0 * c0)
#x = np.array([np.min(freq), 0.2, 0.01]) # fc L phi
#limitX = np.array([np.min(freq), 0.2, 1e3])
#lenFreq = len(freq)
#J = np.zeros((lenFreq, len(x)))
#unwrappedAngleRad = np.unwrap(angleRad)
#for i in np.arange(20):
#    J[:, 0] = -piC0 * x[1] * x[1] * 2 * x[0]
#    J[:, 1] = piC0 * 2 * x[1] * (freq * freq - x[0] * x[0])
#    J[:, 2] = 2 * (unwrappedAngleRad - x[2])
#    r = J[:, 1] * 0.5 * x[1] - (unwrappedAngleRad - x[2]) * (unwrappedAngleRad - x[2])
#    if r.dot(r) / lenFreq < 1e-9:
#        break
#    x -= np.linalg.solve(J.T.dot(J), J.T.dot(r))
#    x = np.where(np.abs(x) < limitX, x, limitX * x / np.abs(x))
#    print(x, r.dot(r) / lenFreq)

#unwrappedAngleRad = np.unwrap(angleRad)
#A = np.ones((len(freq), 2))
#A[:, 0] = -2 * np.pi * np.sqrt(freq * freq - fc * fc) / sp.constants.speed_of_light
#B = unwrappedAngleRad
#x, residuals = np.linalg.lstsq(A, B)[0:2]
#
#B -= np.around(x[1] / (2 * np.pi)) * 2 * np.pi
#temp1 = np.around(x[1] / (2 * np.pi)) * 2 * np.pi
#print(x[1] * 180 / np.pi, temp1)
#A = np.matrix(A[:, 0]).T
#x, residuals = np.linalg.lstsq(A, B)[0:2]
#print(x)
#
#angleRadNew = -2 * np.pi * x[0] * np.sqrt(freq * freq - fc * fc) / c0 + temp1
##plt.figure()
#plt.clf()
#plt.plot(freq / 1e9, angleRad * 180 / np.pi, "*")
#plt.plot(freq / 1e9, angleRadNew * 180 / np.pi, "o")