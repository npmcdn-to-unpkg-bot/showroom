//document.body.style.paddingTop = "70px";

angular
.module("content", ['KM_tools', 'socket.io', 'infinite-scroll', 'ionic'])
.config(['$stateProvider', '$urlRouterProvider', '$ionicConfigProvider', function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
	if (useAppStyle) {
		$stateProvider
			.state('index_cordova', {
				url: "/index_cordova",
				abstract: true,
				templateUrl: "_index_cordova.html"
			})
			.state('index_cordova.search', {
				url: "/search",
				views: {
					'search-tab': {
						templateUrl: "_search.html",
						controller: '_search'
					}
				}
			})
			.state('index_cordova.messages', {
				url: "/messages",
				views: {
					'messages-tab': {
						templateUrl: "_messages.html",
						controller: '_messages'
					}
				}
			})
			.state('index_cordova.list', {
				url: "/list",
				views: {
					'list-tab': {
						templateUrl: "_list.html"
					}
				}
			})
			.state('index_cordova.mylist', {
				url: "/mylist",
				views: {
					'list-tab': {
						templateUrl: "_mylist.html",
						controller: '_mylist'
					}
				}
			})
			.state('index_cordova.borrowed', {
				url: "/borrowed",
				views: {
					'list-tab': {
						templateUrl: "_borrowed.html",
						controller: '_borrowed'
					}
				}
			})
			.state('index_cordova.lent', {
				url: "/lent",
				views: {
					'list-tab': {
						templateUrl: "_lent.html",
						controller: '_lent'
					}
				}
			})
			.state('index_cordova.user', {
				url: "/user",
				views: {
					'list-tab': {
						templateUrl: "_user.html",
						controller: '_user'
					}
				}
			})
			.state('index_cordova.new', {
				url: "/new",
				views: {
					'list-tab': {
						templateUrl: "_edit.html",
						controller: '_new'
					}
				}
			})
			.state('index_cordova.edit', {
				url: "/edit/:itemId",
				views: {
					'list-tab': {
						templateUrl: "_edit.html",
						controller: '_edit'
					}
				}
			})
			.state('index_cordova.settings', {
				url: "/settings",
				views: {
					'settings-tab': {
						templateUrl: "_settings.html"
					}
				}
			})
			.state('index_cordova.editUser', {
				url: "/editUser",
				views: {
					'settings-tab': {
						templateUrl: "_editUser.html",
						controller: '_editUser'
					}
				}
			});

		 $urlRouterProvider.otherwise("/index_cordova/messages");
	} else {
		$stateProvider
			.state('index_web', {
				url: "/index_web",
				abstract: true,
				templateUrl: "_index_web.html"
			})
			.state('index_web.compare', {
				url: "/compare",
						templateUrl: "_compare.html",
						controller: '_compare'
			})
/* 			.state('index_web.search', {
				url: "/search",
						templateUrl: "_search.html",
						controller: '_search'
			})
			.state('index_web.messages', {
				url: "/messages",
						templateUrl: "_messages.html",
						controller: '_messages'
			})
			.state('index_web.mylist', {
				url: "/mylist",
						templateUrl: "_mylist.html",
						controller: '_mylist'
			})
			.state('index_web.borrowed', {
				url: "/borrowed",
						templateUrl: "_borrowed.html",
						controller: '_borrowed'
			})
			.state('index_web.lent', {
				url: "/lent",
						templateUrl: "_lent.html",
						controller: '_lent'
			})
			.state('index_web.user', {
				url: "/user",
						templateUrl: "_user.html",
						controller: '_user'
			})
			.state('index_web.new', {
				url: "/new",
						templateUrl: "_edit.html",
						controller: '_new'
			})
			.state('index_web.edit', {
				url: "/edit/:itemId",
						templateUrl: "_edit.html",
						controller: '_edit'
			})
			.state('index_web.editUser', {
				url: "/editUser",
						templateUrl: "_editUser.html",
						controller: '_editUser'
			})
			.state('index_web.directDb', {
				url: "/directDb",
						templateUrl: "_directDb.html",
						controller: '_directDb'
			});

		 $urlRouterProvider.otherwise("/index_web/messages"); */
		 $urlRouterProvider.otherwise("/index_web/compare");
		 $ionicConfigProvider.views.transition('none');
	}
}])
.config(['$socketProvider', 'configPara', function ($socketProvider, configPara) {
			$socketProvider.setConnectionUrl(configPara.ip);
		}
	])
