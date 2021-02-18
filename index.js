let express = require('express')
let bodyParser = require('body-parser')
let app = express()
let sqlite3 = require('sqlite3')
let db = new sqlite3.Database('chatdb.sqlite');
let auth = require('basic-auth');


function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

authenticate = function (req, res, done) {
	let credentials = auth(req);
    if (credentials) {
		let query = "select * from user where username = '" + credentials.name + "' and password = '" + credentials.pass + "'";
		db.all(query, function (err, rows) {
			if (rows.length === 0) {
				res.status(401);
				res.send('Unauthorized');
				return;
			}
			req.userGUID = rows[0].uid;
            done();
        });
    }
    else {
            res.status(401);
            res.send('Unauthorized');
    }
}

getChannels = function (req, res) {
    authenticate(req, res, function () {
        let query = "select * from channel";
        let result = [];
        db.each(query, function (err, row) {
            result.push({ "cid": row.cid, "name": row.name });
        }, function () {
            res.send(JSON.stringify(result));
        });
    })
}

getChannelMessages = function (req, res) {
    authenticate(req, res, function () {
        let n = req.url.lastIndexOf('/');
        let channelGUID = req.url.substring(n + 1);
        let query = "select * from message where channel_guid = '" + channelGUID + "'";
        let result = [];
        db.each(query, function (err, row) {
        	console.log(row);
            result.push({ "guid": row.guid, "channel_guid": row.channel_guid, "user_guid": row.username, "content": row.content });
        }, function () {
            res.send(JSON.stringify(result));
        });
    });
}

publishMessage = function (req, res) {
    authenticate(req, res, function () {
		let n = req.url.lastIndexOf('/');
		let channelGUID = req.url.substring(n + 1);
		let username = req.body.username;
        let content = req.body.content;
        db.run("INSERT into message(guid,channel_guid,username, content) VALUES ('" + guid() + "','" + channelGUID + "','" + username +  "','" + content +"')");
        // return back all messages for channel in response
        let query = "select * from message where channel_guid = '" + channelGUID + "'";
        let result = [];
        db.each(query, function (err, row) {
            result.push({ "guid": row.guid, "channel_guid": row.channel_guid, "user_guid": row.username, "content": row.content });
        }, function () {
            res.send(JSON.stringify(result));
        });
    });
}

userRegister = function (req, res) {
	db.run("INSERT into user(uid, username, password) VALUES ('" + req.body[2] + "', '" + req.body[0] + "', '" + req.body[1] + "')")
	res.send('Success');
}

userInfo = function (req, res) {
	authenticate(req, res, function () {
		let n = req.url.lastIndexOf('/');
		let username = req.url.substring(n + 1);
		let query = "select * from user where username = '" + username + "'";
		let result = [];
		db.each(query, function (err, row) {
			result.push({ "uid": row.uid, "username": row.username });
		}, function () {
			res.send(JSON.stringify(result));
		});
	})
}

app.use(bodyParser.json())
app.use('/images', express.static('images'))

app.get('/chatserver/login', getChannels);
app.get('/chatserver/channels', getChannels);
app.get('/chatserver/messages/*', getChannelMessages);
app.post('/chatserver/publish/*', publishMessage);
app.post('/chatserver/register/', userRegister);
app.post('/chatserver/userinfo/*', userInfo);

app.listen(3000, function () {
    console.log('Chat server listening on port 3000!')
})
