(function (root) {
	'use strict';

	function factory(angular, Spinner) {
		return angular
			.module("KM_tools", ['angularSpinner'])
			.constant('configPara', {
				ip: '',
				// ip: 'http://localhost:3000',
				// ip: 'http://52.4.177.161:3000',
				// ip: 'https://ec2-52-4-177-161.compute-1.amazonaws.com:3000',
				// ip: 'https://keydecision.tk',
				// ip: window.location.protocol + '//' + window.location.hostname,
				api: '/ajax/',
				// isPhone: (window.location.protocol !== 'http:' && window.location.protocol !== 'https:')
			})
			.service('common', ['$http', '$q', 'usSpinnerService', 'configPara', function($http, $q, usSpinnerService, configPara){
				var _this = this;
				this.xhr = function(method, data){
					//return $q.resolve('error');
					usSpinnerService.spin('spinner-1');
					return $http.post(configPara.ip + configPara.api + method, data, {withCredentials: true}).then(function(response){
						usSpinnerService.stop('spinner-1');
						return response.data;
					}, function(response) {
						usSpinnerService.stop('spinner-1');
						return $q.reject(new Error(response.data || "Request failed"));
					});
				};
				this.WebsiteAvailability = function(websiteUrls){
					var promises = websiteUrls.map(function(websiteUrl){
						return $http.head(websiteUrl, {withCredentials: false}).then(function(response){
							return true;
						}, function(response) {
							return false;
						});
					});
					return $q.all(promises);
				};
				this.LoopThroughDOM = function(myElement, func){
					func(myElement);
					angular.forEach(myElement.children(), function (childElement) {
						_this.LoopThroughDOM(angular.element(childElement), func);
					});
/* 					console.log(myElement.children());
					myElement.children().each(function () {
						_this.LoopThroughDOM(angular.element(this), func); // "this" is the current child element in the loop
					}); */
				};
				this.CountWatchers = function(myElement){
					if (myElement === []) {return 0};
					var countResult = 0,
						myFunc = function(myElement){
							// console.log(myElement.data().$scope.$$watchers);
							if (myElement.data().$isolateScope && myElement.data().$isolateScope.$$watchers && myElement.data().$isolateScope.$$watchers.length){
								countResult += myElement.data().$isolateScope.$$watchers.length;
								// console.log(myElement.data().$isolateScope.$$watchers);
							}
							if (myElement.data().$scope && myElement.data().$scope.$$watchers && myElement.data().$scope.$$watchers.length){
								countResult += myElement.data().$scope.$$watchers.length;
								// console.log(myElement.data().$scope.$$watchers);
							}
						};
					_this.LoopThroughDOM(myElement, myFunc);
					return countResult;
				};
				this.DetachWatchers = function(myElement){
					if (myElement === []) {return undefined};
					var myFunc = function(myElement){
						if (myElement.data().$isolateScope && myElement.data().$isolateScope.$$watchers && (myElement.data().$isolateScope.$$watchers.length !== 0)){
							// console.log(myElement.data().$isolateScope.$$watchers, "isolate scope watchers detached!");
							myElement.data('backupWatchersIsolateScope', myElement.data().$isolateScope.$$watchers);
							myElement.data().$isolateScope.$$watchers = [];
						}
						if (myElement.data().$scope && myElement.data().$scope.$$watchers && (myElement.data().$scope.$$watchers.length !== 0)){
							// console.log(myElement.data().$scope.$$watchers, "scope watchers detached!");
							myElement.data('backupWatchersScope', myElement.data().$scope.$$watchers);
							myElement.data().$scope.$$watchers = [];
						}
					};
					_this.LoopThroughDOM(myElement, myFunc);
				};
				this.RetachWatchers = function(myElement){
					if (myElement === []) {return undefined};
					var myFunc = function(myElement){
						if (myElement.data().$isolateScope && myElement.data().$isolateScope.$$watchers && (myElement.data().$isolateScope.$$watchers.length === 0) && myElement.data().hasOwnProperty('backupWatchersIsolateScope')){ // Boolean([]) is evaluated to "true"
							myElement.data().$isolateScope.$$watchers = myElement.data('backupWatchersIsolateScope');
						}
						if (myElement.data().$scope && myElement.data().$scope.$$watchers && (myElement.data().$scope.$$watchers.length === 0) && myElement.data().hasOwnProperty('backupWatchersScope')){
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
}(window));