.service('rootData', ['common', '$rootScope', '$ionicHistory', '$state', function (common, $rootScope, $ionicHistory, $state) {
			$rootScope.index_name = (useAppStyle)? 'index_cordova' : 'index_web';
			//$rootScope.useAppStyle = useAppStyle;
			$rootScope.$ionicHistory = $ionicHistory;
			$rootScope.$state = $state;
			$rootScope.messagesLength = 60;
			$rootScope.messagesAllRetrieved = false;
			$rootScope.goBack = function(){window.history.back()};
/* 			common.xhr('GetServerTime', {}).then(function (serverTime) {
				$rootScope.timeDifferenceFromServer = moment(serverTime).diff(moment());
			}); */
			var listData = {
				search : [],
				borrowed : [],
				lent : [],
				mylist : [],
				messages: []
			};
			this.listData = listData;
			var UpdateRootData = function (whatData) {
				var tempWhatData, tempNum;
				if (whatData) {
					whatData.forEach(function(item){
						if (item.name === 'messages') {
							item.quantity = $rootScope.messagesLength;
						} else if (item.name === 'all') {
							tempWhatData = [{name: 'search'}, {name: 'borrowed'}, {name: 'lent'}, {name: 'mylist'}, {name: 'messages', quantity: $rootScope.messagesLength}];
						}
					});
					whatData = tempWhatData? tempWhatData : whatData;
					return common.xhr('getAllData', {whatData: whatData}).then(function (data) {
						Object.keys(data).forEach(function (key) {
							listData[key] = data[key];
						});
						tempNum = 0;
						listData.messages.forEach(function(message){
							if (!message.viewed) {
								tempNum++;
							}
						});
						$rootScope.messagesTabBadgeNum = tempNum;
						// console.log($rootScope.messagesTabBadgeNum);
						if (listData.messages.length < $rootScope.messagesLength) {
							$rootScope.messagesAllRetrieved = true;
						}
						return listData;
					});
				}
			};
			this.UpdateRootData = UpdateRootData;
		}
	])
.service('PushService', ['common', 'rootData', '$rootScope', '$injector', function (common, rootData, $rootScope, $injector) {
/* 	var fallbackService = function(){ // use socket.io as fallback
		if ($injector.has('$socket')) {
			$socket = $injector.get('$socket');
			$socket.on('connect', function () {
				console.log('Socket connected.');
				rootData.UpdateRootData([{name: 'all'}]);
			});
			$socket.on('update', function (whatData) {
				rootData.UpdateRootData(whatData);
			});
		}
	},
	gcmApnsService = function(){
		var push = PushNotification.init({
				android: {
						senderID: "605583753010"
				},
				ios: {
						alert: "true",
						badge: "true",
						sound: "true"
				},
				windows: {}
		});
		push.on('registration', function(data) {
			// data.registrationId
			if (device.platform === "Android") {
				data.provider = "gcm";
			} else if (device.platform === "iOS") {
				data.provider = "apn";
			}
			function retryInterval(){
				common.xhr('SaveIdToPushService', data).then(function(msg){
					if (msg) {
						setTimeout(retryInterval, 15000); // retry registration
					}
				}, function(){setTimeout(retryInterval, 3000)});
			}
			retryInterval();
		});
		push.on('notification', function(data) {
			common.xhr('ReportBrowserError', {message: data}).then(function (msg) {});
			common.xhr('ReportBrowserError', {message: data.additionalData.whatData}).then(function (msg) {});
			// rootData.UpdateRootData([{name: 'all'}]);
			rootData.UpdateRootData(data.additionalData.whatData);
		});
		push.on('error', function(e) {
			// e.message
			common.xhr('ReportBrowserError', e).then(function (msg) {});
		});
		rootData.UpdateRootData([{name: 'all'}]); // when app starts
		document.addEventListener("resume", function(){rootData.UpdateRootData([{name: 'all'}]);}, false);
	};

	if (usePushService) {
		common.WebsiteAvailability([
			'https://gcm-http.googleapis.com/gcm/send',
			'https://api.push.apple.com/'
		]).then(function(results){
			//if ((device.platform === "Android" && results[0]) || (device.platform === "iOS" && results[1])) {
			if (device.platform === "Android") {
				var tempSuccess = function(checkResult){
					if (checkResult.isGooglePlayServicesAvailable && results[0]) {
						gcmApnsService();
					} else {
						fallbackService(); // fall back to socket.io if Google Play Services is not installed
					}
				},
				tempFailure = function(checkError){fallbackService();}; // fall back to socket.io if checking Google Play Services throws
				CheckInstalledServices.check(tempSuccess, tempFailure);
			} else if (device.platform === "iOS" && results[1]) { // use socket.io for iOS until iOS developer memebership is bought
				fallbackService();
			} else { // fall back to socket.io if no push service is available
				fallbackService();
			};
		});
	} else { // use socket.io if usePushService = false
		fallbackService();
	} */
}])
.controller("content_main", ['$scope', 'common', 'rootData', 'PushService', function ($scope, common, rootData, PushService) {
/* 			$scope.showAlert = false;
			$scope.errorMsg = '';
			common.xhr('isLoggedIn', {}).then(function (msg) {
				if (msg) {
				} else {
					window.location.assign("signInUp.html");
				}
			});
			$scope.logoff = function () {
				common.xhr('logoff', {}).then(function (msg) {
					if (msg) {
						$scope.showAlert = true;
						$scope.errorMsg = msg;
					} else {
						window.location.assign("signInUp.html");
					}
				});
			}; */
		}
	])
