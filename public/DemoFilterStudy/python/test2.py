# -*- coding: utf-8 -*-
"""
Created on Sat Jul 23 20:22:50 2016

@author: sam
"""

import CP
import numpy as np
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



reqJson = np.load('tempData.npy')[0]
freq = np.array(reqJson['freq']) * 1e6
w1 = (reqJson['centerFreq'] - reqJson['bandwidth'] / 2) * 1e9
w2 = (reqJson['centerFreq'] + reqJson['bandwidth'] / 2) * 1e9
normalizedFreq = CP.NormalizeFreq(freq, w1, w2)
S11_amp = 10 ** (np.array(reqJson['S11_db']) / 20)
S11 = S11_amp * (np.cos(np.array(reqJson['S11_angRad'])) + 1j * np.sin(np.array(reqJson['S11_angRad'])))
S21_amp = 10 ** (np.array(reqJson['S21_db']) / 20)
S21 = S21_amp * (np.cos(np.array(reqJson['S21_angRad'])) + 1j * np.sin(np.array(reqJson['S21_angRad'])))
N = reqJson['filterOrder']
numZeros = len(reqJson['tranZeros'])
filterOrder = np.hstack((np.zeros((N, )), 2 * np.ones((numZeros, ))))

extractMethod = 5
epsilon, epsilonE, Qu, rootF, rootP, rootE = CP.S2FP(freq, S21, S11, filterOrder, w1, w2, wga=1.122*0.0254, method=extractMethod, startFreq=0, stopFreq=0)

fullMatrix = CP.FPE2M(epsilon, epsilonE, rootF, rootP, rootE, method=1)
topology = np.array(reqJson['topology'])
extractedMatrix, msg1 = CP.FPE2MComprehensive(epsilon, epsilonE, rootF, rootP, rootE, topology)
print(msg1)
targetMatrix = np.array(reqJson['targetMatrix'])
temp1 = targetMatrix.copy()
temp1[np.abs(targetMatrix) < 1e-4] = 1e9
deviateMatrix = (extractedMatrix - targetMatrix) / temp1

S11_new, S21_new = CP.FPE2S(epsilon, epsilonE, rootF, rootP, rootE, normalizedFreq - 1j * reqJson['centerFreq'] / (reqJson['bandwidth'] * Qu))
#S21_new, S11_new = CP.CM2S(fullMatrix, normalizedFreq - 1j * reqJson['centerFreq'] / (reqJson['bandwidth'] * Qu))

plt.clf()
plt.subplot(2, 2, 1)
plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S11)), 'o');
plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S11_new)), '*');
plt.title('S11(dB)')
plt.subplot(2, 2, 3)
plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S11, deg=True), 'o');
plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S11_new, deg=True), '*');
plt.title('S11(degree)')
plt.subplot(2, 2, 2)
plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S21)), 'o');
plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), 20*np.log10(np.abs(S21_new)), '*');
plt.title('S21(dB)')
plt.subplot(2, 2, 4)
plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S21, deg=True), 'o');
plt.plot(CP.DenormalizeFreq(normalizedFreq, w1, w2), np.angle(S21_new, deg=True), '*');
plt.title('S21(degree)')