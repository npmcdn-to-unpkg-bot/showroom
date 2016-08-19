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

var pythonServer = "http://localhost:4000/";
co(function *(){
	try {
		var tryResponse = yield fetch(pythonServer, {method: 'get'})
				.then(function(res) {
					if (!res.ok) {
						pythonServer = "https://synmatrix.pythonanywhere.com/";
						console.log("python.js: Local python server not available. Use " + pythonServer + " instead.");
					} else {
						console.log("python.js: Connected to local python server" + pythonServer);
					}
					return res.ok;
				});
	} catch(e) {
		pythonServer = "https://synmatrix.pythonanywhere.com/";
		console.log("python.js: Local python server not available. Use " + pythonServer + " instead.");
	}
})
.catch(function(err){
	console.error(err);
});

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
				/* var pythonServer = "https://synmatrix.pythonanywhere.com/"; */
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