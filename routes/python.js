/*************************************************************
* 
**************************************************************/
var bcrypt = require('bcrypt-nodejs'),
	//Model = require('../model'),
	passport = require('passport'),
	co = require('co'),
	_ = require('lodash'),
	https = require('https'),
	gcm = require('node-gcm'),
	fetch = require('node-fetch');
	
exports = module.exports = function (eventEmitter, io) {

	var TransferItem = co.wrap(function *(from, to, item, quantity){ // yield any promise
	});

/*************************************************************
* middleware starts here
**************************************************************/
	return function(req, res, next) {
		co(function *(){
			res.set('Content-Type', 'application/json');
			try {
				var pythonServer = "https://gongfan99.pythonanywhere.com/";
				/* var pythonServer = "http://localhost:4000/"; */
				var pythonResponse = yield fetch(pythonServer + req.params.method, {  
					method: 'post',  
					headers: {  
						"Content-type": "application/json; charset=UTF-8"  
					},  
					body: req.body
				}).then(function(res) {
					return res.text();
				});
				res.send(pythonResponse);
			} catch(e) {
				res.send("");
			}
		})
		.catch(function(err){
			console.error(err);
			res.send('');
		});
	}
}