var knex = require('knex')({
	client: 'mysql',
  pool: {
    min: 2,
    max: 10, // not to be higher than MYSQL max_connections
    ping: function (conn, cb) { conn.query('SELECT 1', cb); }
	}, // reason for the ping: https://gist.github.com/acgourley/9a11ffedd44c414fb4b8
	connection: {
		host: process.env.AMAZON_RDS_HOST,
		user: process.env.AMAZON_RDS_USER_NAME,
		password: process.env.AMAZON_RDS_PASSWORD,
		database: 'keymanage',
		charset  : 'utf8',
		dateStrings: true
	},
	debug: true
});

var bookshelf = require('bookshelf')(knex);

var User = bookshelf.Model.extend({
	tableName: 'users',
	hasTimestamps: true,
	own: function () {
		return this.hasMany(Item);
	},
	hold: function () {
		return this.belongsToMany(Item).withPivot(['quantity']);
	},
	pushservice: function () {
		return this.hasMany(PushService);
	},
	sockets: function () {
		return this.hasMany(Socket);
	},
	messages: function () {
		return this.hasMany(Message);
	}
});

var Item = bookshelf.Model.extend({
	tableName: 'items',
	hasTimestamps: true,
	owner: function () {
		 return this.belongsTo(User);
	},
	holders: function () {
		 return this.belongsToMany(User).withPivot(['quantity']);
	}
});

var Transaction = bookshelf.Model.extend({
	tableName: 'transactions',
	hasTimestamps: true,
	from: function () {
		 return this.belongsTo(User, 'from_id');
	},
	to: function () {
		 return this.belongsTo(User, 'to_id');
	},
	item: function () {
		 return this.belongsTo(Item);
	}
});

var PushService = bookshelf.Model.extend({
	tableName: 'pushservice',
	user: function () {
		 return this.belongsTo(User);
	}
});

var Socket = bookshelf.Model.extend({
	tableName: 'sockets',
	user: function () {
		 return this.belongsTo(User);
	}
});

var Message = bookshelf.Model.extend({
	tableName: 'messages',
	hasTimestamps: true,
	user: function () {
		 return this.belongsTo(User);
	}
});

module.exports = {
	knex: knex,
  User: User,
	Item: Item,
	Transaction: Transaction,
	PushService: PushService,
	Socket: Socket,
	Message: Message
};