.controller('_compare', ['$scope', 'common', 'rootData', function ($scope, common, rootData) {
			var docDataBase = [
				{
					id: 0,
					released: false,
					related: {
						requirements: []
					}
				},
				{
					id: 1,
					released: true,
					related: {
						requirements: [
							{
								id: 8,
								section: "0",
								key: "title",
								value: "",
								unit: "",
								note: "SOLAR HEATING SYSTEM SPECIFICATIONS v1",
							},
							{
								id: 10,
								section: "1",
								key: "Documentation",
								value: "",
								unit: "",
								note: "Documentation consists of: \n1. Test certificates \n2. Documents required in standards (i.e. installer instruction manual etc.)",
							},
							{
								id: 11,
								section: "2",
								key: "General specifications and test certificate",
								value: "",
								unit: "",
								note: "Solar heating systems offered within these tendering procedures have to fulfil requirements according to existing or upcoming European test standards.",
							},
							{
								id: 12,
								section: "3",
								key: "Additional specifications and documentation",
								value: "",
								unit: "",
								note: "",
							},
							{
								id: 13,
								section: "3.1",
								key: "Collector",
								value: "",
								unit: "",
								note: "The objective is to utilise the same solar collector components for all three systems.",
							},
							{
								id: 14,
								section: "3.2",
								key: "Heat Exchangers",
								value: "",
								unit: "",
								note: "The tank shall have a spiral heat exchanger or a mantle heat exchanger (low flow tank).",
							},
							{
								id: 15,
								section: "4",
								key: "Test",
								value: "",
								unit: "",
								note: "",
							},
							{
								id: 16,
								section: "5",
								key: "Hot water load condition",
								value: "160",
								unit: "litre/day",
								note: "10 to 50 degC",
							}
						]
					}
				},
				{
					id: 2,
					released: false,
					related: {
						requirements: [
							{
								id: 28,
								section: "0",
								key: "title",
								value: "",
								unit: "",
								note: "SOLAR HEATING SYSTEM SPECIFICATIONS v1",
							},
							{
								id: 30,
								section: "1",
								key: "Documentation",
								value: "",
								unit: "",
								note: "Documentation consists of: \n1. Test certificates \n2. Documents required in standards (i.e. installer instruction manual etc.)",
							},
							{
								id: 31,
								section: "2",
								key: "General specifications and test certificate",
								value: "",
								unit: "",
								note: "Solar heating systems offered within these tendering procedures have to fulfil requirements according to existing or upcoming European test standards.",
							},
							{
								id: 32,
								section: "3",
								key: "Additional specifications and documentation",
								value: "",
								unit: "",
								note: "",
							},
							{
								id: 33,
								section: "3.1",
								key: "Collector",
								value: "",
								unit: "",
								note: "The objective is to utilise the same solar collector components for all three systems.",
							},
							{
								id: 34,
								section: "3.2",
								key: "Heat Exchangers",
								value: "",
								unit: "",
								note: "The tank shall have a spiral heat exchanger or a mantle heat exchanger (low flow tank).",
							},
							{
								id: 341,
								section: "3.3",
								key: "Storage devices",
								value: "",
								unit: "",
								note: "It is possible to state prices for several of the storage devices in question in the form below. Please note that the price of a storage device shall include 10 litres glycol.",
							},
							{
								id: 35,
								section: "4",
								key: "Test",
								value: "",
								unit: "",
								note: "",
							},
							{
								id: 36,
								section: "5",
								key: "Hot water load condition",
								value: "170",
								unit: "litre/day",
								note: "10 to 55 degC",
							}
						]
					}
				}
			];
			$scope.initset = {
				leftDocNum: "1",
				rightDocNum: "2",
				onlyShowDiff: false,
				//released: [false, false],
				readonly: [false, false],
				current: {original: 0}
			};
			$scope.reqList = [];
			// $scope.released = [false, false];
			$scope.itemsInList = 20;
			var isNotEqualKeys = ['section', 'key', 'value', 'unit', 'note'];
			$scope.IsNotEqual = function(value, index, array){
				if (!$scope.initset.onlyShowDiff) {return true;};
				for (var i = 0; i < isNotEqualKeys.length; i++) {
					if (value[0][isNotEqualKeys[i]] !== value[1][isNotEqualKeys[i]]) {return true;};
				};
				return false;
			};
			$scope.LoadDocument = function (leftDocument, rightDocument) {
				leftDocument = leftDocument || docDataBase[Number($scope.initset.leftDocNum)];
				rightDocument = rightDocument || docDataBase[Number($scope.initset.rightDocNum)];
				if (typeof leftDocument === "undefined" || typeof rightDocument === "undefined"){return 0};
				var	leftRequirements = leftDocument.related.requirements,
					rightRequirements = rightDocument.related.requirements,
					i, leftPointer = 0, rightPointer = 0, leftLaterMatch, rightLaterMatch, reqList=[];
				$scope.initset.readonly[0] = leftDocument.released;
				$scope.initset.readonly[1] = rightDocument.released;
				for (i = 0; i < leftRequirements.length + rightRequirements.length; i++) {
					if (leftPointer === leftRequirements.length && rightPointer === rightRequirements.length){break;}
					if (leftPointer === leftRequirements.length){
						reqList.push([{}, rightRequirements[rightPointer++]]);
						continue;
					}
					if (rightPointer === rightRequirements.length){
						reqList.push([leftRequirements[leftPointer++], {}]);
						continue;
					}
					if (leftRequirements[leftPointer].key === rightRequirements[rightPointer].key){
						reqList.push([leftRequirements[leftPointer++], rightRequirements[rightPointer++]]);
						continue;
					}
					rightLaterMatch = _.indexOf(_.map(leftRequirements.slice(leftPointer), 'key'), rightRequirements[rightPointer].key) >= 0; // pointed item in right matches one in the left array
					leftLaterMatch = _.indexOf(_.map(rightRequirements.slice(rightPointer), 'key'), leftRequirements[leftPointer].key) >= 0;
					if (rightLaterMatch === leftLaterMatch){ // if both sides match or both not match, it will be decided by section.
						if (leftRequirements[leftPointer].section.localeCompare(rightRequirements[rightPointer].section) < 1){
							reqList.push([leftRequirements[leftPointer++], {}]);
						} else {
							reqList.push([{}, rightRequirements[rightPointer++]]);
						}
						continue;
					}
					if (rightLaterMatch){
						reqList.push([leftRequirements[leftPointer++], {}]);
						continue;
					}
					if (leftLaterMatch){
						reqList.push([{}, rightRequirements[rightPointer++]]);
						continue;
					}
				}
				$scope.reqList = reqList;
			};
			var clipBoard;
			$scope.CopyItem = function () {
				clipBoard = angular.copy($scope.initset.current); // deep copy
			};
			$scope.PasteItem = function () {
				var indexItem = [_.findIndex($scope.reqList, function(item) { return item[0] === $scope.initset.current;}), _.findIndex($scope.reqList, function(item) { return item[1] === $scope.initset.current;})];
				if ((indexItem[0] > -1 && !$scope.initset.readonly[0]) || (indexItem[1] > -1 && !$scope.initset.readonly[1])){
					angular.copy(clipBoard, $scope.initset.current);
				}
			};
			$scope.AddItem = function () {
				var indexItem = _.findIndex($scope.reqList, function(item) { return (item[0] === $scope.initset.current) || (item[1] === $scope.initset.current); });
				$scope.reqList.splice(indexItem + 1, 0, [{}, {}]);
			};
			$scope.RemoveItem = function () {
				var indexItem = [_.findIndex($scope.reqList, function(item) { return item[0] === $scope.initset.current;}), _.findIndex($scope.reqList, function(item) { return item[1] === $scope.initset.current;})];
				indexItem.forEach(function(indexFind, index){
					if (indexFind > -1){
						$scope.reqList[indexFind][index] = {};
						if ((Object.keys($scope.reqList[indexFind][0]).length === 0) && (Object.keys($scope.reqList[indexFind][1]).length === 0)){
							$scope.reqList.splice(indexFind, 1);
						}
					}
				});
			};
			$scope.LoadMore = function () {
				$scope.itemsInList += 10;
			};
			$scope.CreateDocument = function (originalDoc) {
				originalDoc = originalDoc || docDataBase[Number($scope.initset.leftDocNum)];
				var newDoc = angular.copy(originalDoc);
				newDoc.released = false;
				$scope.LoadDocument(originalDoc, newDoc);
				docDataBase.push(newDoc);
				$scope.initset.rightDocNum = (docDataBase.length - 1).toString();
			};
			$scope.NewDocument = function () {
				var i, newDoc = angular.copy(docDataBase[0]);
				for (i = 0; i < 5; i++) {
					newDoc.related.requirements.push({id: 1,	section: "", key: "",	value: "", unit: "",	note: ""});
				}
				$scope.LoadDocument(newDoc, docDataBase[0]);
				docDataBase.push(newDoc);
				$scope.initset.leftDocNum = (docDataBase.length - 1).toString();
				$scope.initset.rightDocNum = "";
			};
			$scope.LoadDocument(docDataBase[Number($scope.initset.leftDocNum)], docDataBase[Number($scope.initset.rightDocNum)]);

			$scope.countWatchers = common.CountWatchers(angular.element(document.querySelector( '#compare-wrapper-messages' )));
 			setInterval(function(){
				$scope.countWatchers = common.CountWatchers(angular.element(document.querySelector( '#compare-wrapper-messages' )));
				//console.log($scope.countWatchers, $scope.initset.current);
				$scope.$apply();
			}, 60000);
/*			setTimeout(function(){
				common.DetachWatchers(angular.element(document.querySelector( '#compare-wrapper-messages' )));
				console.log("Detached!");
			}, 10000);
			setTimeout(function(){
				common.RetachWatchers(angular.element(document.querySelector( '#compare-wrapper-messages' )));
				console.log("Retached!");
			}, 18000); */
		}
	])
