(function() {
  $(function() {
    var renderMessage, socket;
    $('input[name=who]').val(prompt("Name"));
    renderMessage = function(data) {
      var li;
      li = $('<li class="' + data.type + '"><div class="user"><time datetime="' + data.time + '">' + data.time + '</time> <strong>' + data.who + '</strong></div><p class="message">' + data.message + '</p></li>');
      if (data.id) {
        li.attr("id", "message-" + data.id);
      }
      return li.appendTo("#log ul");
    };
    socket = new io.Socket("localhost");
    socket.on("connect", function() {
      var es;
      es = document.getElementById('send').elements;
      return socket.send(JSON.stringify({
        type: "auth",
        who: es.who.value,
        channel: es.channel.value
      }));
    });
    socket.on("message", function(data) {
      var member, message, _i, _j, _len, _len2, _ref;
      if ("string" === typeof data) {
        data = JSON.parse(data);
      }
      if (!(data instanceof Array)) {
        data = [data];
      }
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        message = data[_i];
        if ("message" === message.type || "system" === message.type) {
          renderMessage(message);
        } else if ("members" === message.type) {
          $("#users").empty();
          _ref = message.members;
          for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
            member = _ref[_j];
            $("#users").append("<li>" + member + "</li>");
          }
        }
      }
      return $('#log time').timeago();
    });
    socket.on("disconnect", function() {
      return console.log("disconnect", arguments, this);
    });
    socket.connect();
    return $('form#send').submit(function(event) {
      var data, es;
      event.preventDefault();
      es = this.elements;
      data = {
        who: es.who.value,
        message: es.message.value,
        channel: es.channel.value,
        type: "message"
      };
      this.elements.message.value = '';
      return socket.send(JSON.stringify(data));
    });
  });
}).call(this);
