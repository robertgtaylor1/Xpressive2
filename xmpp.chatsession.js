var Xmpp;
(function (Xmpp) {
    var ChatSession = (function () {
        function ChatSession(chatWith, name, resource, conn, message) {
            this.adHoc = false;
            this.connection = conn;
            this.chatstates = function () {
                return this.connection.chatstates;
            };
            this.chatWith = chatWith;
            this.name = name;
            this.resource = resource;
            this.isGroupChat = false;
            this.messages = [];
            if(message) {
                this.messages.push(new Xmpp.Message(message));
            }
            ; ;
        }
        ChatSession.prototype.chatstates = function () {
            return this.connection.chatstates;
        };
        ChatSession.prototype.sendTopic = function (message) {
            var fullMessage = message.tree();
            this.connection.send(fullMessage);
            this.connection.flush();
            return fullMessage;
        };
        ChatSession.prototype.sendMessage = function (message, timestamp) {
            var fullMessage = this.chatstates().addActive(message).tree();
            this.connection.send(fullMessage);
            this.connection.flush();
            if(this.isGroupChat === false) {
                this.messages.push(new Xmpp.Message(message, timestamp));
            }
            return fullMessage;
        };
        ChatSession.prototype.recvMessage = function (message, timestamp) {
            this.messages.push(new Xmpp.Message(message, timestamp));
            return message;
        };
        ChatSession.prototype.endChat = function () {
            if(this.isGroupChat) {
                this.connection.muc.leave(this.chatWith.jid);
            } else {
                this.chatstates().sendGone(this.chatWith.jid);
            }
        };
        return ChatSession;
    })();
    Xmpp.ChatSession = ChatSession;    
})(Xmpp || (Xmpp = {}));
