/// <reference path="xmpp.roster.contact.ts" />
/// <reference path="xmpp.chatsession.ts" />
/// <reference path="xmpp.muc.room.ts" />
/// <reference path="xmpp.roster.ts" />


interface IChat {
    endSession(jid: string): void;
    chatTo(contact: IContact): IChatSession;
}

// Module
module Xmpp {

    export class Message {
        message: any;
        timestamp: Date;

        constructor(message: any, timestamp?: Date) {
            this.message = message;
            this.timestamp = timestamp || new Date();
        }
    }

    export class Chat {
        // these are all local variables
        _connection: any;
        _roster: IRoster;
        _muc: any;
        _chatSessions: IChatSession[];

        init(connection) {
            Strophe.debug("init chat plugin");

            this._connection = connection;
            this._chatSessions = [];
            this._roster = null;
            this._muc = [];
            this._connection.addHandler(this.incomingMessage.bind(this), null, "message");
        };

        // called when connection status is changed
        statusChanged(status) {
            if (status === Strophe.Status.CONNECTED) {
                this._roster = this._connection.roster;
                this._muc = this._connection.muc;
                this._chatSessions = [];
            }
        };

        chatTo(contact: IContact) {
            var chatSession: IChatSession = null;
            var resource: any = null;

            if (contact) {
                for (var res in contact.resources) {
                    resource = res;
                    break;
                }
                chatSession = new Xmpp.ChatSession(contact, contact.name, resource, this._connection);

                //_connection.addHandler(incomingMessage.bind(chatSession), null, "message", null, bareJid, {
                //	'matchBare' : true
                //});

                contact.chatSession = chatSession;

                Strophe.info("Start chat with: " + contact.name + "(" + contact.jid + ")");
                this._addChatSessionAndStartChatting(contact.jid, chatSession);
            }
            return chatSession;
        };

        joinRoomChat(room: IRoom) {
            var chatSession = new Xmpp.ChatSession(room, room.roomName, null, this._connection);

            chatSession.isGroupChat = true;
            Strophe.info("Start room chat: " + room.jid);
            this._addChatSessionAndStartChatting(room.jid, chatSession);

            return chatSession;
        };

        _addChatSessionAndStartChatting(jid, chatSession) {
            this._chatSessions[jid] = chatSession;
            $(document).trigger('start_chatting', chatSession);
        };

        sendNewTopic(jid, topic) {
            var message = $msg({
                to: jid,
                "type": "groupchat"
            }).c('subject').t(topic).up();

            // Find the ChatSession
            var chatSession = this._chatSessions[jid] || null;
            if (chatSession) {
                Strophe.info("Topic change sent to: " + jid);

                message = chatSession.sendTopic(message);
            }
        }

        sendNewMessage(jid, resource, body, groupChat) {
            var message = {};
            var chatSession: IChatSession;
            var fullJid = jid;

            if (groupChat) {
                message = $msg({
                    to: jid,
                    "type": "groupchat"
                }).c('body').t(body).up();
            } else {
                if (resource) {
                    fullJid = jid + '/' + resource;
                }
                message = $msg({
                    to: fullJid,
                    "type": "chat"
                }).c('body').t(body).up();
            }
            // Find the ChatSession
            chatSession = this._chatSessions[jid] || null;
            if (chatSession) {
                Strophe.info("New chat message sent to: " + jid);

                var msgTimestamp = new Date();
                message = chatSession.sendMessage(message, msgTimestamp);
                if (chatSession.isGroupChat === false) {
                    $(document).trigger('new_chat_message', {
                        'message': message,
                        'timestamp': msgTimestamp,
                        'fromMe': true
                    });
                }
            }
        }

        incomingMessage(message) {
            var msg: any = $(message);
            var from: string = msg.attr("from");
            var jid: string = Strophe.getBareJidFromJid(from);
            var chatSession = this._chatSessions[jid] || null;
            var type = msg.attr("type") || "normal";
            var contact: IContact;
            var contactName: string;
            var room: IRoom;
            var messageTime: Date;

            if (type === "normal") {
                var invite = msg.find("invite");
                if (invite.length > 0) {
                    // this is a room invite message
                    var roomJid = from;
                    var fromJid = invite.attr("from");
                    var password = msg.find("password");
                    room = this._muc.getOrAddRoom(roomJid);
                    contact = this._roster.findContact(Strophe.getBareJidFromJid(fromJid));

                    room.inviteReceived(fromJid,
                                        (contact ? contact.name : Strophe.getNodeFromJid(fromJid)),
                                        invite.text(),
                                        (password.length > 0 ? password.text() : null));
                } else {
                    var body = msg.find("body");
                    if (body.length > 0) {
                        // this is a one-off message
                        var subject = msg.find("subject");
                        var subjText;
                        if (subject) {
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
            } else if (type === "error") {
                var error = msg.find("error");
                var reason = error.children()[0].nodeName;
                // log and ignore
                Strophe.warn("Message type=error recv'd: code=" + error.attr("code") + ", reason=" + reason);
            } else {
                if (type === "groupchat") {
                    room = chatSession.chatWith;
                    if (room == null) {
                        return true;
                    }
                    messageTime = room.incomingMucMessage(message);
                } else if (type === "chat") {
                    if (chatSession) {
                        // incomming message from existing session
                        chatSession.recvMessage(msg);
                    } else {
                        // start new session with incomming message from contact
                        Strophe.info("Start chat requested by: " + Strophe.getBareJidFromJid(from));
                        // TODO Is this from a room
                        room = null;
                        //_connection.muc.isRoom(from);
                        if (room) {
                            contactName = Strophe.getResourceFromJid(from);
                            jid = from;
                            // create a contact but don't add to roster
                            contact = new Xmpp.Contact(null, jid);
                        } else {
                            jid = Strophe.getBareJidFromJid(from);
                            // Is this someone in my roster
                            contact = this._roster.findContact(jid);
                            if (contact) {
                                contactName = contact.name;
                            } else {
                                // create a contact but don't add to roster
                                contact = new Xmpp.Contact(null, jid);
                                var nick = msg.find("nick");
                                if (nick) {
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
                $(document).trigger('new_chat_message', {
                    'message': msg,
                    'fromMe': false,
                    'timestamp': messageTime,
                    'type': type
                });
            }
            return true;
        }

        sendOneOffMessage(to: string, subject: string, text: string) {
            var msg = $msg({
                "type": 'normal',
                "to": to
            });
            if (subject) {
                msg.c('subject').text(subject).up();
            }
            msg.c("body").t(text);
            this._connection.Send(msg.tree());
        }

        // called when user click the tab close icon
        endSession(jid: string) {
            var session = this._chatSessions[jid];
            session.endChat();
            delete this._chatSessions[jid];
        }
    }
}

Strophe.addConnectionPlugin('chat', (function() {
    var _chat = new Xmpp.Chat();

    return {
        init: (connection) => _chat.init(connection),
        statusChanged: (status) => _chat.statusChanged(status),
        chatTo: (contact) => _chat.chatTo(contact),
        joinRoomChat: (room) => _chat.joinRoomChat(room),
        sendNewMessage: (jid, resource, body, groupChat) => _chat.sendNewMessage(jid, resource, body, groupChat),
        sendNewTopic: (jid, topic) => _chat.sendNewTopic(jid, topic),
        incomingMessage: (message) => _chat.incomingMessage(message),
        endSession: (jid) => _chat.endSession(jid)
    }
} ()))