.controller("_search", ['$scope', 'common', 'rootData', '$ionicModal', function ($scope, common, rootData, $ionicModal) {
			$ionicModal.fromTemplateUrl('_showUserModal.html', {
				scope: $scope,
				animation: 'slide-in-up'
			}).then(function(modal) {
				$scope.showUserModal = modal;
			});
			$ionicModal.fromTemplateUrl('_grabItemModal.html', {
				scope: $scope,
				animation: 'slide-in-up'
			}).then(function(modal) {
				$scope.grabItemModal = modal;
			});
			$scope.OpenShowUserModal = function(user) {
				$scope.user = user;
				$scope.showUserModal.show();
			};
			$scope.OpenGrabItemModal = function(itemId) {
				$scope.itemId = itemId;
				$scope.grabItemModal.show();
			};
			$scope.search = {term: ''};
			$scope.listData = rootData.listData;
			$scope.showAlert = false;
			$scope.errorMsg = '';
			$scope.itemsInList = 5;
			$scope.LoadMore = function () {
				console.log("LoadMore fired!")
				$scope.itemsInList = $scope.itemsInList + 5;
			};
			$scope.SearchItem = function () {
				common.xhr('SearchItem', {
					searchString : $scope.search.term
				}).then(function (items) {
					$scope.items = items;
				});
			};
			$scope.GrabItem = function (itemId) {
				$scope.grabItemModal.hide();
				common.xhr('GrabItem', {
					id : itemId
				}).then(function (msg) {
					if (msg) {
						$scope.showAlert = true;
						$scope.errorMsg = msg;
					} else {
						$scope.showAlert = true;
						$scope.errorMsg = 'One item got!';
						$scope.SearchItem();
					}
				});
			};
			$scope.$on('$ionicView.enter', function(){
				$scope.itemsInList = 5;
			});
		}
	])
