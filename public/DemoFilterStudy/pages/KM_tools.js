(function (root) {
	'use strict';

	function factory(angular, Spinner) {
		return angular
			.module("KM_tools", ['angularSpinner'])
			.constant('configPara', {
				ip: '',
				// ip: 'http://localhost:3000',
				// ip: 'http://52.4.177.161:3000',
				// ip: 'https://ec2-52-4-177-161.compute-1.amazonaws.com:3000',
				// ip: 'https://keydecision.tk',
				// ip: window.location.protocol + '//' + window.location.hostname,
				api: '/ajax/',
				api2: '/python/',
				// isPhone: (window.location.protocol !== 'http:' && window.location.protocol !== 'https:')
			})
			.service('common', ['$http', '$q', 'usSpinnerService', 'configPara', function($http, $q, usSpinnerService, configPara){
				var _this = this;
				this.xhr = function(method, data){
					//return $q.resolve('error');
					usSpinnerService.spin('spinner-1');
					return $http.post(configPara.ip + configPara.api + method, data, {withCredentials: true}).then(function(response){
						usSpinnerService.stop('spinner-1');
						return response.data;
					}, function(response) {
						usSpinnerService.stop('spinner-1');
						return $q.reject(new Error(response.data || "Request failed"));
					});
				};
				this.xhr2 = function(method, data){
					usSpinnerService.spin('spinner-1');
					return $http.post(configPara.ip + configPara.api2 + method, JSON.stringify(data), {withCredentials: true, headers: {'Content-Type': 'text/plain'}}).then(function(response){
						usSpinnerService.stop('spinner-1');
						return response.data;
					}, function(response) {
						usSpinnerService.stop('spinner-1');
						return $q.reject(new Error(response.data || "Request failed"));
					});
				};
				this.ParseS2P = function(inputString){
					var freqMulti, dataFormat, temp1, temp2, temp3, temp4, freq = [], S21_db = [], S21_ang = [], S11_db = [], S11_ang = [];
					inputString.split("\n").forEach(function(thisLine){
						thisLine = thisLine.trim();
						if ((thisLine.length === 0) || (thisLine.charAt(0) === '!')) { return; }
						temp1 = thisLine.split(/\s{1,}/i);
						if (temp1[0] === '#') {
							if (temp1.length < 4) { throw new Error('Syntax error: at least 4 elements required --- ' + thisLine)}
							dataFormat = temp1[3].toLowerCase();
							switch (temp1[1].toLowerCase()){
								case 'thz':
									freqMulti = 1e6;
									break;
								case 'ghz':
									freqMulti = 1e3;
									break;
								case 'mhz':
									freqMulti = 1;
									break;
								case 'khz':
									freqMulti = 1e-3;
									break;
								case 'hz':
									freqMulti = 1e-6;
									break;
								default:
									freqMulti = 1;
							}
						} else {
							temp2 = temp1.map(Number);
							freq.push(temp2[0] * freqMulti);
							switch (dataFormat){
								case 'db':
									S11_db.push(temp2[1]);
									S11_ang.push(temp2[2] * Math.PI / 180);
									S21_db.push(temp2[3]);
									S21_ang.push(temp2[4] * Math.PI / 180);
									break;
								case 'ma':
									S11_db.push(20 * Math.log(temp2[1]) / Math.LN10);
									S11_ang.push(temp2[2] * Math.PI / 180);
									S21_db.push(20 * Math.log(temp2[3]) / Math.LN10);
									S21_ang.push(temp2[4] * Math.PI / 180);
									break;
								case 'ri':
									S11_db.push(10 * Math.log(temp2[1] * temp2[1] + temp2[2] * temp2[2]) / Math.LN10);
									S11_ang.push(Math.atan2(temp2[2], temp2[1]));
									S21_db.push(10 * Math.log(temp2[3] * temp2[3] + temp2[4] * temp2[4]) / Math.LN10);
									S21_ang.push(Math.atan2(temp2[4], temp2[3]));
									break;
								default:
									throw new Error('Syntax error: need to be RI, MA or dB --- ' + thisLine);
							}
						}
					})
					function toFixed3(num){return Math.round(num * 1000) / 1000;}
					function toFixed6(num){return Math.round(num * 1000000) / 1000000;}
					var toFixedN = toFixed6;
					return {freq: freq, S21_db: S21_db.map(toFixedN), S21_angRad: S21_ang.map(toFixedN), S11_db: S11_db.map(toFixedN), S11_angRad: S11_ang.map(toFixedN)}
				};
				this.FPE2S = function(epsilon, epsilonE, coefF, coefP, coefE, freqGHz, q, centerFreq, bandwidth){
					var N = coefF.length,
						bw = bandwidth,
						w0 = Math.sqrt((centerFreq - bw / 2) * (centerFreq + bw / 2)),
						normalizedS = freqGHz.map(function(d){return numeric.t(w0 / (q * bw), (w0 / bw) * (d / w0 - w0 / d))}),
						normalizedFreq = freqGHz.map(function(d){return numeric.t((w0 / bw) * (d / w0 - w0 / d), -w0 / (q * bw))}),
						vanderN = normalizedS.map(function(d){
							var i, result = [], temp1 = numeric.t(1, 0);
							for (i = 0; i < N + 1; i++){
								result.push(temp1);
								temp1 = temp1.mul(d);
							}
							return result;
						}),
						polyResult = function(coef){
							return vanderN.map(function(v){
								return coef.reduce(function(t, d, i){
									return t.add(d.mul(v[i]));
								}, numeric.t(0, 0))
							});
						},
						polyResultP = polyResult(coefP),
						polyResultF = polyResult(coefF),
						polyResultE = polyResult(coefE),
						S11 = freqGHz.map(function(f, i){return [f, polyResultF[i].div(polyResultE[i])]}),
						S21 = freqGHz.map(function(f, i){return [f, polyResultP[i].div(polyResultE[i]).div(epsilon)]});
					return {S11: S11, S21: S21}
				};
				this.CM2S = function(coupleMatrix, freqGHz, q, centerFreq, bandwidth){
					var N = coupleMatrix.length - 2,
						bw = bandwidth,
						w0 = Math.sqrt((centerFreq - bw / 2) * (centerFreq + bw / 2)),
						normalizedS = freqGHz.map(function(d){return numeric.t(w0 / (q * bw), (w0 / bw) * (d / w0 - w0 / d))}),
						normalizedFreq = freqGHz.map(function(d){return numeric.t((w0 / bw) * (d / w0 - w0 / d), -w0 / (q * bw))}),
						S11 = [],
						S21 = [],			
						minusR = numeric.rep([N + 2], 0);
					minusR[0] = -1;
					minusR[N+1] = -1;
					minusR = numeric.diag(minusR);
					
					normalizedFreq.forEach(function(thisFreq, i){
						var Y, Z,
							FUX = numeric.rep([N + 2], thisFreq.x),
							FUY = numeric.rep([N + 2], thisFreq.y);
						FUX[0] = 0;
						FUX[N + 1] = 0;
						FUX = numeric.diag(FUX);
						FUY[0] = 0;
						FUY[N + 1] = 0;
						FUY = numeric.diag(FUY);
						
						Z = numeric.t(numeric.add(FUX, coupleMatrix), numeric.add(FUY, minusR));
						
						Y = Z.inv();
						
						S11.push([freqGHz[i], numeric.t(Y.x[0][0], Y.y[0][0]).mul(numeric.t(0, 2)).add(1)]);
						S21.push([freqGHz[i], numeric.t(Y.x[N+1][0], Y.y[N+1][0]).mul(numeric.t(0, -2))]);
					});
					return {S11: S11, S21: S21}
				};
				this.WebsiteAvailability = function(websiteUrls){
					var promises = websiteUrls.map(function(websiteUrl){
						return $http.head(websiteUrl, {withCredentials: false}).then(function(response){
							return true;
						}, function(response) {
							return false;
						});
					});
					return $q.all(promises);
				};
				this.LoopThroughDOM = function(myElement, func){
					func(myElement);
					angular.forEach(myElement.children(), function (childElement) {
						_this.LoopThroughDOM(angular.element(childElement), func);
					});
/* 					console.log(myElement.children());
					myElement.children().each(function () {
						_this.LoopThroughDOM(angular.element(this), func); // "this" is the current child element in the loop
					}); */
				};
				this.CountWatchers = function(myElement){
					if (myElement === []) {return 0};
					var countResult = 0,
						myFunc = function(myElement){
							// console.log(myElement.data().$scope.$$watchers);
							if (myElement.data().$isolateScope && myElement.data().$isolateScope.$$watchers && myElement.data().$isolateScope.$$watchers.length){
								countResult += myElement.data().$isolateScope.$$watchers.length;
								// console.log(myElement.data().$isolateScope.$$watchers);
							}
							if (myElement.data().$scope && myElement.data().$scope.$$watchers && myElement.data().$scope.$$watchers.length){
								countResult += myElement.data().$scope.$$watchers.length;
								// console.log(myElement.data().$scope.$$watchers);
							}
						};
					_this.LoopThroughDOM(myElement, myFunc);
					return countResult;
				};
				this.DetachWatchers = function(myElement){
					if (myElement === []) {return undefined};
					var myFunc = function(myElement){
						if (myElement.data().$isolateScope && myElement.data().$isolateScope.$$watchers && (myElement.data().$isolateScope.$$watchers.length !== 0)){
							// console.log(myElement.data().$isolateScope.$$watchers, "isolate scope watchers detached!");
							myElement.data('backupWatchersIsolateScope', myElement.data().$isolateScope.$$watchers);
							myElement.data().$isolateScope.$$watchers = [];
						}
						if (myElement.data().$scope && myElement.data().$scope.$$watchers && (myElement.data().$scope.$$watchers.length !== 0)){
							// console.log(myElement.data().$scope.$$watchers, "scope watchers detached!");
							myElement.data('backupWatchersScope', myElement.data().$scope.$$watchers);
							myElement.data().$scope.$$watchers = [];
						}
					};
					_this.LoopThroughDOM(myElement, myFunc);
				};
				this.RetachWatchers = function(myElement){
					if (myElement === []) {return undefined};
					var myFunc = function(myElement){
						if (myElement.data().$isolateScope && myElement.data().$isolateScope.$$watchers && (myElement.data().$isolateScope.$$watchers.length === 0) && myElement.data().hasOwnProperty('backupWatchersIsolateScope')){ // Boolean([]) is evaluated to "true"
							myElement.data().$isolateScope.$$watchers = myElement.data('backupWatchersIsolateScope');
						}
						if (myElement.data().$scope && myElement.data().$scope.$$watchers && (myElement.data().$scope.$$watchers.length === 0) && myElement.data().hasOwnProperty('backupWatchersScope')){
							myElement.data().$scope.$$watchers = myElement.data('backupWatchersScope');
						}
					};
					_this.LoopThroughDOM(myElement, myFunc);
				};
			}]);
	}

	if (typeof define === 'function' && define.amd) {
		/* AMD module */
		define(['angular', 'spin'], factory);
	} else {
		/* Browser global */
		factory(root.angular);
	}
}(window));
