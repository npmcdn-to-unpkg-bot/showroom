angular
  .module("login", ['KM_tools', 'ui.router'])
	.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
		$stateProvider
		.state('signin', {
			url: "/signin",
			views: {
				'mainpage': {
					templateUrl: '_signin.html',
					controller: '_signin'
				}
			}
		})
		.state('signup', {
			url: "/signup",
			views: {
				'mainpage': {
					templateUrl: '_signup.html',
					controller: '_signup'
				}
			}
		});
		$urlRouterProvider.otherwise("/signin");
	}])
  .controller("login_main", ['$scope', 'common', function($scope, common) {
		common.xhr('isLoggedIn', {}).then(function(msg){
			if (msg) {
				window.location.assign("content.html");
			}
		});
		// window.location.assign("content.html");
  }])
  .controller("_signin", ['$scope', 'common', function($scope, common) {
		function setCookie(cname, cvalue, exdays) {
				var d = new Date();
				d.setTime(d.getTime() + (exdays*24*60*60*1000));
				var expires = "expires="+d.toUTCString();
				document.cookie = cname + "=" + cvalue + "; " + expires;
		}
		function getCookie(cname) {
				var name = cname + "=";
				var ca = document.cookie.split(';');
				for(var i=0; i<ca.length; i++) {
						var c = ca[i];
						while (c.charAt(0)==' ') c = c.substring(1);
						if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
				}
				return "";
		}
		
		$scope.cred = {username: (typeof(Storage) !== "undefined")? localStorage.getItem("username") : getCookie('username')};
		$scope.cred.rememberMe = ($scope.cred.username && true);
		$scope.showAlert = false;
		$scope.errorMsg = '';
    $scope.login = function(){
			common.xhr('signin', $scope.cred).then(function(msg){
				if (msg) {
					$scope.showAlert = true;
					$scope.errorMsg = msg;
				} else {
					if(typeof(Storage) !== "undefined") {
							localStorage.setItem("username", ($scope.cred.rememberMe)? $scope.cred.username : "");
					} else {
							setCookie('username', ($scope.cred.rememberMe)? $scope.cred.username : "", 60);
					}
					window.location.assign("content.html");
				}
			}, function(msg){
				$scope.showAlert = true;
				$scope.errorMsg = msg;
			});
		};
  }])
  .controller("_signup", ['$scope', 'common', function($scope, common) {
		$scope.showAlert = false;
		$scope.showAlert_success = false;
		$scope.errorMsg = '';
		$scope.cred = {};
    $scope.signup = function(){
			common.xhr('signup', $scope.cred).then(function(msg){
				if (msg) {
					$scope.showAlert = true;
					$scope.showAlert_success = false;
					$scope.errorMsg = msg;
				} else {
					temp = $scope.cred.username;
					$scope.showAlert = false;
					$scope.showAlert_success = true;
					$scope.errorMsg = 'Sign up successful. Welcome, ' + temp + '!';
					setTimeout(function(){window.location.assign("#/signin");}, 2000);
				}
			}, function(msg){
				$scope.showAlert = true;
				$scope.showAlert_success = false;
				$scope.errorMsg = msg;
			});
		};
  }]);