.controller("_borrowed", ['$scope', 'common', 'rootData', '$ionicModal', function ($scope, common, rootData, $ionicModal) {
			$ionicModal.fromTemplateUrl('_showUserModal.html', {
				scope: $scope,
				animation: 'slide-in-up'
			}).then(function(modal) {
				$scope.showUserModal = modal;
			});
			$scope.OpenShowUserModal = function(user) {
				$scope.user = user;
				$scope.showUserModal.show();
			};
			$scope.listData = rootData.listData;
			$scope.showAlert = false;
			$scope.errorMsg = '';
			$scope.itemsInList = 5;
			$scope.LoadMore = function () {
				$scope.itemsInList = $scope.itemsInList + 5;
			};
			$scope.$on('$ionicView.enter', function(){
				$scope.itemsInList = 5;
			});
		}
	])
.controller("_lent", ['$scope', 'common', 'rootData', '$ionicModal', function ($scope, common, rootData, $ionicModal) {
			$ionicModal.fromTemplateUrl('_showUserModal.html', {
				scope: $scope,
				animation: 'slide-in-up'
			}).then(function(modal) {
				$scope.showUserModal = modal;
			});
			$ionicModal.fromTemplateUrl('_receiveItemModal.html', {
				scope: $scope,
				animation: 'slide-in-up'
			}).then(function(modal) {
				$scope.receiveItemModal = modal;
			});
			$scope.OpenShowUserModal = function(user) {
				$scope.user = user;
				$scope.showUserModal.show();
			};
			$scope.OpenReceiveItemModal = function(holderId, itemId) {
				$scope.holderId = holderId;
				$scope.itemId = itemId;
				$scope.receiveItemModal.show();
			};
			$scope.listData = rootData.listData;
			$scope.showAlert = false;
			$scope.errorMsg = '';
			$scope.itemsInList = 5;
			$scope.LoadMore = function () {
				$scope.itemsInList = $scope.itemsInList + 5;
			};
			$scope.ReceiveItem = function (holderId, itemId) {
				$scope.receiveItemModal.hide();
				common.xhr('ReceiveItem', {
					from : holderId,
					item : itemId
				}).then(function (msg) {
					if (msg) {
						$scope.showAlert = true;
						$scope.errorMsg = msg + 'error';
					} else {
						$scope.showAlert = true;
						$scope.errorMsg = 'One item got back!';
					}
				});
			};
			$scope.$on('$ionicView.enter', function(){
				$scope.itemsInList = 5;
			});
		}
	])
