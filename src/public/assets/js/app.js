"use strict";

// falcon models

var Message = Falcon.Model.extend({
    url: "messages",

    observables: {
        time: "",
        type: "chat",
        source: "",
        text: "",
        id: 0
    }
});

var Messages = Falcon.Collection.extend({
    model: Message
});

var Channel = Falcon.Model.extend({
    url: "channels",

    observables: {
        name: "",
        active: false,
        messages: function() { return new Messages(this) },
        id: 0
    }
});

var Channels = Falcon.Collection.extend({
    model: Channel
});

// falcon view

var ChatView = Falcon.View.extend({
    url: "#chat_tmpl",

    observables: {
        nickname: (function() {
            // this is a terrible idea, but since there's no prevention of users from having duplicate names,
            // we also don't care about collisions here
            return "Guest-" + Math.floor(1000 * Math.random());
        })(),
        // returns the currently-active channel
        active_channel: function() {
            var filtered = this.channels().filter(function (channel) {
                return channel.active();
            });
            if (filtered.length > 0) {
                return filtered[0];
            } else {
                // if none was active (as in, they just loaded, or the active channel was deleted)
                var newActive = this.channels().first();
                if (newActive != null) {
                    newActive.set("active", true);
                    return newActive;
                } else {
                    // dummy for the first call when the request hasn't come back yet and no channels exist
                    return new Channel({});
                }
            }
        },
        channels: function() { return new Channels() }
    },

    switchChannel: function(channel) {
        var oldActive = this.active_channel();
        // technically this means that for one momentary render, there'll be two active channels
        channel.set("active", true);
        oldActive.set("active", false);
    },

    // process a user-submitted message
    postMessage: function(form) {
        var text = form.message.value;
        form.reset();
        var message = {
            type: "chat",
            source: this.nickname(),
            text: text
        };
        // handle commands
        if (text.indexOf("/") === 0) {
            var pieces = text.slice(1).split(/\s+/);
            if (pieces[0] == "newchannel") {
                if (pieces.length > 1) {
                    this.createChannel(pieces[1]);
                } else {
                    this.appendError("Missing channel name");
                }
                return;
            } else if (pieces[0] == "removechannel") {
                if (this.active_channel() == this.channels().first()) {
                    this.appendError("Can't delete the lobby!");
                } else {
                    this.deleteChannel(this.active_channel());
                }
                return;
            } else if (pieces[0] == "me") {
                message.type = "meta";
                message.text = pieces.slice(1).join(" ");
            } else if (pieces[0] == "nick") {
                if (pieces.length > 1) {
                    this.changeNickname(pieces.slice(1).join(" "));
                } else {
                    this.appendError("Missing new name");
                }
                return;
            } else {
                this.appendError("Unrecognized command '" + pieces[0] +"'.");
                return;
            }
        }

        // send the message to the current channel
        this.sendMessage(new Message(message, this.active_channel()));
    },

    // change nickname - this is really a local-only thing, but it announces it to everyone else
    changeNickname: function(newNick) {
        if (newNick != "" && newNick != this.nickname()) {
            this.sendMessage(new Message({
                type: "meta",
                source: this.nickname(),
                text: "changed nickname to " + newNick
            }, this.active_channel()));
            this.nickname(newNick);
        }
    },

    // append a message to its channel, without creating it server-side
    appendMessage: function(message) {
        message.parent.messages().append(message);
    },

    // create and append a local-only error message to the current channel
    appendError: function(text) {
        this.appendMessage(new Message({
            time: "",
            source: "ERROR",
            type: "error",
            text: text
        }, this.channels().first()));
    },

    // tell the server to create a message
    sendMessage: function(message) {
        message.create();
        this.appendMessage(message);
    },

    createChannel: function(name) {
        var channel = new Channel({
            name: name
        });
        channel.create();
        this.channels().append(channel);
        this.switchChannel(channel);
    },

    deleteChannel: function(channel) {
        this.channels().destroy(channel);
        // TODO bug? - collection.destroy() might not be updating the model
        this.channels().remove(channel);
    },

    // utility to compile markdown in chat messages
    processed_text: function(message) {
        return message.type() == "chat" ? marked(message.text()) : message.text();
    },

    display: function() {
        $(document).ready(function() {
            // let the messages post when the user hits enter, unless they're holding shift
            $("textarea.quicksubmit").keypress(function(event) {
                if ((event.which == 13 || event.which == 10) && !event.shiftKey) {
                    event.preventDefault();
                    $(this).parents("form").submit();
                }
            });

            // poll for new messages and channel changes on a very very short interval
            setInterval(function() {
                // channel adds/removals
                mergeFetch(view.channels(), true);
                // check for new messages in each channel
                view.channels().each(function(channel) {
                    mergeFetch(channel.messages());
                });
            }, 1000);
        });
    },

    // scroll to the bottom of the message box
    scrollMessages: function() {
        var m = $("#messages");
        m.scrollTop(m.get(0).scrollHeight);
    }
});

var view = new ChatView;
// start out by looking for new channels right away
view.channels().fetch();

Falcon.apply(view, "#application");

/*
    Giant workaround for fetching without replacing original items. This could also be accomplished with
    a .fetch() on a new instance of the collection, then a .merge() into the existing one, but I wanted
    to add some custom functionality for only checking for _new_ messages, and also the ability to prune
    out deleted channels (without just replacing the whole list).
*/
var mergeFetch = function(collection, prune) {
    $.ajax({
        url: collection.makeUrl() + "?max=" + maxId(collection),
        dataType: "json",
        type: "GET",
        success: function(data) {
            if (data.length > 0) {
                if (prune) {
                    var serverIds = [];
                    data.forEach(function(item) {
                        serverIds.push(item.id);
                    });
                    var toRemove = [];
                    collection.each(function(item) {
                        if (item.id() && serverIds.indexOf(item.id()) == -1) {
                            toRemove.push(item);
                        }
                    });
                    collection.remove(toRemove);
                }
                collection.merge(data);
            }
        }
    });
};

// find the highest ID in a list of models, or 0 if the list is empty
var maxId = function(collection) {
    var highest = 0;
    collection.each(function (item) {
        if (item.id() > highest) {
            highest = item.id();
        }
    });
    return highest;
};

// escape HTML before markdown-ing posts
marked.setOptions({
    sanitize: true
});
