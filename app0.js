
/**
 * Module dependencies.
 */
var express = require('express')
  , params = require('express-params')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , sys = require('sys')
  , url = require('url')
  , qs = require('querystring')
  , io = require('socket.io')
  , ejs = require('ejs');


var app = express();
params.extend(app);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
 app.engine('html', ejs.renderFile);
 //app.set('view engine', 'html');
 app.set('view engine', 'ejs');
 app.set('view options', {layout:false});

  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var server = http.createServer(app);
io = require('socket.io').listen(server);

///chatting
var count = 0;
var roomArray = [];
var userArray = [];
var userinfoArray = [];
var nickArray = [];
var usersockArray = [];

function base64_decode (data) {
	  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	  var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
		    ac = 0,
		    dec = "",
		    tmp_arr = [];

	  if (!data) {
		    return data;
		  }

		  data += '';

		  do { // unpack four hexets into three octets using index points in b64
			    h1 = b64.indexOf(data.charAt(i++));
			    h2 = b64.indexOf(data.charAt(i++));
			    h3 = b64.indexOf(data.charAt(i++));
			    h4 = b64.indexOf(data.charAt(i++));

			    bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

			    o1 = bits >> 16 & 0xff;
			    o2 = bits >> 8 & 0xff;
			    o3 = bits & 0xff;

			    if (h3 == 64) {
				      tmp_arr[ac++] = String.fromCharCode(o1);
				    } else if (h4 == 64) {
					      tmp_arr[ac++] = String.fromCharCode(o1, o2);
					    } else {
						      tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
						    }
						  } while (i < data.length);

						  dec = tmp_arr.join('');

						  return dec;
}


function findInfoObjectByKey(arr, userid){
	for(var i=0; i < arr.length; i++){
		if(arr[i].userid == userid){
			return arr[i];
		}
	}
	//throw "Couldn't find object with key" + key;
}

function findInfoStringByRoom(arr, roomid){
	var strinfo = '';
	var c = 0;
	for(var i=0; i < arr.length; i++){
		if(arr[i].roomid==roomid){
			if(strinfo!=''){
				strinfo += ','
			}
			strinfo += arr[i].nick;
			c++;
		}
	}
	var strcount = '('+c.toString()+'명)';
	strinfo += strcount;
	return strinfo;
}

function removeItemInArray(arr, value){
	for(var i=0; i<arr.length; i++){
		if(arr[i]==value){
			arr.splice(i,1);
			return arr;
		}
	}

	return arr;
}

function removeUserInArray(arr, value){
	for(var i=0; i<arr.length; i++){
		if(arr[i].userid==value){
			arr.splice(i,1);
			return arr;
		}
	}

	return arr;
}

function leadingZeros(n, digits){
	var zero = '';
	n = n.toString();
	if(n.length < digits){
		for(i=0; i<digits -n.length; i++) zero += '0';
	}
	return zero + n;
}

function currentTime(){
	var date = new Date();
	return date.getHours()+":"+leadingZeros(date.getMinutes(), 2);
}