.controller('_mylist', ['$scope', 'common', 'rootData', function ($scope, common, rootData) {
			$scope.listData = rootData.listData;
			$scope.itemsInList = 5;
			$scope.LoadMore = function () {
				console.log("LoadMore fired!")
				$scope.itemsInList = $scope.itemsInList + 5;
			};
			$scope.$on('$ionicView.enter', function(){
				$scope.itemsInList = 5;
			});
		}
	])
.controller('_new', ['$scope', 'common', 'rootData', function ($scope, common, rootData) {
			$scope.showQuantity = true;
			$scope.formData = {
				MLS : 123,
				quantity : 2,
				street : '1 king st',
				city : 'London',
				province : 'FS',
				postcode : 'H0H0H0',
				description : 'good location'
			};
			$scope.fields = [
				{tag: "input", name : "MLS", label : "MLS #", type : "text"},
				{tag: "input", name : "quantity", label : "Quantity", type : "number"},
				{tag: "input", name : "street", label : "Street", type : "text"},
				{tag: "input", name : "city", label : "City", type : "text"},
				{tag: "input", name : "province", label : "Province", type : "text"},
				{tag: "input", name : "postcode", label : "Postcode", type : "text"},
				{tag: "textarea", name : "description", label : "Description", type : ""}
			];
			$scope.ChangeItem = function () {
				common.xhr('NewItem', $scope.formData).then(function (msg) {
					if (msg) {
						$scope.showAlert = true;
						$scope.errorMsg = msg + 'error';
					} else {
						$scope.showAlert = true;
						$scope.errorMsg = 'Item created!';
					}
				}, function(msg){
					$scope.showAlert = true;
					$scope.errorMsg = msg;
				});
			};
		}
	])
