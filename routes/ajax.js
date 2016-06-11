/*************************************************************
* 
**************************************************************/
var bcrypt = require('bcrypt-nodejs'),
	Model = require('../model'),
	passport = require('passport'),
	co = require('co'),
	_ = require('lodash'),
	https = require('https'),
	gcm = require('node-gcm');

exports = module.exports = function (eventEmitter, io) {
	var sendPromiseGcm = function(dataToSend, registrationId, repeatTimes){
		var message = new gcm.Message({data: dataToSend}),
			sender = new gcm.Sender(process.env.GCM_API_KEY);
		return new Promise(function(resolve, reject) {
			sender.send(message, registrationId, repeatTimes, function (err, response) {
				if (err) return reject(err);
				resolve(response);
			});
		});
	}
	var PushServiceSend = co.wrap(function *(id, dataToSend, pushService, repeatTimes){
		if (pushService.provider === "gcm") {
			var oldRegistrationId = pushService.registrationId;
			try {
				var response = yield sendPromiseGcm(dataToSend, oldRegistrationId, repeatTimes);
			} catch (err) {
				console.error(err.message);
				return 'Failed to send message to GCM server';
			}
			if (response.canonical_ids) {
				if (response.results[0].hasOwnProperty('message_id') && response.results[0].hasOwnProperty('registration_id') && (oldRegistrationId !== response.results[0].registration_id)) {
					try {
						var _gcm_id_new = yield Model.PushService.forge({user_id: id, registrationId: response.results[0].registration_id, provider: "gcm"}).fetch();
						var _gcm_id_old = yield Model.PushService.forge({user_id: id, registrationId: oldRegistrationId, provider: "gcm"}).fetch();
					} catch (err) {
						console.error(err.message);
						return 'Failed to find registrationId';
					}
					try {
						if (_gcm_id_new) {
							yield Model.PushService.forge({id: _gcm_id_old.get('id')}).destroy();
						} else {
							yield Model.PushService.forge({id: _gcm_id_old.get('id'), user_id: holder.id, registrationId: response.results[0].registration_id, provider: "gcm"}).save();
						}
					} catch (err) {
						console.error(err.message);
						return 'Failed to update registrationId';
					}
				}
			}
			if (response.failure && response.results[0].error) {
				if (response.results[0].error === "NotRegistered" || response.results[0].error === "InvalidRegistration") {
					try {
						yield Model.PushService.forge().where({user_id: id, registrationId: oldRegistrationId, provider: "gcm"}).destroy();
					} catch (err) {
						console.error(err.message);
						return 'Failed to remove invalid registrationId';
					}
				} else if (response.results[0].error === "Unavailable") {
					// setTimeout(function(){sender.send(message, oldRegistrationId, 10, function(err, response){});}, 10000);										
				}
			}
		} else if (pushService.provider === "apn") {
		}
	});

	function AskItemHoldersToUpdate(item){
		return item.holders()
			.fetch({withRelated: ['sockets', 'pushservice']})
			.then(function(holders){
				holders.toJSON().forEach(function(holder){
					holder.sockets.forEach(function(socket){
						io.to(socket.socketid).emit('update', [{name: 'borrowed'}]);
					})
					holder.pushservice.toJSON().forEach(function(pushService){
						var dataToSend = {whatData: [{name: 'borrowed'}]};
						PushServiceSend(holder.id, dataToSend, pushService, 10);
					});
				});
				return item;
			}, function(){
				return Promise.reject('Failed to broadcast.\n');
			});
	};

	function AskUserToUpdate(id, data){
		return Model.User.forge({id: id})
			.fetch({withRelated: ['sockets', 'pushservice']})
			.then(function(user){
				if (data.whatData) {
					user.related('sockets').toJSON().forEach(function(socket){
						io.to(socket.socketid).emit('update', data.whatData);
					});
				}
				user.related('pushservice').toJSON().forEach(function(pushService){
					var dataToSend = {};
					if (data.whatData) {dataToSend.whatData = data.whatData;}
					if (data.message) {
						dataToSend.title = 'KeyDecision';
						dataToSend.body = data.message;
					}
					PushServiceSend(id, dataToSend, pushService, 10);
				});
				return user;
			}, function(){
				return Promise.reject('Failed to broadcast.\n');
			});
	};

	var TransferItem = co.wrap(function *(from, to, item, quantity){ // yield any promise
		var from_user, to_user, _item;
		quantity = (typeof quantity !== 'undefined')? quantity : 1;

		if (from === to) {
			return 'Cannot give it to yourself.\n';
		}

		try {
			_item = yield Model.Item.forge({id: item}).fetch({withRelated: ['holders']});
			from_user = _.find(_item.related('holders').toJSON(), {id: from});
			currentQuantity = (from_user)? from_user._pivot_quantity : 0;
			if (currentQuantity > quantity) {
				yield _item.related('holders').updatePivot({quantity: currentQuantity - quantity}, {query: {where: {user_id: from}}});
			} else if (currentQuantity === quantity) {
				yield _item.related('holders').detach({user_id: from});
			} else {
				return 'Giver does not have enough quantity to give.\n';
			}
		} catch (err) {
			console.error(err.message);
			return 'From user update failed.\n';
		}

		to_user = _.find(_item.related('holders').toJSON(), {id: to});
		try {
			if (to_user) {
				yield _item.related('holders').updatePivot({quantity: to_user._pivot_quantity + quantity}, {query: {where: {user_id: to}}});
			} else {
				yield _item.related('holders').attach({user_id: to, item_id: item, quantity: quantity});
				to_user = (yield Model.User.forge({id: to}).fetch()).toJSON();
			}
		} catch (err) {
			console.error(err.message);
			return 'To user update failed.\n';
		}

		try {
			yield Model.Transaction.forge({from_id: from, to_id: to, item_id: item, quantity: quantity}).save();
		} catch (err) {
			console.error(err.message);
			return 'Transaction insertion failed.\n';
		}

		var tempMsg1 = 'Gave MLS: ' + _item.get('MLS') + ' Qty: ' + quantity + ' to ' + to_user.username,
			tempMsg2 = 'Received MLS: ' + _item.get('MLS') + ' Qty: ' + quantity + ' from ' + from_user.username;
		try {
			yield Model.User.forge({id: from}).messages().create({content: tempMsg1});
			yield Model.User.forge({id: to}).messages().create({content: tempMsg2});
		} catch (err) {
			console.error(err.message, tempMsg1, tempMsg2);
		}

		AskUserToUpdate(from, {message: tempMsg1, whatData: [{name: 'all'}]});
		AskUserToUpdate(to, {message: tempMsg2, whatData: [{name: 'all'}]});
		return '';
	});

/*************************************************************
* middleware starts here
**************************************************************/
	return function(req, res, next) {
		co(function *(){
			switch (req.params.method){
			
			case "isLoggedIn":
				res.json(req.isAuthenticated());
				break;
				
			case "logoff":
				if (req.isAuthenticated()) {
					req.logout();
					res.send('');
				} else {
					res.status(404);
					res.send('error: not logged in');
				}
				break;
				
			case "signin":
				if (req.isAuthenticated()) {
					res.send('error: already logged in');
				} else {
					passport.authenticate('local', function(err, user, info){
						if (err) {
							return next(err);
						} else if (!user) {
							return res.send(info.message);
						} else {
							req.logIn(user, function(err){
								if (err) {
									return next(err);
								} else {
									return res.send('');
								}
							});
						};
					})(req, res, next); // passport.authenticate is itself a middleware
				};
				break;
				
			case "signup":
				if (req.isAuthenticated()) { // if already logged in, ignore both GET and POST
					res.send('error: logged in');
				} else {
					try {
						model = yield Model.User.forge().query({where: {username: req.body.username},orWhere: {email: req.body.email}}).fetch();
					} catch (err) {
						console.error(err.message);
						res.send(err.message);
					}
					if (model) {
						res.send('username or email already exists');
					} else {
						//****************************************************//
						// MORE VALIDATION GOES HERE(E.G. PASSWORD VALIDATION)
						//****************************************************//
						bcrypt.hash(req.body.password, null, null, function(err, hash) {
							if (err) {
								res.json(err);
							} else {
								co(function *(){
									try {
										req.body.password = hash;
										yield Model.User.forge(req.body).save();
										res.send('');
									} catch (err) {
										console.error(err.message);
										res.send(err.message);
									}
								});
							}
						});
					}
				}
				break;

			case "getAllData":
				var tempObj,
					_user = req.user,
					tempToUpdate = _.pluck(req.body.whatData, 'name'),
					resultLent = [],
					resultMylist = [],
					resultItem = {};
				if (_.find(req.body.whatData, {'name': 'all'})) {
					req.body.whatData = [{name: 'search'}, {name: 'borrowed'}, {name: 'lent'}, {name: 'mylist'}, {name: 'messages'}];
				}
				if (_.find(req.body.whatData, {'name': 'borrowed'})) {
					try {
						resultBorrowed = (yield _user.hold().fetch({withRelated: ['owner']})).toJSON();
						_.remove(resultBorrowed, {user_id: _user.get('id')});
						resultItem.borrowed = resultBorrowed;
					} catch (err) {
						console.error(err.message);
						resultItem.borrowed = [];
					}
				}
				if (_.find(req.body.whatData, {'name': 'lent'}) || _.find(req.body.whatData, {'name': 'mylist'})) {
					try {
						resultMylist = (yield _user.own().fetch({withRelated: ['holders']})).toJSON();
						resultMylist.forEach(function(item){
							item.holders.forEach(function(holder){
								if (holder.id !== _user.get('id')) {
									tempObj = {};
									['id', 'MLS', 'street', 'city', 'province', 'postcode', 'description'].forEach(function(key){tempObj[key] = item[key]});
									tempObj.holder = holder;
									resultLent.push(tempObj);
								}
							});
							item.totalQty = _.sum(item.holders, '_pivot_quantity');
							tempOwner =  _.findWhere(item.holders, {'id': _user.get('id')});
							item.ownerQty = (tempOwner)? tempOwner._pivot_quantity : 0;
						});	
						resultItem.mylist = resultMylist;
						resultItem.lent = resultLent;
					} catch (err) {
						console.error(err.message);
						resultItem.mylist = [];
						resultItem.lent = [];
					}
				}
				whatDataMessages = _.find(req.body.whatData, {'name': 'messages'});
				if (whatDataMessages) {
					var msgQty = (typeof whatDataMessages.quantity === 'number')? whatDataMessages.quantity : 60;
					try {
						resultItem.messages = (yield _user.messages().query({orderByRaw: 'id DESC',  limit: msgQty}).fetch()).toJSON();
					} catch (err) {
						console.error(err.message);
						resultItem.messages = [];
					}
				}
				res.json(resultItem);
				break;

			case "NewItem":
				var quantity = req.body.quantity,
					_user = req.user;
				delete req.body.quantity;
				if (quantity <= 0) {
					res.send('Failed to create item. Quantity must be greater than zero.\n');
				} else {
					try {
						item = yield _user.own().create(req.body);
					} catch (err) {
						console.error(err.message);
						return res.send('Failed to create item');
					}
					
					try {
						yield _user.hold().attach({user_id: _user.get('id'), item_id: item.get('id'), quantity: quantity});
					} catch (err) {
						console.error(err.message);
						return res.send('Failed to attach newly created item to owner');
					}

					var tempMsg = 'New item created. MLS: ' + req.body.MLS + ', Qty: ' + quantity;
					try {
						yield _user.messages().create({content: tempMsg});
					} catch (err) {
						console.error(err.message, tempMsg);
					}

					AskUserToUpdate(req.user.get('id'), {whatData: [{name: 'mylist'}, {name: 'messages'}]});
					res.send('');
				}
				break;

			case "SearchItem":
				var resultItemJSON;
				try {
					resultItem = yield Model.Item.collection().query("whereRaw", "MATCH (MLS, street, city, province, postcode, description) AGAINST (\'" + req.body.searchString + "\')").fetch({withRelated: ['owner', 'holders']});
					resultItemJSON = resultItem.toJSON();
					resultItemJSON.forEach(function(item){
						item.totalQty = _.sum(item.holders, '_pivot_quantity');
						tempOwner =  _.findWhere(item.holders, {'id': item.owner.id});
						item.ownerQty = (tempOwner)? tempOwner._pivot_quantity : 0;
					});
					res.json(resultItemJSON);
				} catch (err) {
					console.error(err.message);
					res.json([]);
				}
				break;

			case "GetItem":
				try {
					item = yield Model.Item.forge({id: req.body.id}).fetch();
					res.json(item);
				} catch (err) {
					console.error(err.message);
					res.json(err.message);
				}
				break;

			case "UpdateItem":
				try {
					item = yield Model.Item.forge(req.body).save();
				} catch (err) {
					console.error(err.message);
					return res.send(err.message);
				}
				AskUserToUpdate(req.user.get('id'), {whatData: [{name: 'lent'}, {name: 'mylist'}]});
				AskItemHoldersToUpdate(item);
				res.send('');
				break;

			case "DeleteItem":
				var owner, holders;
				try {
					item = yield Model.Item.forge({id: req.body.id}).fetch({withRelated: ['owner', 'holders']});
				} catch (err) {
					console.error(err.message);
					return res.send(err.message);
				}
				owner = item.related('owner').toJSON();
				holders = item.related('holders').toJSON();
				if (holders.length === 1 && holders[0].id === owner.id) {
					var tempMsg = 'Item deleted. MLS: ' + item.get('MLS') + ', Qty: ' + holders[0]._pivot_quantity;
					try {
						yield item.related('holders').detach();
					} catch (err) {
						console.error(err.message);
						return res.send(err.message);
					}

					try {
						yield item.destroy();
					} catch (err) {
						console.error(err.message);
						return res.send(err.message);
					}

					try {
						yield item.related('owner').messages().create({content: tempMsg});
					} catch (err) {
						console.error(err.message, tempMsg);
					}

					AskUserToUpdate(req.user.get('id'), {whatData: [{name: 'mylist'}, {name: 'messages'}]});
					res.send('');
				} else {
					res.send('Failed to delete. Some of this item are held by other people.\n');
				}
				break;

			case "GrabItem":
				var _user = req.user,
				itemId = req.body.id;
				try {
					_item = yield Model.Item.forge({id: itemId}).fetch({withRelated: ['owner']});
					res.send(yield TransferItem(_item.related('owner').get('id'), req.user.id, itemId, 1));
				} catch (err) {
					console.error(err.message);
					res.send('Transfer failed');
				}
				break;

			case "ReceiveItem":
				try {
					res.send(yield TransferItem(req.body.from, req.user.id, req.body.item, 1));
				} catch (err) {
					console.log(err);
					console.error(err.message);
					res.send('Transfer failed');
				}
				break;

			case "GetUser":
				var _user;
				try {
					if (req.body.id) { // id=0 is to get logged-in user
						_user = yield Model.User.forge({id: req.body.id}).fetch();
					} else {
						_user = req.user;
					}
					res.json(_user.toJSON());
				} catch (err) {
					console.error(err.message);
					res.json(err.message);
				}
				break;

			case "UpdateUser":
				try {
					tempUser = req.body;
					tempUser.id = req.user.id;
					_user = yield Model.User.forge(tempUser).save();
				} catch (err) {
					console.error(err.message);
					return res.send(err.message);
				}
				res.send('');
				break;

			case "DirectDb":
				try {
					var _res = yield Model.knex.raw(req.body.command, []);
					res.json(_res);
				} catch (err) {
					console.error(err.message);
					res.send([err.message]);
				}
				break;

			case "MsgViewed":
				try {
					yield Model.knex('messages').whereIn('id', req.body.viewID).update({viewed: true, updated_at: new Date()});
					res.send('');
				} catch (err) {
					console.error(err.message);
					res.send(err.message);
				}
				break;

			case "SaveIdToPushService":
				try {
					var idAlreadyExsit = false,
						tempPushService = yield Model.PushService.forge().where({registrationId: req.body.registrationId, provider: req.body.provider}).fetchAll();
					tempPushService.toJSON().forEach(co.wrap(function *(model){
						if(model.user_id === req.user.get('id')){
							idAlreadyExsit = true;
						} else {
							yield Model.PushService.forge({id: model.id}).destroy();
						}
					}));
					if (!idAlreadyExsit) {
						yield Model.PushService.forge({registrationId: req.body.registrationId, user_id: req.user.get('id'), provider: req.body.provider}).save();
					}
					res.send('');
				} catch (err) {
					console.error(err.message);
					res.send(err.message);
				}
				break;

			case "ReportBrowserError":
				console.log(req.body.message);
				res.send('');
				break;

			case "GetServerTime":
				res.json(new Date());
				break;

			default:
				console.log("method not found");
				res.send("method not found");
			}
		})
		.catch(function(err){
			console.error(err);
			res.send('');
		});
	}
}