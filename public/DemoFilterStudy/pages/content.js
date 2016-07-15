angular
.module("content", ['KM_tools', 'socket.io', 'infinite-scroll', 'ui.router', 'ngAnimate', 'ngSanitize'])
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$stateProvider
	.state('index', {
		url: "/",
		abstract: true,
		templateUrl: "_index_web.html"
	})
	.state('synthesis', {
		url: "/synthesis",
    views: {
      'mainpage': {
				templateUrl: '_synthesis.html',
				controller: '_synthesis'
			}
    },
		onExit: function(){ ReactDOM.unmountComponentAtNode(document.getElementById('matrix-topology-table'));}
	})
	.state('optimize', {
		url: "/optimize",
    views: {
      'mainpage': {
				templateUrl: '_optimize.html',
				controller: '_optimize'
			}
    }
	});
	$urlRouterProvider.otherwise("/synthesis");
}])
.config(['$socketProvider', 'configPara', function ($socketProvider, configPara) {
		$socketProvider.setConnectionUrl(configPara.ip);
	}
])
.run(['$rootScope', 'common', '$timeout', function ($rootScope, common, $timeout) {
	}
])
.controller("content_main", ['$scope', 'common', function ($scope, common) {
	common.xhr('isLoggedIn', {}).then(function (msg) {
		if (msg) {
		} else {
			window.location.assign("login.html");
		}
	});
	$scope.logoff = function () {
		common.xhr('logoff', {}).then(function (msg) {
			if (msg) {
			} else {
				window.location.assign("login.html");
			}
		});
	};
}])
.controller("_synthesis", ['$scope', 'common', '$timeout', '$http', function ($scope, common, $timeout, $http) {
/* 	(async function(){
		try {
			var temp1 = await common.xhr2('try', {myval: "hello from browser!", myval2: "hello from browser!"});
			$scope.python = JSON.stringify(temp1);
		} catch(e){
			$scope.python = e.message;
		}
		$scope.$digest();
	})(); */
	$scope.data = {
		filterOrder: 6,
		returnLoss: 20,
		centerFreq: 1000,
		bandwidth: 20,
		unloadedQ: 2000,
		startFreq: 960,
		stopFreq: 1040,
		numberOfPoints: 1000,
		filterType: "BPF",
		tranZeros: [['', 1.5], ['', '']],
		matrixDisplay: "M"
	}
	$scope.calculate = async function(){
		function polyResult(coef){
			return vanderN.map(function(v){
				return coef.reduce(function(t, d, i){
					return t.add(d.mul(v[i]));
				}, numeric.t(0, 0))
			});
		};
		try {
			var tranZeros = $scope.data.tranZeros
				.map(function(d){return [Number(d[0]), Number(d[1])]})
				.filter(function(d){return (d[0] !== 0) || (d[1] !== 0)}),
			
				responce = await common.xhr2('SynthesizeFromTranZeros', {rootP: tranZeros, N: $scope.data.filterOrder, returnLoss: $scope.data.returnLoss}),

				epsilon = numeric.t(responce.epsilon[0], responce.epsilon[1]),
				coefP = responce.coefP.map(function(d){return numeric.t(d[0], d[1])}),
				coefF = responce.coefF.map(function(d){return numeric.t(d[0], d[1])}),
				coefE = responce.coefE.map(function(d){return numeric.t(d[0], d[1])}),
				numberOfPoints = ($scope.data.numberOfPoints < 5000)? $scope.data.numberOfPoints : 5000,
				stopFreq = ($scope.data.startFreq < $scope.data.stopFreq)? $scope.data.stopFreq : $scope.data.startFreq + $scope.data.bandwidth * 8,
				freqMHz = numeric.linspace($scope.data.startFreq, stopFreq, numberOfPoints),
				bw = $scope.data.bandwidth,
				w0 = Math.sqrt(($scope.data.centerFreq - bw / 2) * ($scope.data.centerFreq + bw / 2)),
				q = $scope.data.unloadedQ,
				N = $scope.data.filterOrder,
				normalizedS = freqMHz.map(function(d){return numeric.t(1 / q, (w0 / bw) * (d / w0 - w0 / d))}),
				normalizedFreq = freqMHz.map(function(d){return numeric.t((w0 / bw) * (d / w0 - w0 / d), -1 / q)}),
				vanderN = normalizedS.map(function(d){
					var i, result = [], temp1 = numeric.t(1, 0);
					for (i = 0; i < N + 1; i++){
						result.push(temp1);
						temp1 = temp1.mul(d);
					}
					return result;
				}),
				polyResultP = polyResult(coefP),
				polyResultF = polyResult(coefF),
				polyResultE = polyResult(coefE),
				S11 = freqMHz.map(function(f, i){return [f / 1000, polyResultF[i].div(polyResultE[i])]}),
				S21 = freqMHz.map(function(f, i){return [f / 1000, polyResultP[i].div(polyResultE[i]).div(epsilon)]}),
				S11dB = S11.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]}),
				S21dB = S21.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});

			$scope.data.targetMatrix = responce.targetMatrix;
			var S11_fromM = [],
				S21_fromM = [],			
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
				
				Z = numeric.t(numeric.add(FUX, responce.targetMatrix), numeric.add(FUY, minusR));
				
				Y = Z.inv();
				
				S11_fromM.push([freqMHz[i] / 1000 + 0.001, numeric.t(Y.x[0][0], Y.y[0][0]).mul(numeric.t(0, 2)).add(1)]);
				S21_fromM.push([freqMHz[i] / 1000 + 0.001, numeric.t(Y.x[N+1][0], Y.y[N+1][0]).mul(numeric.t(0, -2))]);
			});
			var S11dB_fromM = S11_fromM.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]}),
				S21dB_fromM = S21_fromM.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]}),