.controller('_edit', ['$scope', 'common', 'rootData', '$stateParams', function ($scope, common, rootData, $stateParams) {
			$scope.showQuantity = false;
			common.xhr('GetItem', {
				id : $stateParams.itemId
			}).then(function (item) {
				$scope.formData = item;
			});
			$scope.fields = [
				{tag: "input", name : "MLS", label : "MLS #", type : "text"},
				{tag: "input", name : "street", label : "Street", type : "text"},
				{tag: "input", name : "city", label : "City", type : "text"},
				{tag: "input", name : "province", label : "Province", type : "text"},
				{tag: "input", name : "postcode", label : "Postcode", type : "text"},
				{tag: "textarea", name : "description", label : "Description", type : ""}
			];
			$scope.ChangeItem = function () {
				common.xhr('UpdateItem', $scope.formData).then(function (msg) {
					if (msg) {
						$scope.showAlert = true;
						$scope.errorMsg = msg;
					} else {
						$scope.showAlert = true;
						$scope.errorMsg = 'Item updated!';
					}
				}, function(msg){
					$scope.showAlert = true;
					$scope.errorMsg = msg;
				});
			};
			$scope.DeleteItem = function () {
				common.xhr('DeleteItem', $scope.formData).then(function (msg) {
					if (msg) {
						$scope.showAlert = true;
						$scope.errorMsg = msg;
					} else {
						$scope.showAlert = true;
						$scope.errorMsg = 'Item deleted!';
					}
				}, function(msg){
					$scope.showAlert = true;
					$scope.errorMsg = msg;
				});
			};
		}
	])
.controller('_user', ['$scope', 'common', 'rootData', '$stateParams', function ($scope, common, rootData, $stateParams) {
			common.xhr('GetUser', {
				id : Number($stateParams.userId)
			}).then(function (tempUser) {
				$scope.user = tempUser;
				if (Number($stateParams.userId) === 0) {
					$scope.isThisUser = true;
				} else {
					common.xhr('GetUser', {})
					.then(function (tempUser2) {
						$scope.isThisUser = (Number($stateParams.userId) === tempUser2.id);
					});
				}
			});
		}
	])
.controller('_editUser', ['$scope', 'common', 'rootData', function ($scope, common, rootData) {
			common.xhr('GetUser', {}).then(function (user) {
				$scope.formData = user;
			});
			$scope.fields = [
				{tag: "input", name : "firstname", label : "First name", type : "text"},
				{tag: "input", name : "lastname", label : "Last name", type : "text"},
				{tag: "input", name : "company", label : "Company", type : "text"},
				{tag: "input", name : "street", label : "Street", type : "text"},
				{tag: "input", name : "city", label : "City", type : "text"},
				{tag: "input", name : "province", label : "Province", type : "text"},
				{tag: "input", name : "country", label : "Country", type : "text"},
				{tag: "input", name : "postcode", label : "Postcode", type : "text"},
				{tag: "input", name : "phone", label : "Phone", type : "text"},
				{tag: "input", name : "email", label : "Email", type : "email"}
			];
			$scope.UpdateUser = function () {
				common.xhr('UpdateUser', $scope.formData).then(function (msg) {
					if (msg) {
						$scope.showAlert = true;
						$scope.errorMsg = msg;
					} else {
						$scope.showAlert = true;
						$scope.errorMsg = 'User updated!';
					}
				}, function(msg){
					$scope.showAlert = true;
					$scope.errorMsg = msg;
				});
			};
		}
	])
