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
		resolve: {
			resolveObj: function(){return {dataFromUpload: true}}
		},
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
	})
	.state('tune', {
		resolve: {
			resolveObj: function(){return {dataFromUpload: false}}
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
		if ($scope.data.filterOrder > 20){
			$scope.data.filterOrder = 20;
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

	$scope.switchPosition = function(curr, target){
		var tranZeros = $scope.data.tranZeros;
		if ((target >= 0) && (target < tranZeros.length)){
			var temp1 = [tranZeros[target][0], tranZeros[target][1]];
			tranZeros[target][0] = tranZeros[curr][0];
			tranZeros[target][1] = tranZeros[curr][1];
			tranZeros[curr][0] = temp1[0];
			tranZeros[curr][1] = temp1[1];
		}
	}

	var tempStoreState = store.getState();
	
	if (tempStoreState.hasOwnProperty("savedSynthesisData")){
		$scope.data = tempStoreState.savedSynthesisData;
	} else {
		$scope.data = {
			filterOrder: 3,
			returnLoss: 26,
			centerFreq: 28.75,//14.36,
			bandwidth: 0.6,//0.89,
			unloadedQ: 200000,
			startFreq: 28,//12.8,
			stopFreq: 29.5,//15.5,
			numberOfPoints: 1000,
			filterType: "BPF",
			/* tranZeros: [['', 1.1], ['', 1.4], ['', 1.9]], */
			tranZeros: [['', '']],
			matrixDisplay: "M",
			isSymmetric: false,
			focusZero: 0
		}
	}	

	var unsubscribe = store.subscribe(handleChangeM);
	if (tempStoreState.hasOwnProperty("topoM")){
		handleChangeM();
	} else {
		$scope.filterOrderChange();		
	}


	$scope.showChart = function(select){
		var data;
		switch (select.toLowerCase()){
			case "groupdelay":
				data = [{label: "Group delay (ns)", data: $scope.GroupDelay_fromM}];
				break;
			case "s":
			default:
				data = [{label: "S11(dB)", data: $scope.S11dB_fromM}, {label: "S21(dB)", data: $scope.S21dB_fromM}];
		}
		linearChart.update(data, true);
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
				freqGHz = numeric.linspace($scope.data.startFreq, stopFreq, numberOfPoints),
			
				response = await common.xhr2('SynthesizeFromTranZeros', {rootP: tranZeros, N: $scope.data.filterOrder, returnLoss: $scope.data.returnLoss, topology: store.getState().topoM}),

				epsilon = numeric.t(response.epsilon[0], response.epsilon[1]),
				epsilonE = epsilon,
				coefP = response.coefP.map(function(d){return numeric.t(d[0], d[1])}),
				coefF = response.coefF.map(function(d){return numeric.t(d[0], d[1])}),
				coefE = response.coefE.map(function(d){return numeric.t(d[0], d[1])}),
/* 				sFromFPE = common.FPE2S(epsilon, epsilonE, coefF, coefP, coefE, freqGHz, $scope.data.unloadedQ, $scope.data.centerFreq, $scope.data.bandwidth),
				S11dB = sFromFPE.S11.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]}),
				S21dB = sFromFPE.S21.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]}), */
				sFromM = common.CM2S(response.targetMatrix, freqGHz, $scope.data.unloadedQ, $scope.data.centerFreq, $scope.data.bandwidth);
				
			$scope.S11dB_fromM = sFromM.S11.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});
			$scope.S21dB_fromM = sFromM.S21.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});
			$scope.GroupDelay_fromM = sFromM.S21.map(function(s, i, o){
				var freqStep = (i === o.length - 1)? o[i][0] - o[i - 1][0] : o[i + 1][0] - o[i][0],
					phase1 = Math.atan2(o[i][1].y, o[i][1].x),
					phase2 = (i === o.length - 1)? 2 * Math.atan2(o[i][1].y, o[i][1].x) - Math.atan2(o[i - 1][1].y, o[i - 1][1].x) : Math.atan2(o[i + 1][1].y, o[i + 1][1].x),
					phaseStep = phase2 - phase1;
				phaseStep = phaseStep - Math.round(phaseStep / Math.PI) * Math.PI;
				return [s[0], -phaseStep / (2 * Math.PI * freqStep)]});

			document.querySelector('#s11dbChart').click();

			$scope.data.targetMatrix = response.targetMatrix;
			$scope.data.message = response.message;
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
			if (M[i][i + 1] === 1){
				links.push({id: edgeIndex, source: nodes[i], target: nodes[i + 1], size: 3, primary: true});
				edgeIndex++;
			}
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
.controller("_extractmatrix", ['$scope', '$timeout', 'common', 'resolveObj', function ($scope, $timeout, common, resolveObj) {
	var linearChart1, linearChart2;
	$timeout(function(){
		var margin = {
			top: 40,
			right: 40,
			bottom: 50,
			left: 60
		};
		linearChart1 = new simpleD3LinearChart("graph-linear-chart1", margin, [0, 5], [-10, 50]);
		linearChart2 = new simpleD3LinearChart("graph-linear-chart2", margin, [0, 5], [-10, 50]);
	}, 80);

	$scope.data = {dataFromUpload: resolveObj.dataFromUpload, currentInstr: {id: 0, name: "Select instrument"}};
	
	$timeout(function(){
		var tempStoreState = store.getState();
		if (tempStoreState.hasOwnProperty("tempString")){
			var sFile = common.ParseS2P(tempStoreState.tempString);
			store.dispatch({type: 'saveSFile', data: sFile});
			extractMatrix(sFile);
		}
	}, 500);
	async function extractMatrix(sFile){
		try {
			var synStoreState = store.getState().savedSynthesisData,
				topoM = store.getState().topoM,
				tranZeros = synStoreState.tranZeros
				.map(function(d){return [Number(d[0]), Number(d[1])]})
				.filter(function(d){return (d[0] !== 0) || (d[1] !== 0)}),
				captureStartFreqGHz = $scope.data.captureStartFreqGHz || 0,
				captureStopFreqGHz = $scope.data.captureStopFreqGHz || 0,
				response = await common.xhr2('ExtractMatrix', {...sFile, ...synStoreState, tranZeros: tranZeros, topology: topoM, captureStartFreqGHz: captureStartFreqGHz, captureStopFreqGHz: captureStopFreqGHz}),
/* 				numberOfPoints = (synStoreState.numberOfPoints < 5000)? synStoreState.numberOfPoints : 5000,
				stopFreq = (synStoreState.startFreq < synStoreState.stopFreq)? synStoreState.stopFreq : synStoreState.startFreq + synStoreState.bandwidth * 8,
				freqGHz = numeric.linspace(synStoreState.startFreq, stopFreq, numberOfPoints), */
				freqGHz = sFile.freq.map(function(f, i){return f / 1000}),
				
/* 				sFromTargetM = common.CM2S(synStoreState.targetMatrix, freqGHz, synStoreState.unloadedQ, synStoreState.centerFreq, synStoreState.bandwidth), */
				
				sFromExtractM = common.CM2S(response.extractedMatrix, freqGHz, response.q, synStoreState.centerFreq, synStoreState.bandwidth);
				
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

			document.querySelector('#magnitudeChart').click();
			$scope.data.extractedMatrix = response.extractedMatrix;
			$scope.data.deviateMatrix = response.deviateMatrix;
			$scope.data.q = response.q;
			$scope.data.isSymmetric = synStoreState.isSymmetric;
			document.getElementById("p1-file").innerHTML = response.message;
			document.querySelector('#deviationTable').click();
			$scope.$digest();
		} catch(e) {
			document.getElementById("p1-file").innerHTML = e.message;
		}
	}

	$scope.showChart = function(select){
		var data1, data2;
		switch (select.toLowerCase()){
			case "phase":
				data1 = [{label: "s2p S11", data: $scope.S11ang_fromSFile}, {label: "Extracted S11", data: $scope.S11ang_fromExtractM}];
				data2 = [{label: "s2p S21", data: $scope.S21ang_fromSFile}, {label: "Extracted S21", data: $scope.S21ang_fromExtractM}];
				break;
			case "magnitude":
			default:
				data1 = [{label: "s2p S11", data: $scope.S11dB_fromSFile}, {label: "Extracted S11", data: $scope.S11dB_fromExtractM}];
				data2 = [{label: "s2p S21", data: $scope.S21dB_fromSFile}, {label: "Extracted S21", data: $scope.S21dB_fromExtractM}];
		}
		linearChart1.update(data1, true);
		linearChart2.update(data2, true);
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

	if ($scope.data.dataFromUpload){
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
		
		$scope.capture = function(){
			var tempStoreState = store.getState();
			if (tempStoreState.hasOwnProperty("sFile")){
				var sFile = tempStoreState.sFile;
				extractMatrix(sFile);
			}
		}
	} else {
		$scope.capture = async function(){
			if (window.hasOwnProperty("preloaded")){
				var sFile, instrData = (await preloaded.KeysightPNAReadS($scope.data.currentInstr.name)).split(",").map(Number)
					numFreq = instrData.length / 9;
				sFile = {
					freq: instrData.slice(0, numFreq),
					S11_db: instrData.slice(numFreq, 2 * numFreq),
					S11_angRad: instrData.slice(2* numFreq, 3 * numFreq).map(function(a){return a * Math.PI / 180}),
					S21_db: instrData.slice(3 * numFreq, 4 * numFreq),
					S21_angRad: instrData.slice(4* numFreq, 5 * numFreq).map(function(a){return a * Math.PI / 180})
				},
				extractMatrix(sFile);
			}
		}
		
		$scope.searchInstrument = async function(){
			if (window.hasOwnProperty("preloaded")){
				$scope.data.instrumentList = (await preloaded.Visa32Find()).map(function(a, i){return {id: i, name: a}});
				$scope.$digest();
			}
		}
		
		$scope.changeCurrentInstrument = function(instrument){
			$scope.data.currentInstr = instrument;
		}
	}
}])
.controller("_optimize", ['$scope', '$sanitize', '$timeout', '$state', 'common', function ($scope, $sanitize, $timeout, $state, common) {
	function SerializeM(topoM, M, isSymmetric) {
		var i, j, N = topoM.length - 2, result = [];
		for (i = 0; i < N + 2; i++) {
			for (j = 0; j < N + 2 - i; j++) {
				if ((topoM[j][j + i] === 1) && (!(isSymmetric && (j + j + i) > (N + 1)))) {
					result.push(M[j][j + i])
				}
			}
		}
		return result;
	}

	function DeSerializeM(topoM, serM, isSymmetric) {
		var i, j, temp1, indexSerM = 0, N = topoM.length - 2, result = [];
		for (i = 0; i < N + 2; i++) {
			result.push(_.range(0, N + 2, 0));
		}
		for (i = 0; i < N + 2; i++) {
			for (j = 0; j < N + 2 - i; j++) {
				if ((topoM[j][j + i] === 1) && (!(isSymmetric && (j + j + i) > (N + 1)))) {
					result[j][j + i] = serM[indexSerM];
					result[j + i][j] = serM[indexSerM];
					if (isSymmetric){
						result[N + 1 - j][N + 1 - j - i] = serM[indexSerM];
						result[N + 1 - j - i][N + 1 - j] = serM[indexSerM];
					}
					indexSerM = indexSerM + 1;
				}
			}
		}
		return result;
	}

	function CoarseModelLinear() {
		this.slopeM = []
		this.invSlopeM = []
		this.intepM = []
	}

	CoarseModelLinear.prototype.update = async function (dimension, extractedMatrix, topology, isSymmetric) {
		var response = await common.xhr2('CoarseModelUpdate', {dimension: dimension, extractedMatrix: extractedMatrix, topology: topology, isSymmetric: isSymmetric});
		this.slopeM = response.slopeM;
		this.invSlopeM = response.invSlopeM;
		this.intepM = response.intepM;
	}

	CoarseModelLinear.prototype.func = function (input) {
		var _this = this;
		return numeric.add(_this.intepM, numeric.dot(_this.slopeM, input));
	}
	CoarseModelLinear.prototype.defunc = function (output) {
		var _this = this;
		return numeric.dot(_this.invSlopeM, numeric.sub(output, _this.intepM));
	}

	function AddTimeLog(input, showTime){
		if (typeof showTime === "undefined" || showTime){
			var oDate = new Date();
			$scope.data.logs += "\n" + oDate.toLocaleString() + ": " + input;
		} else {
			$scope.data.logs += "\n" + input;
		}
		$timeout(function(){
			document.getElementById("textarea1").scrollTop = document.getElementById("textarea1").scrollHeight;
		}, 200);
	}

	$scope.reset = function(){
		/* $scope.data = {logs: "", captureStartFreqGHz: "", captureStopFreqGHz: "", iterList: [], currentIter: {id: 0, q: 1e9}, isSymmetric: synStoreState.isSymmetric || false, spacemapButtonDisable: false}; */
		$state.reload();
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
	
	$scope.changeCurrentIteration = function(iteration){
		var data, freqGHz, sFromExtractM, S11dB_fromExtractM, S21dB_fromExtractM, S11dB_fromSFile, S21dB_fromSFile;
		$scope.data.currentIter = iteration;
		$scope.data.extractedMatrix = iteration.extractedMatrix;
		$scope.data.deviateMatrix = iteration.deviateMatrix;

		freqGHz = iteration.sFile.freq.map(function(f, i){return f / 1000});

		S11dB_fromSFile = iteration.sFile.freq.map(function(f, i){return [f / 1000, iteration.sFile.S11_db[i]]});
		S21dB_fromSFile = iteration.sFile.freq.map(function(f, i){return [f / 1000, iteration.sFile.S21_db[i]]});
		
		sFromExtractM = common.CM2S(iteration.extractedMatrix, freqGHz, iteration.q, synStoreState.centerFreq, synStoreState.bandwidth);
			
		S11dB_fromExtractM = sFromExtractM.S11.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});
		S21dB_fromExtractM = sFromExtractM.S21.map(function(s){return [s[0], 10 * Math.log(s[1].x * s[1].x + s[1].y * s[1].y) / Math.LN10]});

		
		data = [{label: "HFSS S11", data: S11dB_fromSFile}, {label: "Extracted S11", data: S11dB_fromExtractM}];
		linearChart1.update(data, true);
		data = [{label: "HFSS S21", data: S21dB_fromSFile}, {label: "Extracted S21", data: S21dB_fromExtractM}];
		linearChart2.update(data, true);
		
		setTimeout(function(){
			document.querySelector('#deviationTable').click();
		}, 100);
	}

	$scope.assignVariables = async function(){
		if (window.hasOwnProperty("preloaded") && !variableAssigned){
			var i, j, k, N = topoM.length - 2, indexName = 0, predictNames = [];
			$scope.data.variableNames = (await preloaded.GetHFSSVariables()).map(function(a, i){return {id: i, name: a}});
			$scope.data.variableValue = await preloaded.GetHFSSVariableValue($scope.data.variableNames.map(function(a){return a.name}));
			$scope.data.originVarNames = [];
			for (i = 0; i < N + 2; i++) {
				for (j = 0; j < N + 2 - i; j++) {
					if ((topoM[j][j + i] === 1) && (!($scope.data.isSymmetric && (j + j + i) > (N + 1)))) {
						var row = (j < 10) ? j.toString() : String.fromCharCode(65 + j - 10),
							col = ((j + i) < 10) ? (j + i).toString() : String.fromCharCode(65 + j + i - 10),
							temp1 = "M" + row.toString() + col.toString();
						$scope.data.originVarNames.push({id: indexName, name: temp1});
						predictNames.push(0);
						for (k = 0; k < $scope.data.variableNames.length; k++) {
							if ($scope.data.variableNames[k].name.toUpperCase().indexOf(temp1) !== -1){
								predictNames[indexName] = k;
								break;
							}
						}
						indexName += 1;
					}
				}
			}
			$scope.data.dimensionNames = $scope.data.originVarNames.map(function(a, i){return $scope.data.variableNames[predictNames[i]]});
			$scope.data.lowerLimit = $scope.data.originVarNames.map(function(a, i){return 0.5 * $scope.data.variableValue[predictNames[i]]});
			$scope.data.upperLimit = $scope.data.originVarNames.map(function(a, i){return 2.0 * $scope.data.variableValue[predictNames[i]]});
			/* console.log("$scope.data.dimensionNames\n", $scope.data.dimensionNames); */
			$scope.$digest();
		}
	}
	
	$scope.changeVariableAssign = function(itemId){
		variableAssigned = true;
		var temp1 = $scope.data.variableNames.filter(function(a){return a.name === $scope.data.dimensionNames[itemId].name});
		$scope.data.lowerLimit[itemId] = 0.5 * $scope.data.variableValue[temp1[0].id];
		$scope.data.upperLimit[itemId] = 2.0 * $scope.data.variableValue[temp1[0].id];
	}

	$scope.write2EM = async function(){
		var tempDimNames = $scope.data.dimensionNames.map(function(a){return a.name});
		$scope.data.write2EMButtonHtml = "Setting ... " + "<i class='fa fa-refresh fa-spin fa-fw'></i>";
		/* console.log(tempDimNames, $scope.data.currentIter.dimension); */
		await preloaded.SetHFSSVariableValue(tempDimNames, $scope.data.currentIter.dimension);
		$timeout(function(){
			$scope.data.write2EMButtonHtml = "Update HFSS";
		}, 500)
	}

	$scope.stopSimulation = function(){
		$scope.data.stopSimulation = true;
		AddTimeLog("---------------------------------------------------------------------------------------------------------------", false);
		AddTimeLog("Interrupted by user. Waiting for the last iteration to finish ...");
	}

	$scope.spacemapping = async function(){
		var tranZeros = synStoreState.tranZeros
			.map(function(d){return [Number(d[0]), Number(d[1])]})
			.filter(function(d){return (d[0] !== 0) || (d[1] !== 0)}),
			captureStartFreqGHz = $scope.data.captureStartFreqGHz || 0,
			captureStopFreqGHz = $scope.data.captureStopFreqGHz || 0,
			numberOfPoints = (synStoreState.numberOfPoints < 5000)? synStoreState.numberOfPoints : 5000,
			stopFreq = (synStoreState.startFreq < synStoreState.stopFreq)? synStoreState.stopFreq : synStoreState.startFreq + synStoreState.bandwidth * 8,
			freqGHz = numeric.linspace(synStoreState.startFreq, stopFreq, numberOfPoints);
		
		var response, sFile, i, j, N = topoM.length - 2, indexIter = 0, tempIter = {}, coarseModel = new CoarseModelLinear(), resultDim2M,
			initDimension = await preloaded.GetHFSSVariableValue($scope.data.dimensionNames.map(function(a){return a.name}));
		$scope.data.iterList = [];
		$scope.data.spacemapButtonDisable = true;
		$scope.data.stopSimulation = false;

		AddTimeLog("Space mapping started.");
		if (!window.hasOwnProperty("preloaded")) {
			AddTimeLog("Space mapping cannot be run in browser.");
			return 0;
		}

		async function Dim2M(){
			try {
				var tempDimNames = $scope.data.dimensionNames.map(function(a){return a.name});
				AddTimeLog("Simulation in process with the following dimension.\n\t" + JSON.stringify(tempDimNames).replace(/,/g, ", ") + "\n\t" + JSON.stringify(tempIter.dimension).replace(/,/g, ", "));
				tempIter.s2p = "s" + indexIter.toString() + ".s2p";
				sFile = await preloaded.EvaluateDimension(tempDimNames, tempIter.dimension, tempIter.s2p);
				AddTimeLog("Simulation completed. Extracting coupling matrix.");
				response = await common.xhr2('ExtractMatrix', {...sFile, ...synStoreState, tranZeros: tranZeros, topology: topoM, captureStartFreqGHz: captureStartFreqGHz, captureStopFreqGHz: captureStopFreqGHz});
				AddTimeLog("Coupling matrix extracted.");
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
				return 0;
			} catch(e) {
				AddTimeLog(e.message);
				return undefined;
			}
		}

		for (i = 0; i < $scope.data.numPerturb; i++) {
			if ($scope.data.stopSimulation){
				$scope.data.spacemapButtonDisable = false;
				AddTimeLog("", false);
				AddTimeLog("Simulation stopped by user.");
				return 0
			};
			tempIter.id = indexIter;
			if (i === 0){
				tempIter.dimension = initDimension;
			} else {
				tempIter.dimension = initDimension.map(function (a, i) {
					var N = topoM.length - 2, randNum = Math.random(), dev = ((randNum < 0.5)? randNum - 1 : randNum) * $scope.data.perturbationStep, L = $scope.data.isSymmetric? Math.floor((N + 1) / 2) : N, temp1 = (i < L)? a + dev / 2 : a + dev;
					return Math.round(temp1 * 10000) / 10000;
				});
			}
			AddTimeLog("---------------------------------------------------------------------------------------------------------------", false);
			AddTimeLog("Iteration " + (indexIter + 1).toString() + " starts. Perturbation " + (i + 1).toString() + " out of " + $scope.data.numPerturb.toString());
			resultDim2M = await Dim2M();
			if (typeof resultDim2M === "undefined"){return 0;}
			indexIter = indexIter + 1;
		}

		await coarseModel.update($scope.data.iterList.map(function (a) {return a.dimension}), $scope.data.iterList.map(function (a) {return SerializeM(topoM, a.extractedMatrix, $scope.data.isSymmetric)}), topoM, $scope.data.isSymmetric);

		var xc_star, xf, xc, B, h;
		xc_star = coarseModel.defunc(SerializeM(topoM, synStoreState.targetMatrix, $scope.data.isSymmetric));
		xf = xc_star;
		B = numeric.identity(xf.length);
		h = numeric.rep([xf.length], 1e9);
		for (i = 0; i < $scope.data.numIteration; i++) {
			if ($scope.data.stopSimulation){
				$scope.data.spacemapButtonDisable = false;
				AddTimeLog("", false);
				AddTimeLog("Simulation stopped by user.");
				return 0
			};
			tempIter.id = indexIter;
			tempIter.dimension = xf.map(function (a){return Math.round(a * 10000) / 10000});
			AddTimeLog("---------------------------------------------------------------------------------------------------------------", false);
			AddTimeLog("Iteration " + (indexIter + 1).toString() + " starts. Run " + (i + 1).toString() + " out of " + $scope.data.numIteration.toString());
			resultDim2M = await Dim2M();
			if (typeof resultDim2M === "undefined"){return 0;}
			/* await coarseModel.update($scope.data.iterList.map(function (a) {return a.dimension}).slice(-numPerturb), $scope.data.iterList.map(function (a) {return SerializeM(topoM, a.extractedMatrix, $scope.data.isSymmetric)}).slice(-numPerturb), topoM, $scope.data.isSymmetric); */
			xc = coarseModel.defunc(SerializeM(topoM, tempIter.extractedMatrix, $scope.data.isSymmetric));
			try {
				response = await common.xhr2('SpaceMappingCalculate', {B: B, h: h, xc: xc, xc_star: xc_star, xf: xf, lowerLimit: $scope.data.lowerLimit, upperLimit: $scope.data.upperLimit});
				AddTimeLog("h: " + JSON.stringify(response.h).replace(/,/g, ", "));
				AddTimeLog("f: " + JSON.stringify(response.f).replace(/,/g, ", "));
			} catch(e) {
				AddTimeLog(e.message);
				return 0;
			}
			B = response.B;
			h = response.h;
			xf = response.xf;
			console.log(xf, B, h, response.toStop);
			if (response.toStop === 1) {
				break;
			}
			indexIter = indexIter + 1;
		}
		AddTimeLog("----------------------------------------------------------------------------------------", false);
		AddTimeLog("Space mapping finished.");
	} // end of $scope.spacemapping

	var synStoreState, topoM, variableAssigned, linearChart1, linearChart2;
	$timeout(function(){
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
			currentIter: {id: 0, q: 1e9},
			isSymmetric: synStoreState.isSymmetric || false,
			spacemapButtonDisable: false,
			perturbationStep: Math.round(0.003 * 30.0 / synStoreState.centerFreq * 1000) / 1000,
			write2EMButtonHtml: "Update HFSS",
			numPerturb: 5,
			numIteration: 10
		};
		
		if (window.hasOwnProperty("preloaded")) {
			(async function(){
				var temp1 = (await preloaded.Try(['H', 'e', 'l', 'l', 'o', '!', ' Please make sure:'])).join("");
				AddTimeLog(temp1, false);
				AddTimeLog("1. the current design is open", false);
				AddTimeLog("2. \"Setup1:Sweep1\" is correctly set up", false);
				AddTimeLog("3. variable value is number instead of expression in HFSS", false);
				AddTimeLog("", false);
			})();
			$scope.assignVariables();
		} else {
			AddTimeLog("Space mapping cannot be run in browser. Special client software required.", false);
		}
	}, 500);
	
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