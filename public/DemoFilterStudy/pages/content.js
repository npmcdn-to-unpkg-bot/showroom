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
		onExit: function(){ ReactDOM.unmountComponentAtNode(document.getElementById('matrix-topology')); unsubscribe();}
	})
	.state('storeVisit', {
		url: "/storeVisit/{id:int}",
    views: {
      'mainpage': {
				templateUrl: '_storeVisit.html',
				controller: '_storeVisit'
			}
    }
	})
	.state('profile', {
		abstract: true,
		url: "/profile/{id:int}",
    views: {
      'mainpage': {
				templateUrl: '_profile.html',
				controller: '_profile'
			}
    }
	})
	.state('profile.address', {
		url: "/address",
    views: {
      'mainpage': {
				templateUrl: '_profile_address.html',
				controller: '_profile_address'
			}
    },
		onEnter: function(){ setTimeout( () => $('#side-menu').metisMenu(), 20); },
		onExit: function(){ ReactDOM.unmountComponentAtNode(document.getElementById('address-list-content')); }
	})
	.state('profile.store', {
		url: "/store/{storeid:int}",
    views: {
      'mainpage': {
				templateUrl: '_profile_store.html',
				controller: '_profile_store'
			}
    },
		onEnter: function(){ setTimeout( () => $('#side-menu').metisMenu(), 20); },
		onExit: function(){ }
	})
	.state('newsFeed', {
		url: "/newsFeed",
				templateUrl: "_newsFeed.html",
				controller: '_newsFeed'
	});
	$urlRouterProvider.otherwise("/synthesis");
}])
.config(['$socketProvider', 'configPara', function ($socketProvider, configPara) {
		$socketProvider.setConnectionUrl(configPara.ip);
	}
])
.run(['$rootScope', 'common', '$timeout', function ($rootScope, common, $timeout) {
/* 		$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
			$timeout(function(){$('#side-menu').metisMenu();}, 20);
		}) */
/* 		(async function(){
			try {
				let user = await common.xhr('getUser', {});
				console.log("user: ", user);
				store.dispatch({type: "updateUser", user: user});
			} catch(e){
				store.dispatch({type: "updateUser", user: {}});
			}
		})(); */
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
	(async function(){
		try {
			var temp1 = await common.xhr2('try', {myval: "hello from browser!"});
			$scope.python = JSON.stringify(temp1);
		} catch(e){
			$scope.python = e.message;
		}
		$scope.$apply();
	})();
	var M=[
	[0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	[1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
	[0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
	[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
	];
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

var w = 900,
    h = 400;

var circleWidth = 5;

var vis = d3.select("#container-sigma")
    .append("svg:svg")
      .attr("class", "stage")
      .attr("width", w)
      .attr("height", h);
			
		vis
			.append("g")
			.attr("id", "group-links");
		vis
			.append("g")
			.attr("id", "group-nodes");
							
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
      .attr("r", "10px")
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

	var unsubscribe = store.subscribe(handleChangeM);
	store.dispatch({type: 'createTopoM', M: M})
	ReactDOM.render(
		<ReactRedux.Provider store={store}>
			<MatrixTopologyContainer />
		</ReactRedux.Provider>,
		document.getElementById('matrix-topology')
	);
}])
.controller("_storeVisit", ['$scope', '$timeout', function ($scope, $timeout) {

}])
.controller("_profile", ['$scope', '$timeout', function ($scope, $timeout) {

}])
.controller("_profile_store", ['$scope', 'common', function ($scope, common) {

}])
.controller("_newsFeed", ['$scope', '$timeout', 'ChainCloudDb', function ($scope, $timeout, ChainCloudDb) {
	$scope.postList = ChainCloudDb.fetchPost({posttype: 'all'});
	$scope.currentMsg = [];
	$scope.addComment = function(index){
/* 		ChainCloudDb.addComment(postId, ChainCloudDb.loginUserId, {text: $scope.currentMsg[index]});
		$scope.postList = ChainCloudDb.fetchPost({posttype: 'all'}); */
		$scope.postList[index].comments.push({
			owner: ChainCloudDb.user[$scope.$root.loginUserId],
			publishtime: '1 min ago',
			content: {text: $scope.currentMsg[index]}
		});
		$scope.currentMsg[index] = '';
	};
	var reader = new FileReader();
	$scope.addPost = function(){
		var messageImageFile = document.getElementById("messageImage"),
			messageFileFile = document.getElementById("messageFile"), file, images = [], attachments = [];
		if ('files' in messageImageFile) {
			if (messageImageFile.files.length > 0) {
				for (var i = 0; i < messageImageFile.files.length; i++) {
					file = messageImageFile.files[i];
					//console.log(file);
					reader.onload = function(e) { images.push(e.target.result); };
					reader.readAsDataURL(file);
				}
			}
		}
		if ('files' in messageFileFile) {
			if (messageImageFile.files.length > 0) {
				for (var i = 0; i < messageFileFile.files.length; i++) {
					file = messageImageFile.files[i];
					attachments.push({filename: file.name});
				}
			}
		}
		$timeout(function(){
			$scope.postList.unshift({
				owner: ChainCloudDb.user[$scope.$root.loginUserId],
				publishtime: '1 min ago',
				content: {
					images: images,
					text: $scope.newPostMsg,
					attachments: attachments
				},
				comments: []
			});
			$scope.newPostMsg = '';
		}, 100);
		
	};
	$scope.clickInput = function(elementId) {
		document.getElementById(elementId).click();
	};
	$scope.linkify = function(inputtext){
		var result;
		result = linkifyStr(inputtext, {defaultProtocol: 'https'});
		return result;
	};
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