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
		url: "/profile/{userid:int}",
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
			let user = await common.xhr('getUser', {});
			$scope.addresses = await common.xhr('getAddressList', {});
			$scope.primAddr = _.find($scope.addresses, o => (o.id === user.primaryaddr));
		} catch(e){
			$scope.addresses = [{}];
			$scope.primAddr = {};
		}
		$scope.$digest();
	})();
	$scope.changePrimAddr = async function(address){
		try {
			let user = await common.xhr('updateUser', {primaryaddr: address.id});
			$scope.primAddr = address;
		} catch(e){
		}
		$scope.$digest();
	};
	$scope.saveAddress = async function(){
		try {
			$scope.addresses = await common.xhr('saveAddress', $scope.modalAddr);
			$scope.changePrimAddr(_.last($scope.addresses));
		} catch(e){
			$scope.addresses = [];
		}
		$scope.$digest();
		$("#edit-address").modal('hide');
	}
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
			scope.showDeleteButton = (typeof scope.deleteButton !== "undefined");
		}
  };
}])
.controller("_profile_address", ['$scope', '$stateParams', 'common', function ($scope, $stateParams, common) {
	// ReactDOM.render(<GbAddressList ajax={common.xhr}/>, document.getElementById('address-list-content'));
	(async function(){
		try {
			$scope.addresses = await common.xhr('getAddressList', {userid: $stateParams.userid});
		} catch(e){
			$scope.addresses = [];
		}
		$scope.$digest();
	})();
	$scope.modalAddr = {};
	$scope.editAddress = function(address){
		$scope.modalAddr = angular.copy(address);
	}
	$scope.saveAddress = async function(){
		try {
			$scope.addresses = await common.xhr('saveAddress', $scope.modalAddr);
		} catch(e){
			$scope.addresses = [];
		}
		$scope.$digest();
		$("#edit-address").modal('hide');
	}
	$scope.deleteAddress = async function(){
		try {
			if ($scope.modalAddr.hasOwnProperty("id")){
				$scope.addresses = await common.xhr('deleteAddress', $scope.modalAddr);
			}
		} catch(e){
			$scope.addresses = [];
		}
		$scope.$digest();
		$("#edit-address").modal('hide');
	}
}])
.controller("_profile_store", ['$scope', '$stateParams', 'common', function ($scope, $stateParams, common) {
	(async function(){
		try {
			$scope.store = await common.xhr('getStoreInfo', {userid: $stateParams.userid, storeid: $stateParams.storeid});
			$scope.store.deliveryplan.push({distance: '', radius: '', order: '', currency: ''});
		} catch(e){
			$scope.store = [];
		}
		$scope.$digest();
	})();

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