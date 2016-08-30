# -*- coding: utf-8 -*-
"""
Created on Mon Aug  1 19:07:52 2016

@author: sam
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.backends.backend_pdf as backend_pdf
import json, skrf, CP
from numpy.polynomial import Polynomial

N = 9
topology = np.eye(N + 2, dtype=int)
topology[0, 0] = 0
topology[-1, -1] = 0
for i in np.arange(N + 1):
    topology[i, i + 1] = 1
    topology[i + 1, i] = 1
#topology[1, 3] = 1
#topology[3, 1] = 1
#topology[1, 4] = 1
#topology[4, 1] = 1
#topology[4, 6] = 1
#topology[6, 4] = 1

sparaFolder = "C:\\Users\sam\Documents\\User\Embeded\ServerApp\Heroku\S_file_for_capture"
with open("%s\\\\%s" % (sparaFolder, "_s_parameter.txt"), 'r') as json_file:
    testCases = np.array(json.load(json_file))
    
plt.close("all")
selectCases = np.array([24])
#selectCases = np.arange(1, 24)
with backend_pdf.PdfPages("%s\\\\%s" % (sparaFolder, "summary.pdf")) as pdf:
    for testCase in testCases[selectCases - 1]:
        ntwk = skrf.Network("%s\\\\%s" % (sparaFolder, testCase["fileName"]))
        freq = ntwk.frequency.f
        S11 = ntwk.s[:, 0, 0]
        S21 = ntwk.s[:, 1, 0]
        
        numDecimals = 6
        S11_db = np.around(20 * np.log10(np.abs(S11)), numDecimals)
        S21_db = np.around(20 * np.log10(np.abs(S21)), numDecimals)
        S11_angRad = np.around(np.angle(S11), numDecimals)
        S21_angRad = np.around(np.angle(S21), numDecimals)
        
        S11_amp = 10 ** (S11_db / 20)
        S11 = S11_amp * (np.cos(S11_angRad) + 1j * np.sin(S11_angRad))
        S21_amp = 10 ** (S21_db / 20)
        S21 = S21_amp * (np.cos(S21_angRad) + 1j * np.sin(S21_angRad))
        
        f0 = testCase["f0"]
        bw = testCase["BW"]
        w1 = testCase["f0"] - testCase["BW"] / 2
        w2 = testCase["f0"] + testCase["BW"] / 2
        normalizedFreq = np.real(CP.NormalizeFreq(freq, w1, w2))
        N = testCase['N']
        numZeros = testCase['Nz']
        filterOrder = np.hstack((np.zeros((N, )), 2 * np.ones((numZeros, ))))
        
        extractMethod = 6
        isSymmetric = (testCase['isSymmetric'] == 1)
        captureStartFreq = testCase['captureStartFreq']
        captureStopFreq = testCase['captureStopFreq']
        fc = f0 / 2
        epsilon, epsilonE, Qu, coefF, coefP, rootE, port1, port2 = CP.S2FP(freq, S21, S11, filterOrder, w1, w2, fc=fc, method=extractMethod, startFreq=captureStartFreq, stopFreq=captureStopFreq, isSymmetric=isSymmetric)
        
        polyF = Polynomial(coefF)
        polyP = Polynomial(coefP)
        polyE = Polynomial.fromroots(rootE)
        
        rootF = polyF.roots()
        rootP = polyP.roots()
        
        matrixMethod = 5
        transversalMatrix = CP.FPE2M(epsilon, epsilonE, coefF, coefP, rootE, method=matrixMethod)
#        print(np.round(transversalMatrix, 3))
        
#        extractedMatrix, msg = CP.FPE2MComprehensive(epsilon, epsilonE, rootF, rootP, rootE, topology, method = matrixMethod)
#        arrowM = CP.RotateM2Arrow(transversalMatrix, isComplex = True)
#        ctcqM, ctcqPoint = CP.RotateArrow2CTCQ(arrowM, topology, rootP)
#        print(np.round(np.real(transversalMatrix), 3))
#        print(np.round(np.imag(transversalMatrix), 4))
#        print(np.round(np.real(arrowM), 2))
#        print(np.round(np.imag(arrowM), 4))
#        print(np.round(np.real(ctcqM), 2))
#        print(np.round(np.imag(ctcqM), 4))
        
        port1["L"] *= 1.2
        port1["phi"] += 0.6
        S11_new, S21_new = CP.FPE2S(epsilon, epsilonE, coefF, coefP, rootE, normalizedFreq - 1j * f0 / (bw * Qu))
        S21_new, S11_new = CP.CM2S(transversalMatrix, normalizedFreq - 1j * f0 / (bw * Qu))
        S11_new, S21_new = CP.embedS(freq, S11_new, S21_new, fc, port1, port2)
        
        fig = plt.figure(testCase["No"])
        plt.subplot(2, 2, 1)
        plt.plot(normalizedFreq, 20*np.log10(np.abs(S11)), 'o');
        plt.plot(normalizedFreq, 20*np.log10(np.abs(S11_new)), '*');
        plt.title('S11(dB)')
        plt.subplot(2, 2, 3)
        plt.plot(normalizedFreq, np.angle(S11, deg=True), 'o');
        plt.plot(normalizedFreq, np.angle(S11_new, deg=True), '*');
        plt.title('S11(degree)')
        plt.subplot(2, 2, 2)
        plt.plot(normalizedFreq, 20*np.log10(np.abs(S21)), 'o');
        plt.plot(normalizedFreq, 20*np.log10(np.abs(S21_new)), '*');
        plt.title('S21(dB)')
        plt.subplot(2, 2, 4)
        plt.plot(normalizedFreq, np.angle(S21, deg=True), 'o');
        plt.plot(normalizedFreq, np.angle(S21_new, deg=True), '*');
        plt.title('S21(degree)')
        
#        pdf.savefig(fig)