// vendor libraries
var express = require('express'),
	morgan = require('morgan'),
	app = express(),
	http = require('http').Server(app);

app.set('port', process.env.PORT || 3000);

app.use(morgan('dev'));
app.use(express.static('public'));

var server = http.listen(app.get('port'), function(err) {
   if(err) throw err;

   var message = 'Server is running @ http://localhost:' + server.address().port;
   console.log(message);
});