/* 				data = [{label: "S11(dB)", data: S11dB}, {label: "S21(dB)", data: S21dB}, {label: "S11fromM(dB)", data: S11dB_fromM}, {label: "S21fromM(dB)", data: S21dB_fromM}]; */
				data = [{label: "S11(dB)", data: S11dB_fromM}, {label: "S21(dB)", data: S21dB_fromM}];

			linearChart.update(data, true);			

			$scope.$digest();
		} catch(e){
			console.log(e.message);
		}
	}
	var margin = {
		top: 40,
		right: 40,
		bottom: 50,
		left: 60
	}
	var linearChart = new simpleD3LinearChart("graph-linear-chart", margin, [0, 5], [-10, 50]);
	var data = [], data1 = [], data2 = [];

	for (var i = 0; i < 500; i++) {
		data1.push([i/100, Math.sin(i/100) * 20 + 10]);
		data2.push([i/120, Math.cos(i/120) * 10 + 10]);
	}

	data.push({label: "S11(dB)", data: data1});
	data.push({label: "S21(dB)", data: data2});
	
	linearChart.update(data, false);
	

	function M2Nodeslinks(M, unitStep){
		var N = M.length - 2, nodes = [], links = [], i, j, k, edgeIndex = 0;
		for (i = 0; i < N + 2; i++){
			var label;
			switch (i) {
				case 0:
					label = 'S';
					break;
				case (N + 1):
					label = 'L';
					break;
				default:
					label = i.toString();
			}
			nodes.push({id: i, label: label, x: (i + 0.5) * unitStep, y: unitStep, size: 3});
		}
		for (i = 0; i < N + 1; i++){
			links.push({id: edgeIndex, source: nodes[i], target: nodes[i + 1], size: 3, primary: true});
			edgeIndex++;
		}
		for (i = 0; i < N; i++){
			for (j = N + 1; j > i + 1; j--){
				if (M[i][j] === 1){
					links.push({id: edgeIndex, source: nodes[i], target: nodes[j], size: 2, primary: false});
					edgeIndex++;
					if ((j === i + 2) && (nodes[i].y === nodes[j].y)){
						for (k = j; k < N + 2; k++){
							nodes[k].x -= unitStep;
						}
						nodes[j - 1].x -= 0.5 * unitStep;
						nodes[j - 1].y += unitStep;
					} else if (nodes[i].y === nodes[j].y){
						for (k = j; k < N + 2; k++){
							nodes[k].x -= 2 * unitStep;
						}
						for (k = i + 1; k < j; k++){
							nodes[k].x -= unitStep;
							nodes[k].y += unitStep;
						}
					}
				}
			}
		}
		
		return {nodes: nodes, links: links}
	}

