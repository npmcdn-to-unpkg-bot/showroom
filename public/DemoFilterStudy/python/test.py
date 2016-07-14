# -*- coding: utf-8 -*-
"""
Spyder Editor

This is a temporary script file.
"""

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

print(np.round(M, 2))

#plt.clf()
#plt.subplot(1, 2, 1)
#plt.plot(normalizedFreq, 20*np.log10(np.abs(S11)), 'o');
#plt.title('S11(dB)')
#plt.subplot(1, 2, 2)
#plt.plot(normalizedFreq, 20*np.log10(np.abs(S21)), 'o');
#plt.title('S21(dB)')
#plt.draw()