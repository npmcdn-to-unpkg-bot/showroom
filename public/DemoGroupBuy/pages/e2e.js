angular
.module('myAppE2E', ['content', 'ngMockE2E'])
.run(['$httpBackend', '$timeout', function($httpBackend, $timeout) {
  var address = [
		{id: 1, streetno: '10', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'},
		{id: 2, streetno: '20', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'},
		{id: 3, streetno: '30', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'},
		{id: 4, streetno: '40', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'}
	];

	$httpBackend.whenRoute('GET', /.+\.html$/).passThrough();

	$httpBackend.whenRoute('POST', '/ajax/:method')
	.respond(function(method, url, data, headers, params) {

			switch (params.method){
				case 'getAddressList':
					return [200, address];
					break;
				default:
					return [200, {}];
			}

	});
}]);

angular.element(document).ready(function () {
	angular.bootstrap(document, ['myAppE2E']);
});