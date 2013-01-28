
/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , io = require('socket.io')
  , ejs = require('ejs');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.engine('html', ejs.renderFile);
  app.set('view engine', 'ejs');
  app.set('view options', {layout: false});

  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  return app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  return app.use(express.errorHandler());
});

var server = http.createServer(app);
io = require('socket.io').listen(server);

function findInfoObjectByKey(arr, userid){
	for(var i=0; i < arr.length; i++){
		if(arr[i].userid == userid){
			return arr[i];
		}
	}
}

function findInfoStringByRoom(arr, roomid){
	var strinfo = '';
	for(var i=0; i<arr.length; i++){
		if(arr[i].roomid==roomid){
			strinfo += "<span style=\"color: #FFF; background: #"+arr[i].userhex+"\">"+arr[i].userid+"</span> ";
		}
	}	
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
		if(arr[i].sockid==value){
			arr.splice(i,1);
			return arr;
		}
	}

	return arr;
}

function pushInRoom(roomArray, sockid){
	for(var i=0; i< roomArray.length; i++){	
		if(roomArray[i].length<4){
			roomArray[i].push(sockid);
			return i+1;
		}
	}

	roomArray.push(new Array());
	var roomidx = roomArray.length-1;
	roomArray[roomidx].push(sockid);
	return roomidx+1;
}

function removeInRoom(roomArray, sockid){
	for(var i=0; i<roomArray.length; i++){
		var sockidx = roomArray[i].indexOf(sockid);
		if(sockidx!=-1){
			roomArray[i].splice(sockidx,1);
			return roomArray;
		}
	}
	return roomArray;
}

var count = 0;
var roomArray = [];
var userinfoArray = [];

io.sockets.on('connection', function(socket){
	count++;

	socket.on('init', function(){
		var roomid = pushInRoom(roomArray, socket.id);	
	//	console.log("room:"+roomArray.join(',') + "/"+roomArray.length);
		io.sockets.socket(socket.id).emit('init', {sockid: socket.id, roomid: roomid});	
	});

	socket.on('join', function (data){
			
		//var userinfo = findInfoObjectByKey(userinfoArray, data.userid);
			userinfoArray.push({userid: data.userid, roomid: data.roomid, sockid: socket.id, userhex: data.userhex});	
			socket.set('room', {roomid: data.roomid, userid: data.userid});
			socket.join(data.roomid);
			
			var emitdata = findInfoStringByRoom(userinfoArray, data.roomid);
			io.sockets.in(data.roomid).emit('join', emitdata);
	});

	socket.on('pushtone', function(data){
		socket.get('room', function(error, room){
			console.log("roomid:"+room.roomid)
			io.sockets.in(room.roomid).emit('pushtone', {circle: data});
		});
	});

	socket.on('disconnect', function(){	
		count--;

		removeInRoom(roomArray, socket.id);

		socket.get('room', function(error, room){
			if(room!=null){
				//var userinfo = findInfoObjectByKey(userinfoArray, room.userid);
				userinfoArray = removeUserInArray(userinfoArray, socket.id);

				var emitdata = findInfoStringByRoom(userinfoArray, room.roomid);
				io.sockets.in(room.roomid).emit('disconnect', emitdata);
	
			}	
		});	
	});	
});


app.get('/', function(req,res){
	res.redirect('http://bpsound.com/apps/bpharmony');
	//res.sendfile(__dirname + "/views/index.html");
});

	server.listen(3000);	  
 	console.log("Express server listening on port 3000");

process.on('uncaughtException', function(err){
	console.log('Caught Exception: ' + err);
});
