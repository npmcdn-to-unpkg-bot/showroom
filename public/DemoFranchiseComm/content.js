angular
.module("content", ['KM_tools', 'MockDb', 'socket.io', 'infinite-scroll', 'ui.router', 'ngAnimate', 'ngSanitize'])
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$stateProvider
	.state('index_web', {
		url: "/index_web",
		abstract: true,
		templateUrl: "_index_web.html"
	})
	.state('instMsg', {
		url: "/instMsg",
				templateUrl: "_instMsg.html",
				controller: '_instMsg'
	})
	.state('newsFeed', {
		url: "/newsFeed",
				templateUrl: "_newsFeed.html",
				controller: '_newsFeed'
	})
	.state('profile', {
		url: "/profile/{userId:int}",
				templateUrl: "_profile.html",
				controller: '_profile'
	});
	$urlRouterProvider.otherwise("/newsFeed");
}])
.config(['$socketProvider', 'configPara', function ($socketProvider, configPara) {
		$socketProvider.setConnectionUrl(configPara.ip);
	}
])
.controller("content_main", ['$scope', 'common', 'ChainCloudDb', function ($scope, common, ChainCloudDb) {
	$scope.$root.loginUserId = ChainCloudDb.loginUserId;
	$scope.$root.loginUser = ChainCloudDb.user[ChainCloudDb.loginUserId];
}])
.controller("_instMsg", ['$scope', '$timeout', function ($scope, $timeout) {
	$scope.messageList = [
		{text: 'Hello. What can I do for you?'},
		{text: 'I\'m just looking around. Will you tell me something about yourself?'},
		{text: 'OK, my name is Limingqiang. I like singing, playing basketballand so on.'},
		{text: 'I am Derek. I am a photographer.'}
	];
	var objDiv = document.getElementById("messagechats");

	$scope.sendMessage = function(){
		$scope.messageList.push({text: $scope.currentMsg});
		$scope.currentMsg='';
		$timeout(function(){
			objDiv.scrollTop = objDiv.scrollHeight;
		}, 50);
		$timeout(function(){
			$scope.messageList.push({text: 'Good'});
			$timeout(function(){
				objDiv.scrollTop = objDiv.scrollHeight;
			}, 50);
		}, 1000);
	};
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
.controller("_profile", ['$scope', '$stateParams', 'ChainCloudDb', function ($scope, $stateParams, ChainCloudDb) {
	$scope.linkify = function(inputtext){
		var result;
		result = linkifyStr(inputtext, {defaultProtocol: 'https'});
		return result;
	};
	$scope.loginUserId = ChainCloudDb.loginUserId;
	$scope.profileUserId = $stateParams.userId;
	$scope.profileUser = ChainCloudDb.user[$scope.profileUserId];
	$scope.activityList = ChainCloudDb.fetchActivity($scope.profileUserId).map(function(act){
		var tempAct = {};
		switch(act.name){
			case 'post':
				tempAct.text1 = 'published a post';
				tempAct.text2 = act.post[0].content.text;
				tempAct.images = act.post[0].content.images;
				break;
			case 'comment':
				tempAct.text1 = 'commented to a post';
				tempAct.text2 = act.post[0].content.text;
				tempAct.images = act.post[0].content.images;
				break;
			case 'like':
				tempAct.text1 = 'tagged a post';
				tempAct.text2 = act.post[0].content.text;
				tempAct.images = act.post[0].content.images;
				break;
			default:
		}
		return tempAct;
	});
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