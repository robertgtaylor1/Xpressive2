/// <reference path="xpressive.ts" />

// Interface
interface IChatSession {
    sendTopic(message: any): any;
    sendMessage(message, msgTimestamp): any;
    isGroupChat: bool;
    endChat(): void;
}

module Xmpp {

    // Class
    export class ChatSession implements IChatSession {

        private adHoc: bool;
        private connection: any;
        private chatstates() {
            return this.connection.chatstates;
        };

        private chatWith: any;
        private name: string;
        private resource: any;
        public isGroupChat: bool;
        private messages: any[];

        // Constructor
        constructor (chatWith: any, name: string, resource: any, conn: any, message?: any) {
            this.adHoc = false;
            this.connection = conn;
            this.chatstates = function () {
                return this.connection.chatstates;
            }
            this.chatWith = chatWith;
            this.name = name;
            this.resource = resource;
            this.isGroupChat = false;
            this.messages = [];
            if (message) {
                this.messages.push(new Xmpp.Message(message));
            };
        }

        sendTopic(message) {
            var fullMessage = message.tree();

            this.connection.send(fullMessage);
            this.connection.flush();

            return fullMessage;
        }

        sendMessage(message, timestamp) {

            var fullMessage = this.chatstates().addActive(message).tree();

            this.connection.send(fullMessage);
            this.connection.flush();
            if (this.isGroupChat === false) {
                this.messages.push(new Message(message, timestamp));
            }
            return fullMessage;
        }

        recvMessage(message, timestamp) {
            this.messages.push(new Message(message, timestamp));
            return message;
        }

        // called by endSession
        endChat() {
            if (this.isGroupChat) {
                this.connection.muc.leave(this.chatWith.jid);
            } else {
                this.chatstates().sendGone(this.chatWith.jid);
            }
        }
    }
}