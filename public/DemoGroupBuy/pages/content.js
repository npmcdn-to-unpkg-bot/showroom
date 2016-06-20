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
    }
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
.run(['$rootScope', '$timeout', function ($rootScope, $timeout) {
		$rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
			$timeout(function(){$('#side-menu').metisMenu();}, 20);
		})
	}
])
.controller("content_main", ['$scope', 'common', function ($scope, common) {

}])
.controller("_storeList", ['$scope', '$timeout', function ($scope, $timeout) {

}])
.controller("_storeVisit", ['$scope', '$timeout', function ($scope, $timeout) {

}])
.controller("_profile", ['$scope', '$timeout', function ($scope, $timeout) {

}])
.controller("_profile_address", ['$scope', '$timeout', function ($scope, $timeout) {
var AddressList = React.createClass({
  getInitialState: function() {
    return {data: [1,2,3,4,5]};
  },
  render: function() {
    var addressNodes = this.state.data.map(function(address, index) {
      return (
        <Address author={address} key={index}>
        </Address>
      );
    });
    return (
      <ReactCSSTransitionGroup transitionName="gb-transition" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
        {addressNodes}
      </ReactCSSTransitionGroup>
    );
  }
}),
Address = React.createClass({
  render: function() {
    return (
                <div className="col-lg-3 col-md-6">
                    <div className="panel panel-primary">
                        <div className="panel-heading">
                            <div>
															100 King Street,
														</div>
														<div>
															Kitchener, Ontario
														</div>
														<div>
															Canada N3U 9I2
                            </div>
                        </div>
                        <a href="#">
                            <div className="panel-footer">
                                <span className="pull-left">Edit</span>
                                <span className="pull-right"><i className="fa fa-edit"></i></span>
                                <div className="clearfix"></div>
                            </div>
                        </a>
                    </div>
                </div>
    );
  }
}),
ReactCSSTransitionGroup = React.addons.CSSTransitionGroup,
addressListComponent = ReactDOM.render(
  <AddressList />,
  document.getElementById('address-list-content')
);
$scope.addAddress = function(){
	addressListComponent.setState({data: _.concat(addressListComponent.state.data, 20)});
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

angular.element(document).ready(function () {
	angular.bootstrap(document, ['content']);
});