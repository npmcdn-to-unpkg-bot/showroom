(function (root) {
	'use strict';

	function factory(angular, Spinner) {
		return angular
			.module("KM_tools", ['angularSpinner'])
			.constant('configPara', {
				'ip': '0'
			})
			.service('common', ['$http', '$q', 'usSpinnerService', 'configPara', function($http, $q, usSpinnerService, configPara){
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
