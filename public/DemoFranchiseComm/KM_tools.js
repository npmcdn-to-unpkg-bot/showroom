(function (root) {
	'use strict';

	function factory(angular, Spinner) {
		return angular
			.module("KM_tools", ['angularSpinner'])
			.constant('configPara', {
				// ip: 'http://localhost:3000',
				// ip: 'http://52.4.177.161:3000',
				// ip: 'https://ec2-52-4-177-161.compute-1.amazonaws.com:3000',
				ip: 'https://keydecision.tk',
				// ip: window.location.protocol + '//' + window.location.hostname,
				api: '/ajax/',
				// isPhone: (window.location.protocol !== 'http:' && window.location.protocol !== 'https:')
			})
			.service('common', ['$http', '$q', 'usSpinnerService', 'configPara', function($http, $q, usSpinnerService, configPara){
				this.xhr = function(method, data){
					//return $q.resolve('error');
					usSpinnerService.spin('spinner-1');
					return $http.post(configPara.ip + configPara.api + method, data, {withCredentials: true}).then(function(response){
						usSpinnerService.stop('spinner-1');
						return response.data;
					}, function(response) {
						usSpinnerService.stop('spinner-1');
						return $q.reject(response.data || "Request failed");
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
