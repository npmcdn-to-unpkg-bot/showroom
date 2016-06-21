angular
.module('myAppE2E', ['content', 'ngMockE2E'])
.run(['$httpBackend', function($httpBackend) {
  var address = [
		{streetno: '10', streetname: 'king st', city: 'kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'},
		{streetno: '10', streetname: 'king st', city: 'kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'},
		{streetno: '10', streetname: 'king st', city: 'kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'},
		{streetno: '10', streetname: 'king st', city: 'kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'}
	];

	$httpBackend.whenRoute('GET', '/[\S]+html$/').passThrough();

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