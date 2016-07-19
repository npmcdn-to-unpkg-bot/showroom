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
	.state('extractmatrix', {
		url: "/extractmatrix",
    views: {
      'mainpage': {
				templateUrl: '_extractmatrix.html',
				controller: '_extractmatrix'
			}
    }
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
	});

	var linearChart;
	$timeout(function(){
		var i,
			margin = {
				top: 40,
				right: 40,
				bottom: 50,
				left: 60
			},
			data = [], data1 = [], data2 = [];
		linearChart = new simpleD3LinearChart("graph-linear-chart", margin, [0, 5], [-10, 50]);

		for (i = 0; i < 500; i++) {
			data1.push([i/100, Math.sin(i/100) * 20 + 10]);
			data2.push([i/120, Math.cos(i/120) * 10 + 10]);
		}

		data.push({label: "S11(dB)", data: data1});
		data.push({label: "S21(dB)", data: data2});
		
		linearChart.update(data, false);
	}, 100);

	$scope.filterOrderChange = function(){
		if ($scope.data.filterOrder > 16){
			$scope.data.filterOrder = 16;
		}
		var N = $scope.data.filterOrder,
			M = numeric.identity(N + 2), i;
		M[0][0] = 0;
		M[N + 1][N + 1] = 0;
		for (i = 0; i < N + 1; i++){
			M[i][i + 1] = 1;		
			M[i + 1][i] = 1;
		}
		store.dispatch({type: 'createTopoM', M: M})
	}

	var tempStoreState = store.getState();
	
	if (tempStoreState.hasOwnProperty("savedSynthesisData")){
		$scope.data = tempStoreState.savedSynthesisData;
	} else {
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
			/* tranZeros: [['', 1.5], ['', '']], */
			tranZeros: [['', '']],
			matrixDisplay: "M"
		}
	}	

	var unsubscribe = store.subscribe(handleChangeM);
	if (tempStoreState.hasOwnProperty("topoM")){
		handleChangeM();
	} else {
		$scope.filterOrderChange();		
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
				numberOfPoints = ($scope.data.numberOfPoints < 5000)? $scope.data.numberOfPoints : 5000,
				stopFreq = ($scope.data.startFreq < $scope.data.stopFreq)? $scope.data.stopFreq : $scope.data.startFreq + $scope.data.bandwidth * 8,
				freqMHz = numeric.linspace($scope.data.startFreq, stopFreq, numberOfPoints),
			
				response = await common.xhr2('SynthesizeFromTranZeros', {rootP: tranZeros, N: $scope.data.filterOrder, returnLoss: $scope.data.returnLoss, topology: store.getState().topoM}),

				epsilon = numeric.t(response.epsilon[0], response.epsilon[1]),
				epsilonE = epsilon,
				coefP = response.coefP.map(function(d){return numeric.t(d[0], d[1])}),
				coefF = response.coefF.map(function(d){return numeric.t(d[0], d[1])}),
				coefE = response.coefE.map(function(d){return numeric.t(d[0], d[1])}),
				sFromFPE = common.FPE2S(epsilon, epsilonE, coefF, coefP, coefE, freqMHz, $scope.data.unloadedQ, $scope.data.centerFreq, $scope.data.bandwidth),
				S11dB = sFromFPE.S11.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]}),
				S21dB = sFromFPE.S21.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]}),
				sFromM = common.CM2S(response.targetMatrix, freqMHz, $scope.data.unloadedQ, $scope.data.centerFreq, $scope.data.bandwidth),
				S11dB_fromM = sFromM.S11.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]}),
				S21dB_fromM = sFromM.S21.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]}),
				
				data = [{label: "S11(dB)", data: S11dB_fromM}, {label: "S21(dB)", data: S21dB_fromM}];

			linearChart.update(data, true);			

			$scope.data.targetMatrix = response.targetMatrix;
			$scope.$digest();
			
			var tempString = "# GHZ S DB R 50";
			sFromM.S11.forEach(function(s, i){
				var S11_dB = 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10,
					S11_phase = Math.atan2(s[1].y, s[1].x) * 180 / Math.PI,
					t = sFromM.S21[i],
					S21_dB = 10 * Math.log(t[1].x * t[1].x + t[1].y * t[1].y) / Math.LN10,
					S21_phase = Math.atan2(t[1].y, t[1].x) * 180 / Math.PI;
				tempString += "\n" + s[0] + " " + S11_dB + " " + S11_phase + " " + S21_dB + " " + S21_phase + " " + S21_dB + " " + S21_phase + " " + S11_dB + " " + S11_phase;
			});
			store.dispatch({type: 'updateTempString', tempString: tempString});			
			/* console.log(tempString.slice(0)); */
		} catch(e){
			console.log(e.message);
		}
	}

	$timeout(function(){$scope.calculate()}, 500);

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
				.style("stroke-dasharray", function(d){return (d.primary)? "" : "10, 4"});

			selectLinks
				.enter()
				.append("line")
				.attr("x1", function(d) { return d.source.x })
				.attr("y1", function(d) { return d.source.y })
				.attr("x2", function(d) { return d.target.x })
				.attr("y2", function(d) { return d.target.y })
				.style("stroke", "#666666")
				.style("stroke-width", "10px")
				.style("stroke-dasharray", function(d){return (d.primary)? "" : "10, 4"});
				
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
      .attr("class", "node-text")
			.attr("dy", "5px")
			.attr("text-anchor", "middle")
			.text(function(d) {
				return d.label;
			});
			
			selectNodes
			.select(".node-text")
			.text(function(d) {
				return d.label;
			});

			selectNodes.exit().remove();
}


	ReactDOM.render(
		<ReactRedux.Provider store={store}>
			<MatrixTopologyContainer />
		</ReactRedux.Provider>,
		document.getElementById('matrix-topology-table')
	);

	$scope.$on("$destroy", function(){
		unsubscribe();
		store.dispatch({type: 'savedSynthesisData', data: $scope.data});
	});
}])
.controller("_extractmatrix", ['$scope', '$timeout', 'common', function ($scope, $timeout, common) {
	var linearChart1;
	$timeout(function(){
		var margin = {
			top: 40,
			right: 40,
			bottom: 50,
			left: 60
		};
		linearChart1 = new simpleD3LinearChart("graph-linear-chart1", margin, [0, 5], [-10, 50]);
	}, 80);

	$scope.data = {};
	
	$timeout(function(){
		var tempStoreState = store.getState();
		if (tempStoreState.hasOwnProperty("tempString")){
			var sFile = common.ParseS2P(tempStoreState.tempString);
			extractMatrix(sFile);
		}
	}, 100);
	async function extractMatrix(sFile){
		try {
			var synStoreState = store.getState().savedSynthesisData,
				topoM = store.getState().topoM,
				tranZeros = synStoreState.tranZeros
				.map(function(d){return [Number(d[0]), Number(d[1])]})
				.filter(function(d){return (d[0] !== 0) || (d[1] !== 0)}),
				captureStartFreqMHz = $scope.captureStartFreqMHz || 0,
				captureStopFreqMHz = $scope.captureStopFreqMHz || 0,
				response = await common.xhr2('ExtractMatrix', {...sFile, ...synStoreState, tranZeros: tranZeros, topology: topoM, captureStartFreqMHz: captureStartFreqMHz, captureStopFreqMHz: captureStopFreqMHz}),
				numberOfPoints = (synStoreState.numberOfPoints < 5000)? synStoreState.numberOfPoints : 5000,
				stopFreq = (synStoreState.startFreq < synStoreState.stopFreq)? synStoreState.stopFreq : synStoreState.startFreq + synStoreState.bandwidth * 8,
				freqMHz = numeric.linspace(synStoreState.startFreq, stopFreq, numberOfPoints),
				
/* 				sFromTargetM = common.CM2S(synStoreState.targetMatrix, freqMHz, synStoreState.unloadedQ, synStoreState.centerFreq, synStoreState.bandwidth), */
				
				sFromExtractM = common.CM2S(response.extractedMatrix, freqMHz, synStoreState.unloadedQ, synStoreState.centerFreq, synStoreState.bandwidth);
				
/* 			$scope.S11dB_fromTargetM = sFromTargetM.S11.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});
			$scope.S21dB_fromTargetM = sFromTargetM.S21.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});
			$scope.S11ang_fromTargetM = sFromTargetM.S11.map(function(s){return [s[0], Math.atan2(s[1].y, s[1].x) * 180 / Math.PI]});
			$scope.S21ang_fromTargetM = sFromTargetM.S21.map(function(s){return [s[0], Math.atan2(s[1].y, s[1].x) * 180 / Math.PI]}); */
			
			$scope.S11dB_fromExtractM = sFromExtractM.S11.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});
			$scope.S21dB_fromExtractM = sFromExtractM.S21.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});
			$scope.S11ang_fromExtractM = sFromExtractM.S11.map(function(s){return [s[0], Math.atan2(s[1].y, s[1].x) * 180 / Math.PI]});
			$scope.S21ang_fromExtractM = sFromExtractM.S21.map(function(s){return [s[0], Math.atan2(s[1].y, s[1].x) * 180 / Math.PI]});

			$scope.S11dB_fromSFile = sFile.freq.map(function(f, i){return [f / 1000, sFile.S11_db[i]]});
			$scope.S21dB_fromSFile = sFile.freq.map(function(f, i){return [f / 1000, sFile.S21_db[i]]});
			$scope.S11ang_fromSFile = sFile.freq.map(function(f, i){return [f / 1000, sFile.S11_angRad[i] * 180 / Math.PI]});
			$scope.S21ang_fromSFile = sFile.freq.map(function(f, i){return [f / 1000, sFile.S21_angRad[i] * 180 / Math.PI]});

			document.querySelector('#s11dbChart').click();
			$scope.data.extractedMatrix = response.extractedMatrix;
			$scope.data.deviateMatrix = response.deviateMatrix;
			document.querySelector('#deviationTable').click();
			$scope.$digest();
		} catch(e) {
			document.getElementById("p1-file").innerHTML = e.message;
		}
	}

	$scope.showChart = function(select){
		var data;
		switch (select.toLowerCase()){
			case "s21ang":
				data = [{label: "S file", data: $scope.S21ang_fromSFile}, {label: "Extracted", data: $scope.S21ang_fromExtractM}];
				break;
			case "s11ang":
				data = [{label: "S file", data: $scope.S11ang_fromSFile}, {label: "Extracted", data: $scope.S11ang_fromExtractM}];
				break;
			case "s21db":
				data = [{label: "S file", data: $scope.S21dB_fromSFile}, {label: "Extracted", data: $scope.S21dB_fromExtractM}];
				break;
			case "s11db":
			default:
				data = [{label: "S file", data: $scope.S11dB_fromSFile}, {label: "Extracted", data: $scope.S11dB_fromExtractM}];
		}
		linearChart1.update(data, true);
	}

	$scope.showTable = function(select, tableDataFormat){
		var data, synStoreState = store.getState().savedSynthesisData;
		if (typeof select === "undefined"){
			$scope.data.matrixToShow = $scope.data.deviateMatrix;
		} else {
			switch (select.toLowerCase()){
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
		if (typeof tableDataFormat === "undefined"){
			$scope.data.tableDataFormat = 0;
		} else {
				$scope.data.tableDataFormat = tableDataFormat;
		}
	}
	
	$scope.capture = function(){
		var tempStoreState = store.getState();
		if (tempStoreState.hasOwnProperty("sFile")){
			var sFile = tempStoreState.sFile;
			extractMatrix(sFile);
		}
	}

	var reader = new FileReader();
	reader.onload = function(evt){
		var sFile;
		try {
			sFile = common.ParseS2P(evt.target.result);
			document.getElementById("p1-file").innerHTML = "S parameter file parsed successfully!";			
			store.dispatch({type: 'saveSFile', data: sFile})
			extractMatrix(sFile);
		} catch(e) {
			document.getElementById("p1-file").innerHTML = e.message;
		}
	};
	var inputElement = document.getElementById("input-s2p-file");
	inputElement.addEventListener("change", handleFiles, false);
	function handleFiles() {
	 var fileList = this.files; /* now you can work with the file list */
	 reader.readAsText(fileList[0])
	}
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