.controller('_directDb', ['$scope', 'common', 'rootData', function ($scope, common, rootData) {
			$scope.item = {content: '', command: ''};
			$scope.DirectDb = function () {
				$scope.item.content += '--- COMMAND --- \n';
				$scope.item.content += $scope.item.command;
				$scope.item.content += '\n--- RESPONSE --- \n';
				common.xhr('DirectDb', {command: $scope.item.command}).then(function (msg) {
					$scope.item.command = '';
					$scope.item.content += JSON.stringify(msg);
					$scope.item.content += '\n\n';
					setTimeout(function(){
						document.getElementById("textarea1").scrollTop = document.getElementById("textarea1").scrollHeight;
					}, 200);

				});
			};
		}
	])
.controller('_messages', ['$scope', 'common', 'rootData', function ($scope, common, rootData) {
			$scope.listData = rootData.listData;
			$scope.itemsInList = 20;
			$scope.changeLine = (window.innerWidth < 600);
			$scope.LoadMore = function () {
				console.log("LoadMore fired!");
				if ($scope.itemsInList >= $scope.$root.messagesLength) {
					if (!$scope.$root.messagesAllRetrieved) {
						$scope.$root.messagesLength += 60;
						rootData.UpdateRootData([{name: 'messages', quantity: $scope.$root.messagesLength}]);
					}
				} else {
					$scope.itemsInList += 10;
				}
			};
			var MsgAreViewed = function () { // mark all messages as viewed and clear badge
				console.log("MsgAreViewed fired!")
				var viewID = [];
				$scope.listData.messages.forEach(function(message){
					if (!message.viewed) {
						viewID.push(message.id);
						message.viewed = true;
					}
					message.fromNow = moment(message.created_at + "+00:00").from(moment().add($scope.$root.timeDifferenceFromServer, 'ms'));
				});
				$scope.$root.messagesTabBadgeNum = 0;
				if (viewID.length > 0) {
					common.xhr('MsgViewed', {viewID: viewID}).then(function (msg) {
						if (msg) {
							$scope.showAlert = true;
							$scope.errorMsg = msg;
						} else {
							$scope.showAlert = false;
						}
					});
				}
			}
			var watchMsgAreViewed;
			$scope.$on('$ionicView.enter', function(){
				$scope.itemsInList = 20;
				$scope.$root.messagesLength = 60;
				$scope.$root.messagesAllRetrieved = false;
				watchMsgAreViewed = $scope.$watch('listData.messages', MsgAreViewed); // run when in this page
			});
			$scope.$on('$ionicView.leave', function(){console.log("deregistered!");watchMsgAreViewed();}); // deregister $watch
			//$scope.$on('$ionicView.leave', watchMsgAreViewed); // deregister $watch
		}
	])
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
}])
.directive('nsCompare', ['$state', 'common', function($state, common) {
  return {
    restrict: 'AE',
		transclude: true,
    scope: {
			nsRequirement: '=nsRequirement',
			nsReadonly: '=nsReadonly',
			nsCurrent: '=nsCurrent'
		},
		templateUrl: '_nsCompare.html',
    link: function(scope, element, attrs) {
			scope.updateFormat = function(){
				scope.nsFormat = {'whole': false};
				['section', 'key', 'value', 'unit', 'note'].forEach(function(key){
					scope.nsFormat[key] = (scope.nsRequirement[0][key] !== scope.nsRequirement[1][key]);
					scope.nsFormat['whole'] = scope.nsFormat['whole'] || scope.nsFormat[key];
				});
			}
			scope.clickFunc = function(side){
				common.DetachWatchers(angular.element(document.querySelector(attrs.nsRepeatParentDiv)));
				common.RetachWatchers(element);
				scope.nsCurrent.current = scope.nsRequirement[side]; // use . to pass value back to $parent scope
				/* console.log(side, scope.nsCurrent.current); */
			}
			scope.$watch('nsRequirement', function(newValue, oldValue){
				scope.updateFormat();
				setTimeout(function(){ // at initialization, the textarea width is not 100% yet. So just let it to settle down.
					angular.forEach(element.find("textarea"), function (childElement) {
						childElement.style.overflow = 'hidden';
						childElement.style.height = 0;
						childElement.style.height = childElement.scrollHeight + 'px';
					});
				}, 0);
			}, true);
			//scope.updateFormat(); // the above $watch will run updateFormat() once at registration
		}
  };
}]);

angular.element(document).ready(function () {
	if (window.cordova) {
		document.addEventListener('deviceready', function () {
			angular.bootstrap(document, ['content']);
		}, false);
	} else {
		angular.bootstrap(document, ['content']);
	}
});
