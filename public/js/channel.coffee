$ ->
  $('input[name=who]').val(prompt("Name"))

  renderMessage = (data) ->
    li = $('<li class="' + data.type + '"><div class="user"><time datetime="' + data.time + '">' + data.time + '</time> <strong>' + data.who + '</strong></div><p class="message">' + data.message + '</p></li>')
    li.attr("id", "message-#{data.id}") if data.id
    li.appendTo("#log ul")

  socket = new io.Socket("localhost")
  socket.on "connect", ->
    es = document.getElementById('send').elements

    socket.send JSON.stringify(
      type: "auth"
      who: es.who.value
      channel: es.channel.value
    )
  socket.on "message", (data) ->
    data = JSON.parse(data) if "string" == typeof data
    data = [data] unless data instanceof Array
    for message in data
      if "message" == message.type or "system" == message.type
        renderMessage message
      else if "members" == message.type
        $("#users").empty()
        $("#users").append("<li>#{member}</li>") for member in message.members

    $('#log time').timeago()

  socket.on "disconnect", ->
    console.log "disconnect", arguments, this

  socket.connect()

  $('form#send').submit (event) ->
    event.preventDefault()
    es = this.elements
    data =
      who: es.who.value
      message: es.message.value
      channel: es.channel.value
      type: "message"

    this.elements.message.value = ''

    socket.send JSON.stringify(data)