io.sockets.on('connection', function(socket){
	count++;

	io.sockets.socket(socket.id).emit('init', {sockid: socket.id});

	socket.on('join', function(data){

		//기존 동시 접속 회원 연결 해제.
		if(data.is_joined){
			var sockinfo = findInfoObjectByKey(usersockArray, data.userid);			
			io.sockets.socket(sockinfo.sockid).disconnect();

			usersockArray = removeUserInArray(usersockArray, data.userid);
		}
		

		var userinfo = findInfoObjectByKey(userinfoArray, data.userid);
		if(userinfo){
			var time = currentTime();
			var emitdata = {roomid: data.roomid, userid: data.userid, nick: userinfo.nick, photo: userinfo.photo, time: time, message: userinfo.nick+" 님이 입장하셨습니다.", msgtype: 0};

			nickArray.push({roomid: data.roomid, userid: data.userid, nick: userinfo.nick}); 
			usersockArray.push({userid: data.userid, sockid: socket.id});

			var roominfo = findInfoStringByRoom(nickArray, data.roomid);
			var roomdata = {roominfo: roominfo};

			socket.set('room', {roomid: data.roomid, userid: data.userid});
			socket.join(data.roomid);

			io.sockets.in(data.roomid).emit('roominfo', roomdata);
			io.sockets.in(data.roomid).emit('message', emitdata);
		}
	});

	socket.on('keypress', function(data){
		socket.get('room', function(error, room){
			var userinfo = findInfoObjectByKey(userinfoArray, data.userid);
			if(userinfo){
				var emitdata;
				if(data.ispress){
					emitdata = {message: userinfo.nick+"님이 작성중"};
				}else{
					emitdata = {message: ""};
				}
				io.sockets.in(room.roomid).emit('keypress',emitdata);
			}
		});
	});

	socket.on('message', function(data){
		socket.get('room', function(error, room){
			var userinfo = findInfoObjectByKey(userinfoArray, data.userid);
			if(userinfo){
				var time = currentTime();
				var emitdata = {roomid: room.roomid, userid: data.userid, nick: userinfo.nick, photo: userinfo.photo, time: time, message: data.message, msgtype: 1};
				io.sockets.in(room.roomid).emit('message', emitdata);
			}
		});
	});

	function disconnectRoom(room){
		if(room != null){
				var userinfo = findInfoObjectByKey(userinfoArray, room.userid);
				var time = currentTime();
				var roomdata = {roomid: room.roomid, userid: room.userid, nick: userinfo.nick, photo: userinfo.photo, time: time, message: userinfo.nick+" 님이 퇴장하셨습니다.", msgtype: 0};

				io.sockets.in(room.roomid).emit('message', roomdata);

				////removeItem 
				userArray = removeItemInArray(userArray, room.userid);
				nickArray = removeUserInArray(nickArray, room.userid);
				userinfoArray = removeUserInArray(userinfoArray, room.userid);
				usersockArray = removeUserInArray(usersockArray, room.userid);

				//modify roominfo
				var roominfo = findInfoStringByRoom(nickArray, room.roomid);
				var roomdata = {roominfo: roominfo};
				io.sockets.in(room.roomid).emit('roominfo', roomdata);

				//store to DB
				var post_data = qs.stringify({
					'userkey': room.userid,
					'roomkey': room.roomid
				});

				var options = {
					host: 'dev.podgate.com',
					path: '/apis/chat/?ac=exit',
					method: "POST",
					headers: {
						'Content-Type':'application/x-www-form-urlencoded',
						'Content-Length':post_data.length
					}
				};

				var post_req = http.request(options, function(res){
						var infos = '';
						res.on('data', function(data){
							infos += data.toString();
						});	
					}).on('error', function(e){
						console.log('ERROR: ' + e.message);
					});

				post_req.write(post_data);
				post_req.end();

			}
	}

	socket.on('disconnect', function(){
		count--;

		socket.get('room', function(error, room){
			disconnectRoom(room);
		});
	});
});

app.param('roomid', /^\d+$/);
app.param('userid', /^\d+$/);
app.get('/chat/:roomid', function(req,res){
	var roomid = req.params.roomid;
	
	var cookies = req.cookies;
	if(cookies.hasOwnProperty('PODGATE_D1') == false){
		res.redirect('http://podgate.com/m');
		return;
	}

	var struserinfo = base64_decode(cookies.PODGATE_D1);
	var slashidx = struserinfo.indexOf('&');
/////cookie key:12345,etc...
	var userid = struserinfo.slice(4,slashidx);

/*
	//test
	var request = require('request');
	var j = request.jar();
	var cookie = req.cookies;
	j.add(cookie);
	request = request.defaults({jar: j});
	//console.log("jar:"+ JSON.stringify(j));

	request('http://dev.podgate.com/apis/chat/?ac=getlogininfo&userkey='+userid, function(error, response, body){
		console.log("header:"+JSON.stringify(response.headers));
		console.log("body:"+body)
	});
*/

	if(roomArray.indexOf(roomid) == -1){
		roomArray.push(roomid);
	}

	var is_joined = false;
	if(userArray.indexOf(userid)==-1){
		userArray.push(userid);
	}else{
		is_joined = true;
	}

	var post_data = qs.stringify({
		'userkey': userid,
		'roomkey': roomid
	});

	var options = {
		host: 'dev.podgate.com',
		path: '/apis/chat/?ac=getlogininfo',
		method: "POST",
		headers: {
			'Content-Type':'application/x-www-form-urlencoded',
			'Content-Length':post_data.length
		}
	};

	var is_user = false;
	var userinfos = [];
	var post_req = http.request(options, function(res){
		console.log('STATUS: '+ res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		
		var infos = '';
		res.on('data', function(data){
			infos += data.toString();
			console.log('INFOS: '+ infos);	
		});

		res.on('end', function(){
			var obj = JSON.parse(infos);
			console.log('ENDINFOS: '+obj.iskey);
			is_user = obj.iskey;
			if(is_user){
				userinfos = {userid: obj.key, nick: obj.nick, photo: obj.photo};
				userinfoArray.push(userinfos);
			}
		});
	}).on('error', function(e){
		console.log('ERROR: ' + e.message);
	});

	post_req.write(post_data);
	post_req.end();

	res.render('chat2', {roomid: roomid, userid: userid, is_joined: is_joined});
});

app.get('/', routes.index);
	
	server.listen(3000);
	console.log("Express server listening on port 3000");
