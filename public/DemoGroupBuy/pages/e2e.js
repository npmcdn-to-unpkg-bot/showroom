angular
.module('myAppE2E', ['content', 'ngMockE2E'])
.run(['$httpBackend', '$timeout', function($httpBackend, $timeout) {
  var user = [
		{id: 1, email: 'guest@groupbuy.com', password: 'g', primaryaddr: 2}
	],
	address = [
		{id: 1, user: 0, streetno: '10', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'},
		{id: 2, user: 0, streetno: '20', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'},
		{id: 3, user: 0, streetno: '30', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'},
		{id: 4, user: 0, streetno: '40', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5'}
	],
	store = [
		{id: 1, user: 0, name: 'corner store', streetno: '10', streetname: 'king st', city: 'Kitchener', province: 'Ontario', country: 'Canada', postcode: 'N2A 0J5', description: 'Electronic commodity', deliveryplan: "[{distance: 1, radius: 0.2, order: 200, currency: 'CAD'}]"}
	];

	$httpBackend.whenRoute('GET', /.+\.html$/).passThrough();

	$httpBackend.whenRoute('POST', '/ajax/:method')
	.respond(function(method, url, data, headers, params) {
		let body = JSON.parse(data), tempUser;
		switch (params.method){
			case 'updateUser':
				user[0].primaryaddr = body.primaryaddr;
			case 'getUser':
				tempUser = angular.copy(user[0]);
				tempUser.password = undefined;
				return [200, tempUser];
				break;
			case 'getAddressList':
				return [200, address];
				break;
			case 'saveAddress':
				if (body.hasOwnProperty("id")){
					let tempIndex = address.map(o => o.id).indexOf(body.id);
					address[tempIndex] = body;
				} else {
					address.push({id: _.last(address).id + 1, ...body, user: 0});
				}
				return [200, address];
				break;
			case 'deleteAddress':
				if (body.hasOwnProperty("id")){
					let tempIndex = address.map(o => o.id).indexOf(body.id);
					address.splice(tempIndex, 1);
				}
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