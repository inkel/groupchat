require "date-utils"
io = require "socket.io"
redis = require("redis-client").createClient()

CONFIG =
  serverPort: 3000

express = require "express"
app = express.createServer()

app.configure ->
  app.set "views", __dirname + "/views"
  app.set "view engine", "jade"
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use app.router
  app.use express.static(__dirname + "/public")

app.configure "development", ->
  app.use express.errorHandler
    dumpExceptions: true
    showStack: true

app.configure "production", ->
  app.use express.errorHandler()

app.get "/", (req, res) ->
  res.render "index"

app.get "/channel/:channel", (req, res) ->
  vars =
    channel: req.params.channel
  res.render "channel", vars

app.post "/channel/:channel", (req, res) ->
  console.log "POST?"

app.listen CONFIG.serverPort

systemMessage = (message) ->
  data =
    time: new Date()
    who: "root"
    type: "system"
    message: message

socket = io.listen app
socket.on "connection", (client) ->
  @broadcastMembers = (channel) ->
    console.log "Send member list for #{channel}"
    self = this
    redis.smembers "channel:#{channel}:members", (err, members) ->
      if members
        list =
          type: "members"
          members: ('' + member for member in members)
        self.broadcast(list)

  client.on "message", (data) ->
    data = JSON.parse(data)
    self = this

    if data.type == "auth"
      redis.sismember "channel:#{data.channel}:members", data.who, (err, ismember) ->
        console.log err, ismember
        unless ismember
          client.who = data.who
          client.channel = data.channel
          redis.sadd "channel:#{data.channel}:members", data.who
          messages = [ systemMessage("Welcome to #{data.channel}") ]
          redis.lrange "channel:#{data.channel}:messages", -10, -1, (err, data) ->
            messages.push(JSON.parse(message)) for message in data if data unless err
            client.send JSON.stringify(messages)
          self.broadcast systemMessage("#{data.who} entered #{data.channel}")
        else
          client.send systemMessage("You have no permissions or are already member of this channel")
          return

    else if data.type == "message"
      redis.incr "messageId", (err, id) ->
        console.log err, id
        data.id = id
        data.time = new Date()
        redis.rpush "channel:#{data.channel}:messages", JSON.stringify(data)
        client.send data
        self.broadcast data

    socket.broadcastMembers client.channel

  client.on "disconnect", ->
    if client.who and client.channel
      console.log "%s diconnected from %s", client.who, client.channel
      redis.srem "channel:#{client.channel}:members", client.who
      socket.broadcastMembers client.channel

console.log "Listening http://0.0.0.0:%d", CONFIG.serverPort
