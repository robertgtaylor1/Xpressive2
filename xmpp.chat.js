var Xmpp;
(function (Xmpp) {
    var Message = (function () {
        function Message(message, timestamp) {
            this.message = message;
            this.timestamp = timestamp || new Date();
        }
        return Message;
    })();
    Xmpp.Message = Message;    
    var Chat = (function () {
        function Chat() { }
        Chat.prototype.init = function (connection) {
            Strophe.debug("init chat plugin");
            this._connection = connection;
            this._chatSessions = [];
            this._roster = null;
            this._muc = [];
            this._connection.addHandler(this.incomingMessage.bind(this), null, "message");
        };
        Chat.prototype.statusChanged = function (status) {
            if(status === Strophe.Status.CONNECTED) {
                this._roster = this._connection.roster;
                this._muc = this._connection.muc;
                this._chatSessions = [];
            }
        };
        Chat.prototype.chatTo = function (contact) {
            var chatSession = null;
            var resource = null;
            if(contact) {
                for(var res in contact.resources) {
                    resource = res;
                    break;
                }
                chatSession = new Xmpp.ChatSession(contact, contact.name, resource, this._connection);
                contact.chatSession = chatSession;
                Strophe.info("Start chat with: " + contact.name + "(" + contact.jid + ")");
                this._addChatSessionAndStartChatting(contact.jid, chatSession);
            }
            return chatSession;
        };
        Chat.prototype.joinRoomChat = function (room) {
            var chatSession = new Xmpp.ChatSession(room, room.roomName, null, this._connection);
            chatSession.isGroupChat = true;
            Strophe.info("Start room chat: " + room.jid);
            this._addChatSessionAndStartChatting(room.jid, chatSession);
            return chatSession;
        };
        Chat.prototype._addChatSessionAndStartChatting = function (jid, chatSession) {
            this._chatSessions[jid] = chatSession;
            $(document).trigger('start_chatting', chatSession);
        };
        Chat.prototype.sendNewTopic = function (jid, topic) {
            var message = $msg({
                to: jid,
                "type": "groupchat"
            }).c('subject').t(topic).up();
            var chatSession = this._chatSessions[jid] || null;
            if(chatSession) {
                Strophe.info("Topic change sent to: " + jid);
                message = chatSession.sendTopic(message);
            }
        };
        Chat.prototype.sendNewMessage = function (jid, resource, body, groupChat) {
            var message = {
            };
            var chatSession;
            var fullJid = jid;
            if(groupChat) {
                message = $msg({
                    to: jid,
                    "type": "groupchat"
                }).c('body').t(body).up();
            } else {
                if(resource) {
                    fullJid = jid + '/' + resource;
                }
                message = $msg({
                    to: fullJid,
                    "type": "chat"
                }).c('body').t(body).up();
            }
            chatSession = this._chatSessions[jid] || null;
            if(chatSession) {
                Strophe.info("New chat message sent to: " + jid);
                var msgTimestamp = new Date();
                message = chatSession.sendMessage(message, msgTimestamp);
                if(chatSession.isGroupChat === false) {
                    $(document).trigger('new_chat_message', {
                        'message': message,
                        'timestamp': msgTimestamp,
                        'fromMe': true
                    });
                }
            }
        };
        Chat.prototype.incomingMessage = function (message) {
            var msg = $(message);
            var from = msg.attr("from");
            var jid = Strophe.getBareJidFromJid(from);
            var chatSession = this._chatSessions[jid] || null;
            var type = msg.attr("type") || "normal";
            var contact;
            var contactName;
            var room;
            var messageTime;
            if(type === "normal") {
                var invite = msg.find("invite");
                if(invite.length > 0) {
                    var roomJid = from;
                    var fromJid = invite.attr("from");
                    var password = msg.find("password");
                    room = this._muc.getOrAddRoom(roomJid);
                    contact = this._roster.findContact(Strophe.getBareJidFromJid(fromJid));
                    room.inviteReceived(fromJid, (contact ? contact.name : Strophe.getNodeFromJid(fromJid)), invite.text(), (password.length > 0 ? password.text() : null));
                } else {
                    var body = msg.find("body");
                    if(body.length > 0) {
                        var subject = msg.find("subject");
                        var subjText;
                        if(subject) {
                            subjText = subject.text();
                        }
                        var messageText = body.text();
                        $(document).trigger("urgent_message", {
                            "from": Strophe.getNodeFromJid(msg.attr("from")),
                            "jid": msg.attr("from"),
                            "subject": subjText,
                            "messageText": messageText,
                            "replyHandler": this.sendOneOffMessage.bind(this)
                        });
                    }
                }
            } else {
                if(type === "error") {
                    var error = msg.find("error");
                    var reason = error.children()[0].nodeName;
                    Strophe.warn("Message type=error recv'd: code=" + error.attr("code") + ", reason=" + reason);
                } else {
                    if(type === "groupchat") {
                        room = chatSession.chatWith;
                        if(room == null) {
                            return true;
                        }
                        messageTime = room.incomingMucMessage(message);
                    } else {
                        if(type === "chat") {
                            if(chatSession) {
                                chatSession.recvMessage(msg);
                            } else {
                                Strophe.info("Start chat requested by: " + Strophe.getBareJidFromJid(from));
                                room = null;
                                if(room) {
                                    contactName = Strophe.getResourceFromJid(from);
                                    jid = from;
                                    contact = new Xmpp.Contact(null, jid);
                                } else {
                                    jid = Strophe.getBareJidFromJid(from);
                                    contact = this._roster.findContact(jid);
                                    if(contact) {
                                        contactName = contact.name;
                                    } else {
                                        contact = new Xmpp.Contact(null, jid);
                                        var nick = msg.find("nick");
                                        if(nick) {
                                            contactName = $(nick).text();
                                        } else {
                                            contactName = Strophe.getNodeFromJid(from);
                                        }
                                        contact.name = contactName;
                                    }
                                }
                                chatSession = new Xmpp.ChatSession(contact, contactName, Strophe.getResourceFromJid(from), this._connection, msg);
                                this._addChatSessionAndStartChatting(jid, chatSession);
                            }
                        }
                    }
                    $(document).trigger('new_chat_message', {
                        'message': msg,
                        'fromMe': false,
                        'timestamp': messageTime,
                        'type': type
                    });
                }
            }
            return true;
        };
        Chat.prototype.sendOneOffMessage = function (to, subject, text) {
            var msg = $msg({
                "type": 'normal',
                "to": to
            });
            if(subject) {
                msg.c('subject').text(subject).up();
            }
            msg.c("body").t(text);
            this._connection.Send(msg.tree());
        };
        Chat.prototype.endSession = function (jid) {
            var session = this._chatSessions[jid];
            session.endChat();
            delete this._chatSessions[jid];
        };
        return Chat;
    })();
    Xmpp.Chat = Chat;    
})(Xmpp || (Xmpp = {}));
Strophe.addConnectionPlugin('chat', ((function () {
    var _chat = new Xmpp.Chat();
    return {
        init: function (connection) {
            return _chat.init(connection);
        },
        statusChanged: function (status) {
            return _chat.statusChanged(status);
        },
        chatTo: function (contact) {
            return _chat.chatTo(contact);
        },
        joinRoomChat: function (room) {
            return _chat.joinRoomChat(room);
        },
        sendNewMessage: function (jid, resource, body, groupChat) {
            return _chat.sendNewMessage(jid, resource, body, groupChat);
        },
        sendNewTopic: function (jid, topic) {
            return _chat.sendNewTopic(jid, topic);
        },
        incomingMessage: function (message) {
            return _chat.incomingMessage(message);
        },
        endSession: function (jid) {
            return _chat.endSession(jid);
        }
    };
})()));
