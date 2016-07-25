# -*- coding: utf-8 -*-
"""
Created on Sat Jul 23 20:22:50 2016

@author: sam
"""

aaa = rootYd
aaa = np.arange(0.1, 3, 0.1) * 1j
coefE1 = polyE.coef.copy()
coefF = polyF.coef
N = len(coefE) - 1
#print(polyE(aaa) * polyE(aaa).conj())
#print(polyF(aaa) * polyF(aaa).conj() + polyY21n(aaa) * polyY21n(aaa).conj())
#print(polyE(aaa) * polyE(aaa).conj() - polyF(aaa) * polyF(aaa).conj() - polyY21n(aaa) * polyY21n(aaa).conj())

polyE1 = Polynomial(coefE1)
rootE1 = polyE1.roots()
cost = np.zeros((5,))
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
tempJ = np.zeros((len(aaa), len(rootE1)), dtype=complex)
for i in np.arange(5):
    polyE1 = Polynomial.fromroots(rootE1)
    polyEResult = polyE1(aaa)
    r = polyEResult * polyEResult.conj() - polyF(aaa) * polyF(aaa).conj() - polyP(aaa) * polyP(aaa).conj() / (epsilon * epsilon.conj())
    r = np.real(r)
    for m in np.arange(len(aaa)):
        for n in np.arange(len(rootE1)):
            tempJ[m, n] = -polyE1(aaa[m]) * polyE1(aaa[m]).conj() / (aaa[m] - rootE1[n])
    J = 2 * np.hstack((np.real(tempJ), -np.imag(tempJ)))
    delta = -0.8 * np.linalg.solve(J.T.dot(J), J.T.dot(r))
    rootE1 += delta[:N] + 1j * delta[N:]
    rootE1 = -np.abs(np.real(rootE1)) + 1j * np.imag(rootE1)
    cost[i] = r.dot(r)
print(cost)
print(rootE1)