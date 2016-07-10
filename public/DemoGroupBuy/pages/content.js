function reducer(state = {user: {}, profile: {address: {}}}, action) {
var tempState = {...state};
  switch (action.type) {
    case "updateUser":
			tempState.user = action.user;
      break;
    case "profile.address.addNewAddress":
			tempState.profile.address.modalAddress = {};
			tempState.profile.address.modalShow = true;
      break;
    case "profile.address.editAddress":
			tempState.profile.address.modalAddress = action.oldAddr;
			tempState.profile.address.modalShow = true;
      break;
    case "profile.address.changeAddressForm":
			tempState.profile.address.modalAddress[action.key] = action.value;
      break;
    case "profile.address.modalHide":
			tempState.profile.address.modalShow = false;
      break;
		default:
  }
  return tempState;
}

window.store = Redux.createStore(reducer);

angular
.module("content", ['KM_tools', 'socket.io', 'infinite-scroll', 'ui.router', 'ngAnimate', 'ngSanitize'])
.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$stateProvider
	.state('index', {
		url: "/",
		abstract: true,
		templateUrl: "_index_web.html"
	})
	.state('storeList', {
		url: "/storeList",
    views: {
      'mainpage': {
				templateUrl: '_storeList.html',
				controller: '_storeList'
			}
    }
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
		onExit: function(){
			/* ReactDOM.unmountComponentAtNode(document.getElementById('address-list-content')); */
		}
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
	$urlRouterProvider.otherwise("/storeList");
}])
.config(['$socketProvider', 'configPara', function ($socketProvider, configPara) {
		$socketProvider.setConnectionUrl(configPara.ip);
	}
])
.run(['$rootScope', 'common', '$timeout', function ($rootScope, common, $timeout) {
/* 		$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
			$timeout(function(){$('#side-menu').metisMenu();}, 20);
		}) */
		(async function(){
			try {
				let user = await common.xhr('getUser', {});
				console.log("user: ", user);
				store.dispatch({type: "updateUser", user: user});
			} catch(e){
				store.dispatch({type: "updateUser", user: {}});
			}
		})();
	}
])
.controller("content_main", ['$scope', 'common', function ($scope, common) {

}])
.controller("_storeList", ['$scope', 'common', '$timeout', function ($scope, common, $timeout) {
	(async function(){
		try {
			$scope.addresses = await common.xhr('getAddressList', {});
			$scope.primAddr = _.find($scope.addresses, o => (o.id === store.getState().user.primaryaddr));
		} catch(e){
			$scope.addresses = [{}];
			$scope.primAddr = {};
		}
		$scope.$apply();
	})();
	$scope.changePrimAddr = async function(id){
		try {
			let user = await common.xhr('updateUser', {primaryaddr: id});
			store.dispatch({type: "updateUser", user: user});
			$scope.$apply(function(){$scope.primAddr = _.find($scope.addresses, o => (o.id === store.getState().user.primaryaddr));});
		} catch(e){
		}
	};
	$scope.newAddress = {streetno: '', streetname: '', city: '', province: '', country: '', postcode: ''};
	$scope.addNewAddr = async function(newAddress){
		try {
			$scope.addresses = await common.xhr('saveAddress', newAddress);
			$scope.changePrimAddr(_.last($scope.addresses).id);
		} catch(e){
		}
	};
}])
.controller("_storeVisit", ['$scope', '$timeout', function ($scope, $timeout) {

}])
.controller("_profile", ['$scope', '$timeout', function ($scope, $timeout) {

}])
.directive('gbModalEditAddress', ['$state', function($state) {
  return {
    restrict: 'AE',
    scope: {
			modalAddress: "=modalAddress",
			deleteButton: "=deleteButton",
			saveButton: "=saveButton"
		},
		templateUrl: '_gb_modal_edit_address.html',
    link: function(scope, element, attrs) {
			scope.modalId = attrs.modalId;
		}
  };
}])
.controller("_profile_address", ['$scope', 'common', function ($scope, common) {
	// ReactDOM.render(<GbAddressList ajax={common.xhr}/>, document.getElementById('address-list-content'));
	(async function(){
		var addresses;
		try {
			$scope.addresses = await common.xhr('getAddressList', {});
		} catch(e){
			$scope.addresses = [];
		}
		$scope.$digest();
	})();
	$scope.modalAddr = {};
/* 	setTimeout(function(){
		var modalElement = $('#edit-address');
		modalElement.on('shown.bs.modal', function (e) {
			console.log("modalAddr: ", $scope.modalAddr);
		})
	}, 1000); */
	$scope.editAddress = function(address){
		$scope.modalAddr = address;
	}
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