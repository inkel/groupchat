(function() {
  var CONFIG, app, express, io, redis, socket, systemMessage;
  require("date-utils");
  io = require("socket.io");
  redis = require("redis-client").createClient();
  CONFIG = {
    serverPort: 3000
  };
  express = require("express");
  app = express.createServer();
  app.configure(function() {
    app.set("views", __dirname + "/views");
    app.set("view engine", "jade");
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    return app.use(express.static(__dirname + "/public"));
  });
  app.configure("development", function() {
    return app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
  });
  app.configure("production", function() {
    return app.use(express.errorHandler());
  });
  app.get("/", function(req, res) {
    return res.render("index");
  });
  app.get("/channel/:channel", function(req, res) {
    var vars;
    vars = {
      channel: req.params.channel
    };
    return res.render("channel", vars);
  });
  app.post("/channel/:channel", function(req, res) {
    return console.log("POST?");
  });
  app.listen(CONFIG.serverPort);
  systemMessage = function(message) {
    var data;
    return data = {
      time: new Date(),
      who: "root",
      type: "system",
      message: message
    };
  };
  socket = io.listen(app);
  socket.on("connection", function(client) {
    this.broadcastMembers = function(channel) {
      var self;
      console.log("Send member list for " + channel);
      self = this;
      return redis.smembers("channel:" + channel + ":members", function(err, members) {
        var list, member;
        if (members) {
          list = {
            type: "members",
            members: (function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = members.length; _i < _len; _i++) {
                member = members[_i];
                _results.push('' + member);
              }
              return _results;
            })()
          };
          return self.broadcast(list);
        }
      });
    };
    client.on("message", function(data) {
      var self;
      data = JSON.parse(data);
      self = this;
      if (data.type === "auth") {
        redis.sismember("channel:" + data.channel + ":members", data.who, function(err, ismember) {
          var messages;
          console.log(err, ismember);
          if (!ismember) {
            client.who = data.who;
            client.channel = data.channel;
            redis.sadd("channel:" + data.channel + ":members", data.who);
            messages = [systemMessage("Welcome to " + data.channel)];
            redis.lrange("channel:" + data.channel + ":messages", -10, -1, function(err, data) {
              var message, _i, _len;
              if (!err ? data : void 0) {
                for (_i = 0, _len = data.length; _i < _len; _i++) {
                  message = data[_i];
                  messages.push(JSON.parse(message));
                }
              }
              return client.send(JSON.stringify(messages));
            });
            return self.broadcast(systemMessage("" + data.who + " entered " + data.channel));
          } else {
            client.send(systemMessage("You have no permissions or are already member of this channel"));
          }
        });
      } else if (data.type === "message") {
        redis.incr("messageId", function(err, id) {
          console.log(err, id);
          data.id = id;
          data.time = new Date();
          redis.rpush("channel:" + data.channel + ":messages", JSON.stringify(data));
          client.send(data);
          return self.broadcast(data);
        });
      }
      return socket.broadcastMembers(client.channel);
    });
    return client.on("disconnect", function() {
      if (client.who && client.channel) {
        console.log("%s diconnected from %s", client.who, client.channel);
        redis.srem("channel:" + client.channel + ":members", client.who);
        return socket.broadcastMembers(client.channel);
      }
    });
  });
  console.log("Listening http://0.0.0.0:%d", CONFIG.serverPort);
}).call(this);