function handleChangeM(){
	var dataM = M2Nodeslinks(store.getState().topoM, 100),
	nodes = dataM.nodes,
	links = dataM.links,
	minX = _.min(nodes.map(function(o){return o.x})),
	maxX = _.max(nodes.map(function(o){return o.x})),
	minY = _.min(nodes.map(function(o){return o.y})),
	maxY = _.max(nodes.map(function(o){return o.y}));

	vis
	.transition().duration(750)
	.attr("viewBox", (minX - 50) + " " + (minY - 50) + " " + (maxX - minX + 100) + " " + (maxY - minY + 100))
	.attr("preserveAspectRatio", "xMidYMid meet");
	var selectLinks = vis.select("#group-links").selectAll("line").data(links),
		selectNodes = vis.select("#group-nodes").selectAll("g.node").data(nodes);

			selectLinks
				.transition().duration(750)
				.attr("x1", function(d) { return d.source.x })
				.attr("y1", function(d) { return d.source.y })
				.attr("x2", function(d) { return d.target.x })
				.attr("y2", function(d) { return d.target.y })
				.style("stroke", "#666666")
				.style("stroke-width", "10px")
				.filter(function(d){return !d.primary})
				.style("stroke-dasharray", "10, 4");

			selectLinks
				.enter()
				.append("line")
				.attr("x1", function(d) { return d.source.x })
				.attr("y1", function(d) { return d.source.y })
				.attr("x2", function(d) { return d.target.x })
				.attr("y2", function(d) { return d.target.y })
				.style("stroke", "#666666")
				.style("stroke-width", "10px")
				.filter(function(d){return !d.primary})
				.style("stroke-dasharray", "10, 4");
				
			selectLinks.exit().remove();
			
			selectNodes
			.transition().duration(750)
			.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")"});
			
			let eachNode = selectNodes
      .enter()
      .append("svg:g")
      .attr("class", "node")
			.attr("transform", function(d){return "translate(" + d.x + "," + d.y + ")"});
			
			eachNode
      .append("svg:circle")
      .attr("class", "node-circle")
      .attr("r", "18px")
      .attr("fill", "#ff0000");
			
			eachNode
			.append("text")
			.attr("dy", "5px")
			.attr("text-anchor", "middle")
			.text(function(d) {
				return d.label;
			});

			selectNodes.exit().remove();
}

	var vis = d3.select("#matrix-topology-container")
			.append("svg:svg")
				.attr("class", "stage")
				.attr("width", document.getElementById("matrix-topology-container").offsetWidth)
				.attr("height", document.getElementById("matrix-topology-container").offsetHeight);

	vis
		.append("g")
		.attr("id", "group-links");
	vis
		.append("g")
		.attr("id", "group-nodes");

	$('#matrix-topology-modal').on('shown.bs.modal', function (e) {
		d3.select("#matrix-topology-container").select("svg")
			.attr("width", document.getElementById("matrix-topology-container").offsetWidth)
			.attr("height", document.getElementById("matrix-topology-container").offsetHeight);
		//store.dispatch({type: 'createTopoM', M: M});
	});
	var unsubscribe = store.subscribe(handleChangeM);
	
	$scope.filterOrderChange = function(N){
		var M = numeric.identity(N + 2);
		M[0][0] = 0;
		M[N + 1][N + 1] = 0;
		for (i = 0; i < N + 1; i++){
			M[i][i + 1] = 1;		
			M[i + 1][i] = 1;
		}
		store.dispatch({type: 'createTopoM', M: M})
	}
	$scope.filterOrderChange($scope.data.filterOrder);

	ReactDOM.render(
		<ReactRedux.Provider store={store}>
			<MatrixTopologyContainer />
		</ReactRedux.Provider>,
		document.getElementById('matrix-topology-table')
	);
	$scope.$on("$destroy", unsubscribe);
	$timeout(function(){$("#button-calculate").click()}, 200);
}])
.controller("_optimize", ['$scope', '$timeout', function ($scope, $timeout) {

}])
.directive('hideTabs', ['$rootScope', function($rootScope) {
  return {
      restrict: 'A',
      link: function($scope, $el) {
          $rootScope.hideTabs = 'tabs-item-hide';
          $scope.$on('$destroy', function() {
              $rootScope.hideTabs = '';
          });
      }
  };
}])
.directive('nsFillForm', [function() {
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
    link: function(scope, element, attrs) {
			scope.nsShowDelete = (attrs.hasOwnProperty('nsShowDelete'))? (attrs.nsShowDelete === 'true') : false;
		}
  };
}])
.directive('nsSearchBox', [function() {
  return {
    restrict: 'AE',
    scope: {
      nsSearch: '=nsSearch',
			nsClickButton: '&nsClickButton'
    },
		templateUrl: '_nsSearchBox.html',
    link: function(scope, element, attrs) {
			scope.nsShowButton = (attrs.hasOwnProperty('nsShowButton'))? (attrs.nsShowButton === 'true') : false;
		}
  };
}])
.directive('nsLinkBox', ['$state', function($state) {
  return {
    restrict: 'AE',
		transclude: true,
    scope: {},
		templateUrl: '_nsLinkBox.html',
    link: function(scope, element, attrs) {
			scope.nsState = (attrs.hasOwnProperty('nsState'))? attrs.nsState : "";
			scope.nsIcon = (attrs.hasOwnProperty('nsIcon'))? attrs.nsIcon : "";
			scope.$state = $state;
		}
  };
}]);

/* angular.element(document).ready(function () {
	angular.bootstrap(document, ['content']);
}); */