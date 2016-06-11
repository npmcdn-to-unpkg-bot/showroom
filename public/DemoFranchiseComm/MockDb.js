(function (root) {
	'use strict';

	function factory(angular) {
		return angular
			.module("MockDb", [])
			.service('ChainCloudDb', [function(){
				var _this = this;
				this.loginUserId = 5;
				this.user = [
					{id: 0, name: 'Kerem Sure', title: 'Manager in Waterloo', online: true, avatar: 'global/portraits/1.jpg'},
					{id: 1, name: 'Eric Hoffman', title: 'Manager in Kitchener', online: true, avatar: 'global/portraits/2.jpg'},
					{id: 2, name: 'Eddie Lobanovskiy', title: 'Manager in Cambridge', online: true, avatar: 'global/portraits/3.jpg'},
					{id: 3, name: 'Bill S Kenney', title: 'Manager in Hamilton', online: true, avatar: 'global/portraits/4.jpg'},
					{id: 4, name: 'Derek Bradley', title: 'Manager in Paris', online: true, avatar: 'global/portraits/5.jpg'},
					{id: 5, name: 'Mariusz Ciesla', title: 'Manager in Mississauga', online: true, avatar: 'global/portraits/6.jpg'},
					{id: 6, name: 'Jesse Dodds', title: 'Manager in Toronto', online: true, avatar: 'global/portraits/7.jpg'},
					{id: 7, name: 'Gerren Lamson', title: 'Manager in London', online: true, avatar: 'global/portraits/8.jpg'},
					{id: 8, name: 'Daniel Waldron', title: 'Manager in Elora', online: true, avatar: 'global/portraits/9.jpg'},
					{id: 9, name: 'Celikovic Jantzi', title: 'Manager in Milton', online: true, avatar: 'global/portraits/10.jpg'}
				];
				this.content = [
					{text: 'Everyone should look at this really cool advertisement idea from Audi! https://www.youtube.com/watch?v=350tD8E7htM', images: ['assets/images/post_image_1.jpg', 'assets/images/post_image_2.jpg', 'assets/images/post_image_3.jpg'], attachments: ['newadvertisement1.pdf', 'newadvertisement2.pdf']},
					{text: 'Wow, this is awesome!', images: [], attachments: []},
					{text: '@Jessica let\'s do something like this for our store too!', images: [], attachments: []},
					{text: 'Want everyone to read this material as it contains inportant updates regarding how to handle certain equipment in the store. Please let me know if you have any questions by commenting here or private messaging me. Thanks!', images: ['assets/images/post_image_4.jpg', 'assets/images/post_image_5.jpg'], attachments: ['newguidelines.pdf']},
					{text: 'It is very helpful. Thank you!', images: [], attachments: []}
				];
				this.post = [
					{id: 0, owner: 0, content: 0, likes: [5, 8], publishTime: ''},
					{id: 1, owner: 1, content: 3, likes: [2, 4, 8, 9], publishTime: ''}
				];
				this.comment = [
					{owner: 3, content: 1, post: 0, publishTime: ''},
					{owner: 5, content: 2, post: 0, publishTime: ''},
					{owner: 4, content: 4, post: 1, publishTime: ''}
				];
				this.message = [
					{from: 0, to: 0, content: 0},
					{from: 0, to: 0, content: 0},
					{from: 0, to: 0, content: 0},
					{from: 0, to: 0, content: 0},
					{from: 0, to: 0, content: 0},
					{from: 0, to: 0, content: 0},
					{from: 0, to: 0, content: 0}
				];
				this.activity = [
					{owner: 0, name: 'post', index: 0},
					{owner: 3, name: 'comment', index: 0},
					{owner: 5, name: 'comment', index: 1},
					{owner: 1, name: 'post', index: 1},
					{owner: 4, name: 'comment', index: 2}
				];

				this.addPost = function(userId, content){
					_this.content.push(angular.copy(content));
					_this.post.push({
						id: _this.post.length,
						owner: userId,
						content: _this.content.length - 1,
						likes: [],
						publishTime: '1 min ago'
					});
					_this.activity.push({owner: userId, name: 'post', index: _this.post.length - 1});
				};
				this.likePost = function(postIndex, user){
					_this.post[postIndex].likes.push(user);
					_this.activity.push({name: 'like', index: postIndex});
				};
				this.addComment = function(postIndex, userId, content){
					_this.content.push(angular.copy(content));
					_this.comment.push({
						owner: userId,
						content: _this.content.length - 1,
						post: postIndex,
						publishTime: '1 min ago'
					});
					_this.activity.push({owner: userId, name: 'comment', index: _this.comment.length - 1});
				};
				this.sendMessage = function(from, to, content){
					_this.content.push(angular.copy(content));
					_this.message.push({
						from: from,
						to: to,
						content: _this.content.length - 1
					});
				};
				this.fetchPost = function(option){
					var postList;
					switch(option.posttype){
						case 'publishedpost':
							postList = _.filter(_this.post, {owner: option.user});
							break;
						case 'likedpost':
							postList = _.filter(_this.post, function(post){return post.likes.indexOf(option.user) > -1;});
							break;
						case 'certainpost':
							postList = [_this.post[option.index]];
							break;
						default: // all post
							postList = _this.post;
					};
					postList = angular.copy(postList);
					return angular.copy(postList.map(function(post, postIndex){
						post.owner = _this.user[post.owner];
						post.content = _this.content[post.content];
						var tempComment = angular.copy(_.filter(_this.comment, {post: postIndex}));
						post.comments = tempComment.map(function(comment){
							comment.owner = _this.user[comment.owner];
							comment.content = _this.content[comment.content];
							return comment;
						});
						post.likes = post.likes.map(function(like){return _this.user[like];});
						return post;
					}));
				};
				this.fetchMessage = function(chatters){
					var tempMsg = angular.copy(_.filter(_this.message, function(msg){
						return ((chatters.indexOf(msg.from) > -1) && (chatters.indexOf(msg.to) > -1));
					}));
					return angular.copy(tempMsg.map(function(msg){
						msg.fromId = msg.from;
						msg.toId = msg.to;
						msg.from = _this.user[msg.fromId];
						msg.to = _this.user[msg.toId];
					}));
				};
				this.fetchActivity = function(user){
					var tempAct = angular.copy(_.filter(_this.activity, {owner: user})).map(function(activity){
						activity.owner = _this.user[activity.owner];
						switch(activity.name){
							case 'post':
								activity.post = _this.fetchPost({posttype: 'certainpost', index: activity.index});
								break;
							case 'comment':
								var tempComment = angular.copy(_this.comment[activity.index]);
								tempComment.content = _this.content[tempComment.content];
								activity.comment = tempComment;
								activity.post = _this.fetchPost({posttype: 'certainpost', index: tempComment.post});
								break;
							case 'like':
								activity.post = _this.fetchPost({posttype: 'certainpost', index: activity.index});
								break;
							default:
						};
						return activity;
					});
					return angular.copy(tempAct);
				};

				// add more data to database
				var randomUser = function(){
					var userNum = _this.user.length,
						result = Math.floor(Math.random() * userNum * 2);
					return (result < userNum)? result : _this.loginUserId;
				}

				var _post = angular.copy(_this.post);
				for (var i = 1; i < 8; i++){
					var postToAdd = Math.floor(Math.random() * _post.length);
					_this.addPost(randomUser(), _this.content[_post[postToAdd].content]);
					var lastPost = _this.post[_this.post.length - 1];
					_.filter(_this.comment, {post: postToAdd}).forEach(function(comment){
						var commentUser = randomUser();
						commentUser = (commentUser === lastPost.owner)? randomUser() : commentUser;
						_this.addComment(_this.post.length - 1, commentUser, _this.content[comment.content]);
					});
					var likeNum = Math.floor(Math.random() * _this.user.length);
					for (var j = 1; j < likeNum; j++){
						var likeUser = randomUser();
						if ((lastPost.likes.indexOf(likeUser) === -1) && (likeUser !== lastPost.owner)){
							lastPost.likes.push(likeUser);
							_this.likePost(_this.post.length - 1, likeUser);
						}
					}
				};
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
