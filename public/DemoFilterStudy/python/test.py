# -*- coding: utf-8 -*-
"""
Spyder Editor

This is a temporary script file.
"""

import CP
import numpy as np
from numpy.polynomial import Polynomial
import matplotlib.pyplot as plt

rootP = np.array([]) #np.array([-2j, 2j])
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


plt.clf()
plt.subplot(1, 2, 1)
plt.plot(normalizedFreq, 20*np.log10(np.abs(S11)), 'o');
plt.title('S11(dB)')
plt.subplot(1, 2, 2)
plt.plot(normalizedFreq, 20*np.log10(np.abs(S21)), 'o');
plt.title('S21(dB)')
plt.draw()