'use strict';

(function (root) {
	'use strict';

	function factory(angular, Spinner) {
		return angular.module("KM_tools", ['angularSpinner']).constant('configPara', {
			ip: '',
			// ip: 'http://localhost:3000',
			// ip: 'http://52.4.177.161:3000',
			// ip: 'https://ec2-52-4-177-161.compute-1.amazonaws.com:3000',
			// ip: 'https://keydecision.tk',
			// ip: window.location.protocol + '//' + window.location.hostname,
			api: '/ajax/',
			api2: '/python/'
		}). // isPhone: (window.location.protocol !== 'http:' && window.location.protocol !== 'https:')
		service('common', ['$http', '$q', 'usSpinnerService', 'configPara', function ($http, $q, usSpinnerService, configPara) {
			var _this = this;
			this.xhr = function (method, data) {
				//return $q.resolve('error');
				usSpinnerService.spin('spinner-1');
				return $http.post(configPara.ip + configPara.api + method, data, { withCredentials: true }).then(function (response) {
					usSpinnerService.stop('spinner-1');
					return response.data;
				}, function (response) {
					usSpinnerService.stop('spinner-1');
					return $q.reject(new Error(response.data || "Request failed"));
				});
			};
			this.xhr2 = function (method, data) {
				usSpinnerService.spin('spinner-1');
				return $http.post(configPara.ip + configPara.api2 + method, JSON.stringify(data), { withCredentials: true, headers: { 'Content-Type': 'text/plain' } }).then(function (response) {
					usSpinnerService.stop('spinner-1');
					return response.data;
				}, function (response) {
					usSpinnerService.stop('spinner-1');
					return $q.reject(new Error(response.data || "Request failed"));
				});
			};
			this.ParseS2P = function (inputString) {
				var freqMulti,
				    dataFormat,
				    temp1,
				    temp2,
				    temp3,
				    temp4,
				    freq = [],
				    S21_db = [],
				    S21_ang = [],
				    S11_db = [],
				    S11_ang = [];
				inputString.split("\n").forEach(function (thisLine) {
					thisLine = thisLine.trim();
					if (thisLine.length === 0 || thisLine.charAt(0) === '!') {
						return;
					}
					temp1 = thisLine.split(/\s{1,}/i);
					if (temp1[0] === '#') {
						if (temp1.length < 4) {
							throw new Error('Syntax error: at least 4 elements required --- ' + thisLine);
						}
						dataFormat = temp1[3].toLowerCase();
						switch (temp1[1].toLowerCase()) {
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
						switch (dataFormat) {
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
				});
				function toFixed3(num) {
					return Math.round(num * 1000) / 1000;
				}
				function toFixed6(num) {
					return Math.round(num * 1000000) / 1000000;
				}
				var toFixedN = toFixed6;
				return { freq: freq, S21_db: S21_db.map(toFixedN), S21_angRad: S21_ang.map(toFixedN), S11_db: S11_db.map(toFixedN), S11_angRad: S11_ang.map(toFixedN) };
			};
			this.FPE2S = function (epsilon, epsilonE, coefF, coefP, coefE, freqGHz, q, centerFreq, bandwidth) {
				var N = coefF.length,
				    bw = bandwidth,
				    w0 = Math.sqrt((centerFreq - bw / 2) * (centerFreq + bw / 2)),
				    normalizedS = freqGHz.map(function (d) {
					return numeric.t(w0 / (q * bw), w0 / bw * (d / w0 - w0 / d));
				}),
				    normalizedFreq = freqGHz.map(function (d) {
					return numeric.t(w0 / bw * (d / w0 - w0 / d), -w0 / (q * bw));
				}),
				    vanderN = normalizedS.map(function (d) {
					var i,
					    result = [],
					    temp1 = numeric.t(1, 0);
					for (i = 0; i < N + 1; i++) {
						result.push(temp1);
						temp1 = temp1.mul(d);
					}
					return result;
				}),
				    polyResult = function polyResult(coef) {
					return vanderN.map(function (v) {
						return coef.reduce(function (t, d, i) {
							return t.add(d.mul(v[i]));
						}, numeric.t(0, 0));
					});
				},
				    polyResultP = polyResult(coefP),
				    polyResultF = polyResult(coefF),
				    polyResultE = polyResult(coefE),
				    S11 = freqGHz.map(function (f, i) {
					return [f, polyResultF[i].div(polyResultE[i])];
				}),
				    S21 = freqGHz.map(function (f, i) {
					return [f, polyResultP[i].div(polyResultE[i]).div(epsilon)];
				});
				return { S11: S11, S21: S21 };
			};
			this.CM2S = function (coupleMatrix, freqGHz, q, centerFreq, bandwidth) {
				var N = coupleMatrix.length - 2,
				    bw = bandwidth,
				    w0 = Math.sqrt((centerFreq - bw / 2) * (centerFreq + bw / 2)),
				    normalizedS = freqGHz.map(function (d) {
					return numeric.t(w0 / (q * bw), w0 / bw * (d / w0 - w0 / d));
				}),
				    normalizedFreq = freqGHz.map(function (d) {
					return numeric.t(w0 / bw * (d / w0 - w0 / d), -w0 / (q * bw));
				}),
				    S11 = [],
				    S21 = [],
				    minusR = numeric.rep([N + 2], 0);
				minusR[0] = -1;
				minusR[N + 1] = -1;
				minusR = numeric.diag(minusR);

				normalizedFreq.forEach(function (thisFreq, i) {
					var Y,
					    Z,
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
					S21.push([freqGHz[i], numeric.t(Y.x[N + 1][0], Y.y[N + 1][0]).mul(numeric.t(0, -2))]);
				});
				return { S11: S11, S21: S21 };
			};
			this.WebsiteAvailability = function (websiteUrls) {
				var promises = websiteUrls.map(function (websiteUrl) {
					return $http.head(websiteUrl, { withCredentials: false }).then(function (response) {
						return true;
					}, function (response) {
						return false;
					});
				});
				return $q.all(promises);
			};
			this.LoopThroughDOM = function (myElement, func) {
				func(myElement);
				angular.forEach(myElement.children(), function (childElement) {
					_this.LoopThroughDOM(angular.element(childElement), func);
				});
				/* 					console.log(myElement.children());
    					myElement.children().each(function () {
    						_this.LoopThroughDOM(angular.element(this), func); // "this" is the current child element in the loop
    					}); */
			};
			this.CountWatchers = function (myElement) {
				if (myElement === []) {
					return 0;
				};
				var countResult = 0,
				    myFunc = function myFunc(myElement) {
					// console.log(myElement.data().$scope.$$watchers);
					if (myElement.data().$isolateScope && myElement.data().$isolateScope.$$watchers && myElement.data().$isolateScope.$$watchers.length) {
						countResult += myElement.data().$isolateScope.$$watchers.length;
						// console.log(myElement.data().$isolateScope.$$watchers);
					}
					if (myElement.data().$scope && myElement.data().$scope.$$watchers && myElement.data().$scope.$$watchers.length) {
						countResult += myElement.data().$scope.$$watchers.length;
						// console.log(myElement.data().$scope.$$watchers);
					}
				};
				_this.LoopThroughDOM(myElement, myFunc);
				return countResult;
			};
			this.DetachWatchers = function (myElement) {
				if (myElement === []) {
					return undefined;
				};
				var myFunc = function myFunc(myElement) {
					if (myElement.data().$isolateScope && myElement.data().$isolateScope.$$watchers && myElement.data().$isolateScope.$$watchers.length !== 0) {
						// console.log(myElement.data().$isolateScope.$$watchers, "isolate scope watchers detached!");
						myElement.data('backupWatchersIsolateScope', myElement.data().$isolateScope.$$watchers);
						myElement.data().$isolateScope.$$watchers = [];
					}
					if (myElement.data().$scope && myElement.data().$scope.$$watchers && myElement.data().$scope.$$watchers.length !== 0) {
						// console.log(myElement.data().$scope.$$watchers, "scope watchers detached!");
						myElement.data('backupWatchersScope', myElement.data().$scope.$$watchers);
						myElement.data().$scope.$$watchers = [];
					}
				};
				_this.LoopThroughDOM(myElement, myFunc);
			};
			this.RetachWatchers = function (myElement) {
				if (myElement === []) {
					return undefined;
				};
				var myFunc = function myFunc(myElement) {
					if (myElement.data().$isolateScope && myElement.data().$isolateScope.$$watchers && myElement.data().$isolateScope.$$watchers.length === 0 && myElement.data().hasOwnProperty('backupWatchersIsolateScope')) {
						// Boolean([]) is evaluated to "true"
						myElement.data().$isolateScope.$$watchers = myElement.data('backupWatchersIsolateScope');
					}
					if (myElement.data().$scope && myElement.data().$scope.$$watchers && myElement.data().$scope.$$watchers.length === 0 && myElement.data().hasOwnProperty('backupWatchersScope')) {
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
})(window);
"use strict";

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function reducer() {
  var state = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
  var action = arguments[1];

  var tempState = _extends({}, state);
  switch (action.type) {
    case "createTopoM":
      tempState.topoM = action.M;
      break;
    case "updateTopoM":
      tempState.topoM = [].concat(_toConsumableArray(state.topoM));
      tempState.topoM[action.row] = [].concat(_toConsumableArray(state.topoM[action.row]));
      tempState.topoM[action.row][action.col] = action.value;
      tempState.topoM[action.col] = [].concat(_toConsumableArray(state.topoM[action.col]));
      tempState.topoM[action.col][action.row] = action.value;
      //console.log("updateTopoM triggered: ", action, tempState);
      break;
    case "savedSynthesisData":
      tempState.savedSynthesisData = action.data;
      break;
    case "updateTempString":
      tempState.tempString = action.tempString;
      break;
    case "saveSFile":
      tempState.sFile = action.data;
      break;
    default:
  }
  return tempState;
}

window.store = Redux.createStore(reducer);
'use strict';

(function (w) {

	w.ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

	w.MatrixTopology = React.createClass({
		displayName: 'MatrixTopology',

		render: function render() {
			var _this2 = this;

			var _this = this,
			    thStyle = { border: '1px solid black', textAlign: 'center' },
			    tdStyle = { border: '1px solid black', textAlign: 'center' };
			return React.createElement(
				ReactCSSTransitionGroup,
				{ transitionName: 'gb-transition', transitionEnterTimeout: 500, transitionLeaveTimeout: 300 },
				React.createElement(
					'table',
					{ style: { width: '100%', borderCollapse: 'collapse' } },
					React.createElement(
						'tr',
						null,
						React.createElement('th', null),
						this.props.topoM.map(function (row, index_row) {
							if (index_row === 0) {
								return React.createElement(
									'th',
									{ style: thStyle },
									'S'
								);
							}
							if (index_row === _this2.props.topoM.length - 1) {
								return React.createElement(
									'th',
									{ style: thStyle },
									'L'
								);
							}
							return React.createElement(
								'th',
								{ style: thStyle },
								index_row
							);
						})
					),
					this.props.topoM.map(function (row, index_row) {
						var firstCol = void 0;
						if (index_row === 0) {
							firstCol = React.createElement(
								'td',
								{ style: tdStyle },
								'S'
							);
						} else if (index_row === _this2.props.topoM.length - 1) {
							firstCol = React.createElement(
								'td',
								{ style: tdStyle },
								'L'
							);
						} else {
							firstCol = React.createElement(
								'td',
								{ style: tdStyle },
								index_row
							);
						}
						return React.createElement(
							'tr',
							null,
							firstCol,
							row.map(function (eleM, index_col) {
								return React.createElement(
									'td',
									{ style: tdStyle, onClick: function onClick() {
											if (Math.abs(index_col - index_row) > 0.5) {
												_this2.props.clickM(index_row, index_col, 1 - eleM);
											}
										} },
									eleM === 1 ? React.createElement('span', { className: 'glyphicon glyphicon-ok-sign', 'aria-hidden': 'true' }) : React.createElement('span', { 'aria-hidden': 'true' })
								);
							})
						);
					})
				)
			);
		}
	});

	var mapStateToProps = function mapStateToProps(state) {
		return {
			topoM: state.topoM
		};
	};

	var mapDispatchToProps = function mapDispatchToProps(dispatch) {
		return {
			clickM: function clickM(row, col, value) {
				dispatch({ type: "updateTopoM", row: row, col: col, value: value });
			}
		};
	};

	w.MatrixTopologyContainer = ReactRedux.connect(mapStateToProps, mapDispatchToProps)(MatrixTopology);
})(window);
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

angular.module("content", ['KM_tools', 'socket.io', 'infinite-scroll', 'ui.router', 'ngAnimate', 'ngSanitize']).config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
	$stateProvider.state('index', {
		url: "/",
		abstract: true,
		templateUrl: "_index_web.html"
	}).state('synthesis', {
		url: "/synthesis",
		views: {
			'mainpage': {
				templateUrl: '_synthesis.html',
				controller: '_synthesis'
			}
		},
		onExit: function onExit() {
			ReactDOM.unmountComponentAtNode(document.getElementById('matrix-topology-table'));
		}
	}).state('extractmatrix', {
		resolve: {
			resolveObj: function resolveObj() {
				return { dataFromUpload: true };
			}
		},
		url: "/extractmatrix",
		views: {
			'mainpage': {
				templateUrl: '_extractmatrix.html',
				controller: '_extractmatrix'
			}
		}
	}).state('optimize', {
		url: "/optimize",
		views: {
			'mainpage': {
				templateUrl: '_optimize.html',
				controller: '_optimize'
			}
		}
	}).state('tune', {
		resolve: {
			resolveObj: function resolveObj() {
				return { dataFromUpload: false };
			}
		},
		url: "/tune",
		views: {
			'mainpage': {
				templateUrl: '_extractmatrix.html',
				controller: '_extractmatrix'
			}
		}
	});
	$urlRouterProvider.otherwise("/synthesis");
}]).config(['$socketProvider', 'configPara', function ($socketProvider, configPara) {
	$socketProvider.setConnectionUrl(configPara.ip);
}]).run(['$rootScope', 'common', '$timeout', function ($rootScope, common, $timeout) {}]).controller("content_main", ['$scope', 'common', function ($scope, common) {
	common.xhr('isLoggedIn', {}).then(function (msg) {
		if (msg) {} else {
			window.location.assign("login.html");
		}
	});
	$scope.logoff = function () {
		common.xhr('logoff', {}).then(function (msg) {
			if (msg) {} else {
				window.location.assign("login.html");
			}
		});
	};
}]).controller("_synthesis", ['$scope', 'common', '$timeout', '$http', function ($scope, common, $timeout, $http) {
	var vis = d3.select("#matrix-topology-container").append("svg:svg").attr("class", "stage").attr("width", document.getElementById("matrix-topology-container").offsetWidth).attr("height", document.getElementById("matrix-topology-container").offsetHeight);

	vis.append("g").attr("id", "group-links");
	vis.append("g").attr("id", "group-nodes");

	$('#matrix-topology-modal').on('shown.bs.modal', function (e) {
		d3.select("#matrix-topology-container").select("svg").attr("width", document.getElementById("matrix-topology-container").offsetWidth).attr("height", document.getElementById("matrix-topology-container").offsetHeight);
	});

	var linearChart;
	$timeout(function () {
		var i,
		    margin = {
			top: 40,
			right: 40,
			bottom: 50,
			left: 60
		},
		    data = [],
		    data1 = [],
		    data2 = [];
		linearChart = new simpleD3LinearChart("graph-linear-chart", margin, [0, 5], [-10, 50]);

		for (i = 0; i < 500; i++) {
			data1.push([i / 100, Math.sin(i / 100) * 20 + 10]);
			data2.push([i / 120, Math.cos(i / 120) * 10 + 10]);
		}

		data.push({ label: "S11(dB)", data: data1 });
		data.push({ label: "S21(dB)", data: data2 });

		linearChart.update(data, false);
	}, 100);

	$scope.filterOrderChange = function () {
		if ($scope.data.filterOrder > 20) {
			$scope.data.filterOrder = 20;
		}
		var N = $scope.data.filterOrder,
		    M = numeric.identity(N + 2),
		    i;
		M[0][0] = 0;
		M[N + 1][N + 1] = 0;
		for (i = 0; i < N + 1; i++) {
			M[i][i + 1] = 1;
			M[i + 1][i] = 1;
		}
		store.dispatch({ type: 'createTopoM', M: M });
	};

	$scope.switchPosition = function (curr, target) {
		var tranZeros = $scope.data.tranZeros;
		if (target >= 0 && target < tranZeros.length) {
			var temp1 = [tranZeros[target][0], tranZeros[target][1]];
			tranZeros[target][0] = tranZeros[curr][0];
			tranZeros[target][1] = tranZeros[curr][1];
			tranZeros[curr][0] = temp1[0];
			tranZeros[curr][1] = temp1[1];
		}
	};

	var tempStoreState = store.getState();

	if (tempStoreState.hasOwnProperty("savedSynthesisData")) {
		$scope.data = tempStoreState.savedSynthesisData;
	} else {
		$scope.data = {
			filterOrder: 8,
			returnLoss: 26,
			centerFreq: 29, //14.36,
			bandwidth: 3, //0.89,
			unloadedQ: 200000,
			startFreq: 26, //12.8,
			stopFreq: 32, //15.5,
			numberOfPoints: 1000,
			filterType: "BPF",
			/* tranZeros: [['', 1.4], ['', -1.2]], */
			tranZeros: [['', '']],
			matrixDisplay: "M",
			isSymmetric: false,
			focusZero: 0
		};
	}

	var unsubscribe = store.subscribe(handleChangeM);
	if (tempStoreState.hasOwnProperty("topoM")) {
		handleChangeM();
	} else {
		$scope.filterOrderChange();
	}

	$scope.showChart = function (select) {
		var data;
		switch (select.toLowerCase()) {
			case "groupdelay":
				data = [{ label: "Group delay (ns)", data: $scope.GroupDelay_fromM }];
				break;
			case "s":
			default:
				data = [{ label: "S11(dB)", data: $scope.S11dB_fromM }, { label: "S21(dB)", data: $scope.S21dB_fromM }];
		}
		linearChart.update(data, true);
	};

	$scope.calculate = function _callee() {
		var polyResult, tranZeros, numberOfPoints, stopFreq, freqGHz, response, epsilon, epsilonE, coefP, coefF, coefE, sFromM, tempString;
		return regeneratorRuntime.async(function _callee$(_context) {
			while (1) {
				switch (_context.prev = _context.next) {
					case 0:
						polyResult = function polyResult(coef) {
							return vanderN.map(function (v) {
								return coef.reduce(function (t, d, i) {
									return t.add(d.mul(v[i]));
								}, numeric.t(0, 0));
							});
						};

						;
						_context.prev = 2;
						tranZeros = $scope.data.tranZeros.map(function (d) {
							return [Number(d[0]), Number(d[1])];
						}).filter(function (d) {
							return d[0] !== 0 || d[1] !== 0;
						});
						numberOfPoints = $scope.data.numberOfPoints < 5000 ? $scope.data.numberOfPoints : 5000;
						stopFreq = $scope.data.startFreq < $scope.data.stopFreq ? $scope.data.stopFreq : $scope.data.startFreq + $scope.data.bandwidth * 8;
						freqGHz = numeric.linspace($scope.data.startFreq, stopFreq, numberOfPoints);
						_context.next = 9;
						return regeneratorRuntime.awrap(common.xhr2('SynthesizeFromTranZeros', { rootP: tranZeros, N: $scope.data.filterOrder, returnLoss: $scope.data.returnLoss, topology: store.getState().topoM }));

					case 9:
						response = _context.sent;
						epsilon = numeric.t(response.epsilon[0], response.epsilon[1]);
						epsilonE = epsilon;
						coefP = response.coefP.map(function (d) {
							return numeric.t(d[0], d[1]);
						});
						coefF = response.coefF.map(function (d) {
							return numeric.t(d[0], d[1]);
						});
						coefE = response.coefE.map(function (d) {
							return numeric.t(d[0], d[1]);
						});
						sFromM = common.CM2S(response.targetMatrix, freqGHz, $scope.data.unloadedQ, $scope.data.centerFreq, $scope.data.bandwidth);


						$scope.S11dB_fromM = sFromM.S11.map(function (s) {
							return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10];
						});
						$scope.S21dB_fromM = sFromM.S21.map(function (s) {
							return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10];
						});
						$scope.GroupDelay_fromM = sFromM.S21.map(function (s, i, o) {
							var freqStep = i === o.length - 1 ? o[i][0] - o[i - 1][0] : o[i + 1][0] - o[i][0],
							    phase1 = Math.atan2(o[i][1].y, o[i][1].x),
							    phase2 = i === o.length - 1 ? 2 * Math.atan2(o[i][1].y, o[i][1].x) - Math.atan2(o[i - 1][1].y, o[i - 1][1].x) : Math.atan2(o[i + 1][1].y, o[i + 1][1].x),
							    phaseStep = phase2 - phase1;
							phaseStep = phaseStep - Math.round(phaseStep / Math.PI) * Math.PI;
							return [s[0], -phaseStep / (2 * Math.PI * freqStep)];
						});

						document.querySelector('#s11dbChart').click();

						$scope.data.targetMatrix = response.targetMatrix;
						$scope.data.message = response.message;
						$scope.$digest();

						tempString = "# GHZ S DB R 50";

						sFromM.S11.forEach(function (s, i) {
							var S11_dB = 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10,
							    S11_phase = Math.atan2(s[1].y, s[1].x) * 180 / Math.PI,
							    t = sFromM.S21[i],
							    S21_dB = 10 * Math.log(t[1].x * t[1].x + t[1].y * t[1].y) / Math.LN10,
							    S21_phase = Math.atan2(t[1].y, t[1].x) * 180 / Math.PI;
							tempString += "\n" + s[0] + " " + S11_dB + " " + S11_phase + " " + S21_dB + " " + S21_phase + " " + S21_dB + " " + S21_phase + " " + S11_dB + " " + S11_phase;
						});
						store.dispatch({ type: 'updateTempString', tempString: tempString });
						/* console.log(tempString.slice(0)); */
						_context.next = 31;
						break;

					case 28:
						_context.prev = 28;
						_context.t0 = _context['catch'](2);

						console.log(_context.t0.message);

					case 31:
					case 'end':
						return _context.stop();
				}
			}
		}, null, this, [[2, 28]]);
	};

	$timeout(function () {
		$scope.calculate();
	}, 500);

	function M2Nodeslinks(M, unitStep) {
		var N = M.length - 2,
		    nodes = [],
		    links = [],
		    i,
		    j,
		    k,
		    edgeIndex = 0;
		for (i = 0; i < N + 2; i++) {
			var label;
			switch (i) {
				case 0:
					label = 'S';
					break;
				case N + 1:
					label = 'L';
					break;
				default:
					label = i.toString();
			}
			nodes.push({ id: i, label: label, x: (i + 0.5) * unitStep, y: unitStep, size: 3 });
		}
		for (i = 0; i < N + 1; i++) {
			if (M[i][i + 1] === 1) {
				links.push({ id: edgeIndex, source: nodes[i], target: nodes[i + 1], size: 3, primary: true });
				edgeIndex++;
			}
		}
		for (i = 0; i < N; i++) {
			for (j = N + 1; j > i + 1; j--) {
				if (M[i][j] === 1) {
					links.push({ id: edgeIndex, source: nodes[i], target: nodes[j], size: 2, primary: false });
					edgeIndex++;
					if (j === i + 2 && nodes[i].y === nodes[j].y) {
						for (k = j; k < N + 2; k++) {
							nodes[k].x -= unitStep;
						}
						nodes[j - 1].x -= 0.5 * unitStep;
						nodes[j - 1].y += unitStep;
					} else if (nodes[i].y === nodes[j].y) {
						for (k = j; k < N + 2; k++) {
							nodes[k].x -= 2 * unitStep;
						}
						for (k = i + 1; k < j; k++) {
							nodes[k].x -= unitStep;
							nodes[k].y += unitStep;
						}
					}
				}
			}
		}

		return { nodes: nodes, links: links };
	}

	function handleChangeM() {
		var dataM = M2Nodeslinks(store.getState().topoM, 100),
		    nodes = dataM.nodes,
		    links = dataM.links,
		    minX = _.min(nodes.map(function (o) {
			return o.x;
		})),
		    maxX = _.max(nodes.map(function (o) {
			return o.x;
		})),
		    minY = _.min(nodes.map(function (o) {
			return o.y;
		})),
		    maxY = _.max(nodes.map(function (o) {
			return o.y;
		}));

		vis.transition().duration(750).attr("viewBox", minX - 50 + " " + (minY - 50) + " " + (maxX - minX + 100) + " " + (maxY - minY + 100)).attr("preserveAspectRatio", "xMidYMid meet");
		var selectLinks = vis.select("#group-links").selectAll("line").data(links),
		    selectNodes = vis.select("#group-nodes").selectAll("g.node").data(nodes);

		selectLinks.transition().duration(750).attr("x1", function (d) {
			return d.source.x;
		}).attr("y1", function (d) {
			return d.source.y;
		}).attr("x2", function (d) {
			return d.target.x;
		}).attr("y2", function (d) {
			return d.target.y;
		}).style("stroke", "#666666").style("stroke-width", "10px").style("stroke-dasharray", function (d) {
			return d.primary ? "" : "10, 4";
		});

		selectLinks.enter().append("line").attr("x1", function (d) {
			return d.source.x;
		}).attr("y1", function (d) {
			return d.source.y;
		}).attr("x2", function (d) {
			return d.target.x;
		}).attr("y2", function (d) {
			return d.target.y;
		}).style("stroke", "#666666").style("stroke-width", "10px").style("stroke-dasharray", function (d) {
			return d.primary ? "" : "10, 4";
		});

		selectLinks.exit().remove();

		selectNodes.transition().duration(750).attr("transform", function (d) {
			return "translate(" + d.x + "," + d.y + ")";
		});

		var eachNode = selectNodes.enter().append("svg:g").attr("class", "node").attr("transform", function (d) {
			return "translate(" + d.x + "," + d.y + ")";
		});

		eachNode.append("svg:circle").attr("class", "node-circle").attr("r", "18px").attr("fill", "#ff0000");

		eachNode.append("text").attr("class", "node-text").attr("dy", "5px").attr("text-anchor", "middle").text(function (d) {
			return d.label;
		});

		selectNodes.select(".node-text").text(function (d) {
			return d.label;
		});

		selectNodes.exit().remove();
	}

	ReactDOM.render(React.createElement(
		ReactRedux.Provider,
		{ store: store },
		React.createElement(MatrixTopologyContainer, null)
	), document.getElementById('matrix-topology-table'));

	$scope.$on("$destroy", function () {
		unsubscribe();
		store.dispatch({ type: 'savedSynthesisData', data: $scope.data });
	});
}]).controller("_extractmatrix", ['$scope', '$timeout', 'common', 'resolveObj', function ($scope, $timeout, common, resolveObj) {
	var linearChart1, linearChart2;
	$timeout(function () {
		var margin = {
			top: 40,
			right: 40,
			bottom: 50,
			left: 60
		};
		linearChart1 = new simpleD3LinearChart("graph-linear-chart1", margin, [0, 5], [-10, 50]);
		linearChart2 = new simpleD3LinearChart("graph-linear-chart2", margin, [0, 5], [-10, 50]);
	}, 80);

	$scope.data = { dataFromUpload: resolveObj.dataFromUpload, currentInstr: { id: 0, name: "Select instrument" } };

	$timeout(function () {
		var tempStoreState = store.getState();
		if (tempStoreState.hasOwnProperty("tempString")) {
			var sFile = common.ParseS2P(tempStoreState.tempString);
			store.dispatch({ type: 'saveSFile', data: sFile });
			extractMatrix(sFile);
		}
	}, 500);
	function extractMatrix(sFile) {
		var synStoreState, topoM, tranZeros, captureStartFreqGHz, captureStopFreqGHz, response, freqGHz, sFromExtractM;
		return regeneratorRuntime.async(function extractMatrix$(_context2) {
			while (1) {
				switch (_context2.prev = _context2.next) {
					case 0:
						_context2.prev = 0;
						synStoreState = store.getState().savedSynthesisData;
						topoM = store.getState().topoM;
						tranZeros = synStoreState.tranZeros.map(function (d) {
							return [Number(d[0]), Number(d[1])];
						}).filter(function (d) {
							return d[0] !== 0 || d[1] !== 0;
						});
						captureStartFreqGHz = $scope.data.captureStartFreqGHz || 0;
						captureStopFreqGHz = $scope.data.captureStopFreqGHz || 0;
						_context2.next = 8;
						return regeneratorRuntime.awrap(common.xhr2('ExtractMatrix', _extends({}, sFile, synStoreState, { tranZeros: tranZeros, topology: topoM, captureStartFreqGHz: captureStartFreqGHz, captureStopFreqGHz: captureStopFreqGHz })));

					case 8:
						response = _context2.sent;
						freqGHz = sFile.freq.map(function (f, i) {
							return f / 1000;
						});
						sFromExtractM = common.CM2S(response.extractedMatrix, freqGHz, response.q, synStoreState.centerFreq, synStoreState.bandwidth);


						/* 			$scope.S11dB_fromTargetM = sFromTargetM.S11.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});
      			$scope.S21dB_fromTargetM = sFromTargetM.S21.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});
      			$scope.S11ang_fromTargetM = sFromTargetM.S11.map(function(s){return [s[0], Math.atan2(s[1].y, s[1].x) * 180 / Math.PI]});
      			$scope.S21ang_fromTargetM = sFromTargetM.S21.map(function(s){return [s[0], Math.atan2(s[1].y, s[1].x) * 180 / Math.PI]}); */

						$scope.S11dB_fromExtractM = sFromExtractM.S11.map(function (s) {
							return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10];
						});
						$scope.S21dB_fromExtractM = sFromExtractM.S21.map(function (s) {
							return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10];
						});
						$scope.S11ang_fromExtractM = sFromExtractM.S11.map(function (s) {
							return [s[0], Math.atan2(s[1].y, s[1].x) * 180 / Math.PI];
						});
						$scope.S21ang_fromExtractM = sFromExtractM.S21.map(function (s) {
							return [s[0], Math.atan2(s[1].y, s[1].x) * 180 / Math.PI];
						});

						$scope.S11dB_fromSFile = sFile.freq.map(function (f, i) {
							return [f / 1000, sFile.S11_db[i]];
						});
						$scope.S21dB_fromSFile = sFile.freq.map(function (f, i) {
							return [f / 1000, sFile.S21_db[i]];
						});
						$scope.S11ang_fromSFile = sFile.freq.map(function (f, i) {
							return [f / 1000, sFile.S11_angRad[i] * 180 / Math.PI];
						});
						$scope.S21ang_fromSFile = sFile.freq.map(function (f, i) {
							return [f / 1000, sFile.S21_angRad[i] * 180 / Math.PI];
						});

						document.querySelector('#magnitudeChart').click();
						$scope.data.extractedMatrix = response.extractedMatrix;
						$scope.data.deviateMatrix = response.deviateMatrix;
						$scope.data.q = response.q;
						$scope.data.isSymmetric = synStoreState.isSymmetric;
						document.getElementById("p1-file").innerHTML = response.message;
						document.querySelector('#deviationTable').click();
						$scope.$digest();
						_context2.next = 32;
						break;

					case 29:
						_context2.prev = 29;
						_context2.t0 = _context2['catch'](0);

						document.getElementById("p1-file").innerHTML = _context2.t0.message;

					case 32:
					case 'end':
						return _context2.stop();
				}
			}
		}, null, this, [[0, 29]]);
	}

	$scope.showChart = function (select) {
		var data1, data2;
		switch (select.toLowerCase()) {
			case "phase":
				data1 = [{ label: "s2p S11", data: $scope.S11ang_fromSFile }, { label: "Extracted S11", data: $scope.S11ang_fromExtractM }];
				data2 = [{ label: "s2p S21", data: $scope.S21ang_fromSFile }, { label: "Extracted S21", data: $scope.S21ang_fromExtractM }];
				break;
			case "magnitude":
			default:
				data1 = [{ label: "s2p S11", data: $scope.S11dB_fromSFile }, { label: "Extracted S11", data: $scope.S11dB_fromExtractM }];
				data2 = [{ label: "s2p S21", data: $scope.S21dB_fromSFile }, { label: "Extracted S21", data: $scope.S21dB_fromExtractM }];
		}
		linearChart1.update(data1, true);
		linearChart2.update(data2, true);
	};

	$scope.showTable = function (select, tableDataFormat) {
		var data,
		    synStoreState = store.getState().savedSynthesisData;
		if (typeof select === "undefined") {
			$scope.data.matrixToShow = $scope.data.deviateMatrix;
		} else {
			switch (select.toLowerCase()) {
				case "targetmatrix":
					$scope.data.matrixToShow = synStoreState.targetMatrix;
					break;
				case "extractedmatrix":
					$scope.data.matrixToShow = $scope.data.extractedMatrix;
					break;
				case "deviation":
				default:
					$scope.data.matrixToShow = $scope.data.deviateMatrix;
			}
		}
		if (typeof tableDataFormat === "undefined") {
			$scope.data.tableDataFormat = 0;
		} else {
			$scope.data.tableDataFormat = tableDataFormat;
		}
	};

	if ($scope.data.dataFromUpload) {
		var handleFiles = function handleFiles() {
			var fileList = this.files; /* now you can work with the file list */
			reader.readAsText(fileList[0]);
		};

		var reader = new FileReader();
		reader.onload = function (evt) {
			var sFile;
			try {
				sFile = common.ParseS2P(evt.target.result);
				document.getElementById("p1-file").innerHTML = "S parameter file parsed successfully!";
				store.dispatch({ type: 'saveSFile', data: sFile });
				extractMatrix(sFile);
			} catch (e) {
				document.getElementById("p1-file").innerHTML = e.message;
			}
		};
		var inputElement = document.getElementById("input-s2p-file");
		inputElement.addEventListener("change", handleFiles, false);


		$scope.capture = function () {
			var tempStoreState = store.getState();
			if (tempStoreState.hasOwnProperty("sFile")) {
				var sFile = tempStoreState.sFile;
				extractMatrix(sFile);
			}
		};
	} else {
		$scope.capture = function _callee2() {
			var sFile, instrData;
			return regeneratorRuntime.async(function _callee2$(_context3) {
				while (1) {
					switch (_context3.prev = _context3.next) {
						case 0:
							if (!window.hasOwnProperty("preloaded")) {
								_context3.next = 7;
								break;
							}

							_context3.next = 3;
							return regeneratorRuntime.awrap(preloaded.KeysightPNAReadS($scope.data.currentInstr.name));

						case 3:
							_context3.t0 = Number;
							instrData = _context3.sent.split(",").map(_context3.t0);

							numFreq = instrData.length / 9;
							sFile = {
								freq: instrData.slice(0, numFreq),
								S11_db: instrData.slice(numFreq, 2 * numFreq),
								S11_angRad: instrData.slice(2 * numFreq, 3 * numFreq).map(function (a) {
									return a * Math.PI / 180;
								}),
								S21_db: instrData.slice(3 * numFreq, 4 * numFreq),
								S21_angRad: instrData.slice(4 * numFreq, 5 * numFreq).map(function (a) {
									return a * Math.PI / 180;
								})
							}, extractMatrix(sFile);

						case 7:
						case 'end':
							return _context3.stop();
					}
				}
			}, null, this);
		};

		$scope.searchInstrument = function _callee3() {
			return regeneratorRuntime.async(function _callee3$(_context4) {
				while (1) {
					switch (_context4.prev = _context4.next) {
						case 0:
							if (!window.hasOwnProperty("preloaded")) {
								_context4.next = 6;
								break;
							}

							_context4.next = 3;
							return regeneratorRuntime.awrap(preloaded.Visa32Find());

						case 3:
							_context4.t0 = function (a, i) {
								return { id: i, name: a };
							};

							$scope.data.instrumentList = _context4.sent.map(_context4.t0);

							$scope.$digest();

						case 6:
						case 'end':
							return _context4.stop();
					}
				}
			}, null, this);
		};

		$scope.changeCurrentInstrument = function (instrument) {
			$scope.data.currentInstr = instrument;
		};
	}
}]).controller("_optimize", ['$scope', '$sanitize', '$timeout', '$state', 'common', function ($scope, $sanitize, $timeout, $state, common) {
	function SerializeM(topoM, M, isSymmetric) {
		var i,
		    j,
		    N = topoM.length - 2,
		    result = [];
		for (i = 0; i < N + 2; i++) {
			for (j = 0; j < N + 2 - i; j++) {
				if (topoM[j][j + i] === 1 && !(isSymmetric && j + j + i > N + 1)) {
					result.push(M[j][j + i]);
				}
			}
		}
		return result;
	}

	function DeSerializeM(topoM, serM, isSymmetric) {
		var i,
		    j,
		    temp1,
		    indexSerM = 0,
		    N = topoM.length - 2,
		    result = [];
		for (i = 0; i < N + 2; i++) {
			result.push(_.range(0, N + 2, 0));
		}
		for (i = 0; i < N + 2; i++) {
			for (j = 0; j < N + 2 - i; j++) {
				if (topoM[j][j + i] === 1 && !(isSymmetric && j + j + i > N + 1)) {
					result[j][j + i] = serM[indexSerM];
					result[j + i][j] = serM[indexSerM];
					if (isSymmetric) {
						result[N + 1 - j][N + 1 - j - i] = serM[indexSerM];
						result[N + 1 - j - i][N + 1 - j] = serM[indexSerM];
					}
					indexSerM = indexSerM + 1;
				}
			}
		}
		return result;
	}

	function ModelHFSSDerivative(dimension, csvFile) {
		var temp1 = numeric.transpose(csvFile.split("\n").map(function (row) {
			return row.split(",").map(Number);
		}).slice(1, -1));
		this.dimension = dimension;
		this.freq = temp1[0];
		this.data = temp1.slice(1);
	}

	ModelHFSSDerivative.prototype.func = function (dimension) {
		var i,
		    temp1,
		    _this = this,
		    deltaDim = dimension.map(function (a, i) {
			return a - _this.dimension[i];
		}),
		    data = this.data.slice(0, 4),
		    s = data.map(function (a, row) {
			return a.map(function (b, col) {
				temp1 = b;
				for (i = 0; i < dimension.length; i++) {
					temp1 = temp1 + deltaDim[i] * _this.data[4 * i + 4 + row][col];
				}
				return temp1;
			});
		}),
		    freq = this.freq.map(function (a) {
			return a * 1000;
		}),
		    S11_db = s[0].map(function (a, i) {
			return 10 * Math.log(a * a + s[1][i] * s[1][i]) / Math.LN10;
		}),
		    S11_angRad = s[0].map(function (a, i) {
			return Math.atan2(s[1][i], a);
		}),
		    S21_db = s[2].map(function (a, i) {
			return 10 * Math.log(a * a + s[3][i] * s[3][i]) / Math.LN10;
		}),
		    S21_angRad = s[2].map(function (a, i) {
			return Math.atan2(s[3][i], a);
		}),
		    sFile = { freq: freq, S11_db: S11_db, S11_angRad: S11_angRad, S21_db: S21_db, S21_angRad: S21_angRad };
		return sFile;
	};

	function CoarseModelLinear() {
		this.slopeM = [];
		this.invSlopeM = [];
		this.intepM = [];
	}

	CoarseModelLinear.prototype.update = function _callee4(dimension, extractedMatrix, topology, isSymmetric) {
		var response;
		return regeneratorRuntime.async(function _callee4$(_context5) {
			while (1) {
				switch (_context5.prev = _context5.next) {
					case 0:
						_context5.next = 2;
						return regeneratorRuntime.awrap(common.xhr2('CoarseModelUpdate', { dimension: dimension, extractedMatrix: extractedMatrix, topology: topology, isSymmetric: isSymmetric }));

					case 2:
						response = _context5.sent;

						this.slopeM = response.slopeM;
						this.invSlopeM = response.invSlopeM;
						this.intepM = response.intepM;

					case 6:
					case 'end':
						return _context5.stop();
				}
			}
		}, null, this);
	};

	CoarseModelLinear.prototype.func = function (input) {
		var _this = this;
		return numeric.add(_this.intepM, numeric.dot(_this.slopeM, input));
	};
	CoarseModelLinear.prototype.defunc = function (output) {
		var _this = this;
		return numeric.dot(_this.invSlopeM, numeric.sub(output, _this.intepM));
	};

	function AddTimeLog(input, showTime) {
		if (typeof showTime === "undefined" || showTime) {
			var oDate = new Date();
			$scope.data.logs += "\n" + oDate.toLocaleString() + ": " + input;
		} else {
			$scope.data.logs += "\n" + input;
		}
		$timeout(function () {
			document.getElementById("textarea1").scrollTop = document.getElementById("textarea1").scrollHeight;
		}, 200);
	}

	$scope.reset = function () {
		/* $scope.data = {logs: "", captureStartFreqGHz: "", captureStopFreqGHz: "", iterList: [], currentIter: {id: 0, q: 1e9}, isSymmetric: synStoreState.isSymmetric || false, spacemapButtonDisable: false}; */
		$state.reload();
	};

	$scope.showTable = function (select, tableDataFormat) {
		var data,
		    synStoreState = store.getState().savedSynthesisData;
		if (typeof select === "undefined") {
			$scope.data.matrixToShow = $scope.data.deviateMatrix;
		} else {
			switch (select.toLowerCase()) {
				case "targetmatrix":
					$scope.data.matrixToShow = synStoreState.targetMatrix;
					break;
				case "extractedmatrix":
					$scope.data.matrixToShow = $scope.data.extractedMatrix;
					break;
				case "deviation":
				default:
					$scope.data.matrixToShow = $scope.data.deviateMatrix;
			}
		}
		if (typeof tableDataFormat === "undefined") {
			$scope.data.tableDataFormat = 0;
		} else {
			$scope.data.tableDataFormat = tableDataFormat;
		}
	};

	$scope.changeCurrentIteration = function (iteration) {
		var data, freqGHz, sFromExtractM, S11dB_fromExtractM, S21dB_fromExtractM, S11dB_fromSFile, S21dB_fromSFile;
		$scope.data.currentIter = iteration;
		$scope.data.extractedMatrix = iteration.extractedMatrix;
		$scope.data.deviateMatrix = iteration.deviateMatrix;

		freqGHz = iteration.sFile.freq.map(function (f, i) {
			return f / 1000;
		});

		S11dB_fromSFile = iteration.sFile.freq.map(function (f, i) {
			return [f / 1000, iteration.sFile.S11_db[i]];
		});
		S21dB_fromSFile = iteration.sFile.freq.map(function (f, i) {
			return [f / 1000, iteration.sFile.S21_db[i]];
		});

		sFromExtractM = common.CM2S(iteration.extractedMatrix, freqGHz, iteration.q, synStoreState.centerFreq, synStoreState.bandwidth);

		S11dB_fromExtractM = sFromExtractM.S11.map(function (s) {
			return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10];
		});
		S21dB_fromExtractM = sFromExtractM.S21.map(function (s) {
			return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10];
		});

		data = [{ label: "HFSS S11", data: S11dB_fromSFile }, { label: "Extracted S11", data: S11dB_fromExtractM }];
		linearChart1.update(data, true);
		data = [{ label: "HFSS S21", data: S21dB_fromSFile }, { label: "Extracted S21", data: S21dB_fromExtractM }];
		linearChart2.update(data, true);

		setTimeout(function () {
			document.querySelector('#deviationTable').click();
		}, 100);
	};

	$scope.assignVariables = function _callee5() {
		var i, j, k, N, indexName, predictNames, row, col, temp1, temp2;
		return regeneratorRuntime.async(function _callee5$(_context6) {
			while (1) {
				switch (_context6.prev = _context6.next) {
					case 0:
						if (!(window.hasOwnProperty("preloaded") && !variableAssigned)) {
							_context6.next = 50;
							break;
						}

						N = topoM.length - 2, indexName = 0, predictNames = [];
						_context6.next = 4;
						return regeneratorRuntime.awrap(preloaded.GetHFSSVariables());

					case 4:
						_context6.t0 = function (a, i) {
							return { id: i, name: a };
						};

						$scope.data.variableNames = _context6.sent.map(_context6.t0);
						_context6.next = 8;
						return regeneratorRuntime.awrap(preloaded.GetHFSSVariableValue($scope.data.variableNames.map(function (a) {
							return a.name;
						})));

					case 8:
						$scope.data.variableValue = _context6.sent;

						$scope.data.originVarNames = [];
						i = 0;

					case 11:
						if (!(i < N + 2)) {
							_context6.next = 46;
							break;
						}

						j = 0;

					case 13:
						if (!(j < N + 2 - i)) {
							_context6.next = 43;
							break;
						}

						if (!(topoM[j][j + i] === 1 && !($scope.data.isSymmetric && j + j + i > N + 1))) {
							_context6.next = 40;
							break;
						}

						row = j < 10 ? j.toString() : String.fromCharCode(65 + j - 10), col = j + i < 10 ? (j + i).toString() : String.fromCharCode(65 + j + i - 10), temp1 = "M" + row.toString() + col.toString(), temp2 = "M" + j.toString() + (j + i).toString();

						$scope.data.originVarNames.push({ id: indexName, name: temp1 });
						predictNames.push(0);
						k = 0;

					case 19:
						if (!(k < $scope.data.variableNames.length)) {
							_context6.next = 39;
							break;
						}

						if (!($scope.data.variableNames[k].name.toUpperCase().indexOf(temp1) !== -1)) {
							_context6.next = 23;
							break;
						}

						predictNames[indexName] = k;
						return _context6.abrupt('break', 39);

					case 23:
						if (!($scope.data.variableNames[k].name.toUpperCase().indexOf(temp2) !== -1)) {
							_context6.next = 26;
							break;
						}

						predictNames[indexName] = k;
						return _context6.abrupt('break', 39);

					case 26:
						if (!(j === N && j + i === N + 1)) {
							_context6.next = 36;
							break;
						}

						if (!($scope.data.variableNames[k].name.toUpperCase().indexOf("M" + row.toString() + "L") !== -1)) {
							_context6.next = 30;
							break;
						}

						predictNames[indexName] = k;
						return _context6.abrupt('break', 39);

					case 30:
						if (!($scope.data.variableNames[k].name.toUpperCase().indexOf("M" + "0" + "L") !== -1)) {
							_context6.next = 33;
							break;
						}

						predictNames[indexName] = k;
						return _context6.abrupt('break', 39);

					case 33:
						if (!($scope.data.variableNames[k].name.toUpperCase().indexOf("M" + row.toString() + "0") !== -1)) {
							_context6.next = 36;
							break;
						}

						predictNames[indexName] = k;
						return _context6.abrupt('break', 39);

					case 36:
						k++;
						_context6.next = 19;
						break;

					case 39:
						indexName += 1;

					case 40:
						j++;
						_context6.next = 13;
						break;

					case 43:
						i++;
						_context6.next = 11;
						break;

					case 46:
						$scope.data.dimensionNames = $scope.data.originVarNames.map(function (a, i) {
							return $scope.data.variableNames[predictNames[i]];
						});
						$scope.data.lowerLimit = $scope.data.originVarNames.map(function (a, i) {
							return 0.5 * $scope.data.variableValue[predictNames[i]];
						});
						$scope.data.upperLimit = $scope.data.originVarNames.map(function (a, i) {
							return 2.0 * $scope.data.variableValue[predictNames[i]];
						});
						/* console.log("$scope.data.dimensionNames\n", $scope.data.dimensionNames); */
						$scope.$digest();

					case 50:
					case 'end':
						return _context6.stop();
				}
			}
		}, null, this);
	};

	$scope.changeVariableAssign = function (itemId) {
		variableAssigned = true;
		var temp1 = $scope.data.variableNames.filter(function (a) {
			return a.name === $scope.data.dimensionNames[itemId].name;
		});
		$scope.data.lowerLimit[itemId] = 0.5 * $scope.data.variableValue[temp1[0].id];
		$scope.data.upperLimit[itemId] = 2.0 * $scope.data.variableValue[temp1[0].id];
	};

	$scope.write2EM = function _callee6(dimension) {
		var tempDimNames;
		return regeneratorRuntime.async(function _callee6$(_context7) {
			while (1) {
				switch (_context7.prev = _context7.next) {
					case 0:
						tempDimNames = $scope.data.dimensionNames.map(function (a) {
							return a.name;
						});

						$scope.data.write2EMButtonHtml = "Setting ... " + "<i class='fa fa-refresh fa-spin fa-fw'></i>";
						/* console.log(tempDimNames, $scope.data.currentIter.dimension); */
						_context7.next = 4;
						return regeneratorRuntime.awrap(preloaded.SetHFSSVariableValue(tempDimNames, dimension));

					case 4:
						$timeout(function () {
							$scope.data.write2EMButtonHtml = "Update HFSS";
						}, 500);

					case 5:
					case 'end':
						return _context7.stop();
				}
			}
		}, null, this);
	};

	$scope.manualSet = function () {
		$scope.data.manualVariableValue = angular.copy($scope.data.currentIter.dimension);
		$scope.data.manualDeviation = SerializeM(topoM, $scope.data.currentIter.deviateMatrix, $scope.data.isSymmetric);
	};

	$scope.stopSimulation = function () {
		$scope.data.stopSimulation = true;
		AddTimeLog("---------------------------------------------------------------------------------------------------------------", false);
		AddTimeLog("Interrupted by user. Waiting for the last iteration to finish ...");
	};

	$scope.spacemapping = function _callee7() {
		var tranZeros, captureStartFreqGHz, captureStopFreqGHz, numberOfPoints, stopFreq, freqGHz, response, sFile, i, j, N, indexIter, tempIter, coarseModel, resultDim2M, modelHFSSDerivative, initDimension, Dim2M, xc_star, xf, xc, B, h;
		return regeneratorRuntime.async(function _callee7$(_context9) {
			while (1) {
				switch (_context9.prev = _context9.next) {
					case 0:
						Dim2M = function Dim2M() {
							var temp1, csvFile, tempDimNames;
							return regeneratorRuntime.async(function Dim2M$(_context8) {
								while (1) {
									switch (_context8.prev = _context8.next) {
										case 0:
											_context8.prev = 0;
											tempDimNames = $scope.data.dimensionNames.map(function (a) {
												return a.name;
											});

											AddTimeLog("Simulation in process with the following dimension.\n\t" + JSON.stringify(tempDimNames).replace(/,/g, ", ") + "\n\t" + JSON.stringify(tempIter.dimension).replace(/,/g, ", "));
											tempIter.s2p = "s" + indexIter.toString() + ".s2p";

											if (!($scope.data.useDerivative && indexIter === 0)) {
												_context8.next = 9;
												break;
											}

											_context8.next = 7;
											return regeneratorRuntime.awrap(preloaded.EvaluateDerivative(tempDimNames, tempIter.dimension));

										case 7:
											csvFile = _context8.sent;

											modelHFSSDerivative = new ModelHFSSDerivative(tempIter.dimension, csvFile);

										case 9:
											if (!($scope.data.useDerivative && indexIter < $scope.data.numPerturb)) {
												_context8.next = 13;
												break;
											}

											sFile = modelHFSSDerivative.func(tempIter.dimension);
											_context8.next = 16;
											break;

										case 13:
											_context8.next = 15;
											return regeneratorRuntime.awrap(preloaded.EvaluateDimension(tempDimNames, tempIter.dimension, tempIter.s2p));

										case 15:
											sFile = _context8.sent;

										case 16:
											AddTimeLog("Simulation completed. Extracting coupling matrix.");
											_context8.next = 19;
											return regeneratorRuntime.awrap(common.xhr2('ExtractMatrix', _extends({}, sFile, synStoreState, { tranZeros: tranZeros, topology: topoM, captureStartFreqGHz: captureStartFreqGHz, captureStopFreqGHz: captureStopFreqGHz })));

										case 19:
											response = _context8.sent;

											temp1 = SerializeM(topoM, response.deviateMatrix, $scope.data.isSymmetric).map(function (a) {
												return Math.round(a * 10000) / 10000;
											});
											AddTimeLog("Coupling matrix extracted. The deviation is \n\t" + JSON.stringify(temp1).replace(/,/g, ", "));
											tempIter.sFile = sFile;
											tempIter.extractedMatrix = response.extractedMatrix;
											tempIter.deviateMatrix = response.deviateMatrix;
											tempIter.q = response.q;
											$scope.data.iterList.push(angular.copy(tempIter));
											$scope.$digest();
											document.querySelector('#iteration' + tempIter.id.toString()).click();
											/* 				setTimeout(function(){
           					console.log(document.querySelector('#iteration' + tempIter.id.toString()))
           					document.querySelector('#iteration' + tempIter.id.toString()).click();
           				}, 3000); */
											return _context8.abrupt('return', 0);

										case 32:
											_context8.prev = 32;
											_context8.t0 = _context8['catch'](0);

											AddTimeLog(_context8.t0.message);
											return _context8.abrupt('return', undefined);

										case 36:
										case 'end':
											return _context8.stop();
									}
								}
							}, null, this, [[0, 32]]);
						};

						tranZeros = synStoreState.tranZeros.map(function (d) {
							return [Number(d[0]), Number(d[1])];
						}).filter(function (d) {
							return d[0] !== 0 || d[1] !== 0;
						}), captureStartFreqGHz = $scope.data.captureStartFreqGHz || 0, captureStopFreqGHz = $scope.data.captureStopFreqGHz || 0, numberOfPoints = synStoreState.numberOfPoints < 5000 ? synStoreState.numberOfPoints : 5000, stopFreq = synStoreState.startFreq < synStoreState.stopFreq ? synStoreState.stopFreq : synStoreState.startFreq + synStoreState.bandwidth * 8, freqGHz = numeric.linspace(synStoreState.startFreq, stopFreq, numberOfPoints);
						N = topoM.length - 2;
						indexIter = 0;
						tempIter = {};
						coarseModel = new CoarseModelLinear();
						_context9.next = 8;
						return regeneratorRuntime.awrap(preloaded.GetHFSSVariableValue($scope.data.dimensionNames.map(function (a) {
							return a.name;
						})));

					case 8:
						initDimension = _context9.sent;

						$scope.data.iterList = [];
						$scope.data.spacemapButtonDisable = true;
						$scope.data.stopSimulation = false;

						AddTimeLog("Space mapping started.");

						if (window.hasOwnProperty("preloaded")) {
							_context9.next = 16;
							break;
						}

						AddTimeLog("Space mapping cannot be run in browser.");
						return _context9.abrupt('return', 0);

					case 16:
						i = 0;

					case 17:
						if (!(i < $scope.data.numPerturb)) {
							_context9.next = 37;
							break;
						}

						if (!$scope.data.stopSimulation) {
							_context9.next = 23;
							break;
						}

						$scope.data.spacemapButtonDisable = false;
						AddTimeLog("", false);
						AddTimeLog("Simulation stopped by user.");
						return _context9.abrupt('return', 0);

					case 23:
						;
						tempIter.id = indexIter;
						if (i === 0) {
							tempIter.dimension = initDimension;
						} else {
							tempIter.dimension = initDimension.map(function (a, i) {
								var N = topoM.length - 2,
								    randNum = Math.random(),
								    dev = (randNum < 0.5 ? randNum - 1 : randNum) * $scope.data.perturbationStep,
								    L = $scope.data.isSymmetric ? Math.floor((N + 1) / 2) : N,
								    temp1 = i < L ? a + dev / 2 : a + dev;
								return Math.round(temp1 * 100000) / 100000;
							});
						}
						AddTimeLog("---------------------------------------------------------------------------------------------------------------", false);
						AddTimeLog("Iteration " + (indexIter + 1).toString() + " starts. Perturbation " + (i + 1).toString() + " out of " + $scope.data.numPerturb.toString());
						_context9.next = 30;
						return regeneratorRuntime.awrap(Dim2M());

					case 30:
						resultDim2M = _context9.sent;

						if (!(typeof resultDim2M === "undefined")) {
							_context9.next = 33;
							break;
						}

						return _context9.abrupt('return', 0);

					case 33:
						indexIter = indexIter + 1;

					case 34:
						i++;
						_context9.next = 17;
						break;

					case 37:
						_context9.next = 39;
						return regeneratorRuntime.awrap(coarseModel.update($scope.data.iterList.map(function (a) {
							return a.dimension;
						}), $scope.data.iterList.map(function (a) {
							return SerializeM(topoM, a.extractedMatrix, $scope.data.isSymmetric);
						}), topoM, $scope.data.isSymmetric));

					case 39:
						xc_star = coarseModel.defunc(SerializeM(topoM, synStoreState.targetMatrix, $scope.data.isSymmetric)).map(function (a, i) {
							if (a < $scope.data.lowerLimit[i]) {
								return $scope.data.lowerLimit[i];
							} else if (a > $scope.data.upperLimit[i]) {
								return $scope.data.upperLimit[i];
							} else {
								return a;
							}
						});
						xf = xc_star;
						B = numeric.identity(xf.length);
						h = numeric.rep([xf.length], 1e9);
						i = 0;

					case 44:
						if (!(i < $scope.data.numIteration)) {
							_context9.next = 83;
							break;
						}

						if (!$scope.data.stopSimulation) {
							_context9.next = 50;
							break;
						}

						$scope.data.spacemapButtonDisable = false;
						AddTimeLog("", false);
						AddTimeLog("Simulation stopped by user.");
						return _context9.abrupt('return', 0);

					case 50:
						;
						tempIter.id = indexIter;
						tempIter.dimension = xf.map(function (a) {
							return Math.round(a * 100000) / 100000;
						});
						AddTimeLog("---------------------------------------------------------------------------------------------------------------", false);
						AddTimeLog("Iteration " + (indexIter + 1).toString() + " starts. Run " + (i + 1).toString() + " out of " + $scope.data.numIteration.toString());
						_context9.next = 57;
						return regeneratorRuntime.awrap(Dim2M());

					case 57:
						resultDim2M = _context9.sent;

						if (!(typeof resultDim2M === "undefined")) {
							_context9.next = 60;
							break;
						}

						return _context9.abrupt('return', 0);

					case 60:
						/* await coarseModel.update($scope.data.iterList.map(function (a) {return a.dimension}).slice(-numPerturb), $scope.data.iterList.map(function (a) {return SerializeM(topoM, a.extractedMatrix, $scope.data.isSymmetric)}).slice(-numPerturb), topoM, $scope.data.isSymmetric); */
						xc = coarseModel.defunc(SerializeM(topoM, tempIter.extractedMatrix, $scope.data.isSymmetric));
						_context9.prev = 61;
						_context9.next = 64;
						return regeneratorRuntime.awrap(common.xhr2('SpaceMappingCalculate', { B: B, h: h, xc: xc, xc_star: xc_star, xf: xf, lowerLimit: $scope.data.lowerLimit, upperLimit: $scope.data.upperLimit }));

					case 64:
						response = _context9.sent;

						AddTimeLog("h: " + JSON.stringify(response.h).replace(/,/g, ", "));
						AddTimeLog("f: " + JSON.stringify(response.f).replace(/,/g, ", "));
						_context9.next = 73;
						break;

					case 69:
						_context9.prev = 69;
						_context9.t0 = _context9['catch'](61);

						AddTimeLog(_context9.t0.message);
						return _context9.abrupt('return', 0);

					case 73:
						B = response.B;
						h = response.h;
						xf = response.xf;
						/* console.log(xf, B, h, response.toStop); */

						if (!(response.toStop === 1)) {
							_context9.next = 79;
							break;
						}

						AddTimeLog("Space mapping converged to a solution.");
						return _context9.abrupt('break', 83);

					case 79:
						indexIter = indexIter + 1;

					case 80:
						i++;
						_context9.next = 44;
						break;

					case 83:
						$scope.data.spacemapButtonDisable = false;
						AddTimeLog("----------------------------------------------------------------------------------------", false);
						AddTimeLog("Space mapping finished.");

					case 86:
					case 'end':
						return _context9.stop();
				}
			}
		}, null, this, [[61, 69]]);
	}; // end of $scope.spacemapping

	var synStoreState,
	    topoM,
	    variableAssigned = false,
	    linearChart1,
	    linearChart2;
	$timeout(function () {
		synStoreState = store.getState().savedSynthesisData;
		topoM = store.getState().topoM;

		var margin = {
			top: 40,
			right: 40,
			bottom: 50,
			left: 60
		};
		linearChart1 = new simpleD3LinearChart("graph-linear-chart1", margin, [0, 5], [-10, 50]);
		linearChart2 = new simpleD3LinearChart("graph-linear-chart2", margin, [0, 5], [-10, 50]);

		$scope.data = {
			logs: "",
			captureStartFreqGHz: "",
			captureStopFreqGHz: "",
			iterList: [],
			currentIter: { id: 0, q: 1e9 },
			isSymmetric: synStoreState.isSymmetric || false,
			spacemapButtonDisable: false,
			perturbationStep: Math.round(0.001 * 30.0 / synStoreState.centerFreq * 1000) / 1000,
			write2EMButtonHtml: "Update HFSS",
			numPerturb: 10,
			numIteration: 10,
			useDerivative: true
		};

		if (window.hasOwnProperty("preloaded")) {
			(function _callee8() {
				var temp1;
				return regeneratorRuntime.async(function _callee8$(_context10) {
					while (1) {
						switch (_context10.prev = _context10.next) {
							case 0:
								_context10.next = 2;
								return regeneratorRuntime.awrap(preloaded.Try(['H', 'e', 'l', 'l', 'o', '!', ' Please make sure:']));

							case 2:
								temp1 = _context10.sent.join("");

								AddTimeLog(temp1, false);
								AddTimeLog("1. the current design is open", false);
								AddTimeLog("2. \"Setup1:Sweep1\" is correctly set up", false);
								AddTimeLog("3. variable value is number instead of expression in HFSS", false);
								AddTimeLog("", false);

							case 8:
							case 'end':
								return _context10.stop();
						}
					}
				}, null, this);
			})();
			$scope.assignVariables();
		} else {
			AddTimeLog("Space mapping cannot be run in browser. Special client software required.", false);
		}
	}, 500);
}]).directive('hideTabs', ['$rootScope', function ($rootScope) {
	return {
		restrict: 'A',
		link: function link($scope, $el) {
			$rootScope.hideTabs = 'tabs-item-hide';
			$scope.$on('$destroy', function () {
				$rootScope.hideTabs = '';
			});
		}
	};
}]).directive('nsFillForm', [function () {
	return {
		restrict: 'AE',
		scope: {
			nsFields: '=nsFields',
			nsFormData: '=nsFormData',
			nsCancel: '&nsCancel',
			nsSave: '&nsSave',
			nsDelete: '&nsDelete'
		},
		templateUrl: '_nsFillForm.html',
		link: function link(scope, element, attrs) {
			scope.nsShowDelete = attrs.hasOwnProperty('nsShowDelete') ? attrs.nsShowDelete === 'true' : false;
		}
	};
}]).directive('nsSearchBox', [function () {
	return {
		restrict: 'AE',
		scope: {
			nsSearch: '=nsSearch',
			nsClickButton: '&nsClickButton'
		},
		templateUrl: '_nsSearchBox.html',
		link: function link(scope, element, attrs) {
			scope.nsShowButton = attrs.hasOwnProperty('nsShowButton') ? attrs.nsShowButton === 'true' : false;
		}
	};
}]).directive('nsLinkBox', ['$state', function ($state) {
	return {
		restrict: 'AE',
		transclude: true,
		scope: {},
		templateUrl: '_nsLinkBox.html',
		link: function link(scope, element, attrs) {
			scope.nsState = attrs.hasOwnProperty('nsState') ? attrs.nsState : "";
			scope.nsIcon = attrs.hasOwnProperty('nsIcon') ? attrs.nsIcon : "";
			scope.$state = $state;
		}
	};
}]);

/* angular.element(document).ready(function () {
	angular.bootstrap(document, ['content']);
}); */
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

angular.module('myAppE2E', ['content', 'ngMockE2E']).run(['$httpBackend', '$timeout', function ($httpBackend, $timeout) {
	var user = [{ id: 1, email: 'guest@groupbuy.com', password: 'g', primaryaddr: 2 }],
	    address = [{ id: 1, user: 0, streetno: '10', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5' }, { id: 2, user: 0, streetno: '20', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5' }, { id: 3, user: 0, streetno: '30', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5' }, { id: 4, user: 0, streetno: '40', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5' }],
	    store = [{ id: 1, user: 0, name: 'corner store', streetno: '10', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5', description: 'Electronic commodity', deliveryplan: "[{distance: 1, radius: 0.2, order: 200, currency: 'CAD'}]" }];

	$httpBackend.whenRoute('GET', /.+\.html$/).passThrough();
	$httpBackend.whenRoute('POST', '/python/:method').passThrough();

	if (window.location.hostname.indexOf("localhost") === -1) {
		$httpBackend.whenRoute('POST', '/ajax/:method').passThrough();
	} else {
		console.log("dummy /ajax/:method used");
		$httpBackend.whenRoute('POST', '/ajax/:method').respond(function (method, url, data, headers, params) {
			var body = JSON.parse(data),
			    tempUser = void 0;
			switch (params.method) {
				case 'isLoggedIn':
					return [200, "success"];
					break;
				case 'updateUser':
					user[0].primaryaddr = body.primaryaddr;
				case 'getUser':
					tempUser = angular.copy(user[0]);
					tempUser.password = undefined;
					return [200, tempUser];
					break;
				case 'getAddressList':
					return [200, address];
					break;
				case 'saveAddress':
					if (body.hasOwnProperty("id")) {
						var tempIndex = address.map(function (o) {
							return o.id;
						}).indexOf(body.id);
						address[tempIndex] = body;
					} else {
						address.push(_extends({ id: _.last(address).id + 1 }, body, { user: 0 }));
					}
					return [200, address];
					break;
				case 'deleteAddress':
					if (body.hasOwnProperty("id")) {
						var _tempIndex = address.map(function (o) {
							return o.id;
						}).indexOf(body.id);
						address.splice(_tempIndex, 1);
					}
					return [200, address];
					break;
				default:
					return [200, {}];
			}
		});
	}
}]);

angular.element(document).ready(function () {
	angular.bootstrap(document, ['myAppE2E']);
});

//# sourceMappingURL=content_compiled.js.map