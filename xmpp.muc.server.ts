/// <reference path="xmpp.muc.room.ts" />
/// <reference path="xpressive.ts" />

interface IServer {
    getInfo(): void;
    rooms: IRoom[];
    serverJid: string;
    removeFromList(roomJid: string): void;
    incomingMucMessage(stanza: any): void;
    isRoom(jid: string): bool;
    getRoom(jid: string): IRoom;
    destroyRoom(jid: string, reason?: string, altRoomJid?: string, altRoomPassword?: string): void;
}

// Module
module Xmpp {

    // Class
    export class Server implements IServer {

        public serverJid: string;
        public rooms: IRoom[];

        private connection: any;
        private serverInfoResponse: any[];
        private serverItemsResponse: any[];

        // Constructor
        constructor(jid, conn) {
            this.serverJid = Strophe.getDomainFromJid(jid);
            this.connection = conn;
            this.serverInfoResponse = [];
            this.serverItemsResponse = [];
            this.rooms = [];
            Strophe.info("Server: new server created: " + this.serverJid);
        }

        // This gets the MUC info
        getInfo() {
            Strophe.info("Server: get info for: " + this.serverJid);

            var serverInfoIq = $iq({
                to: this.serverJid,
                type: "get"
            }).c("query", {
                xmlns: Strophe.NS.DISCO_INFO
            });
            this.connection.sendIQ(serverInfoIq, this.serverInfo.bind(this), this.serverInfoError.bind(this));
        }

        removeFromList(roomJid: string) {
            delete this.rooms[roomJid];
            // update the UI room list
            $(document).trigger('remove_room_from_list', roomJid);
        }

        serverInfo(iq) {
            Strophe.info("Server: got info for: " + this.serverJid);

            this.serverInfoResponse = iq;

            // disco#items
            var serverItemsIq = $iq({
                to: this.serverJid,
                type: "get"
            }).c("query", {
                xmlns: Strophe.NS.DISCO_ITEMS
            });
            Strophe.info("Server: get items for: " + this.serverJid);
            this.connection.sendIQ(serverItemsIq, this.serverItems.bind(this), this.serverItemsError.bind(this));
        }

        serverInfoError(iq) {
            Strophe.error("ERROR: get server info for: " + this.serverJid);

            var errorIq = $(iq);
        }

        serverItems(iq) {
            Strophe.info("Server: got items for: " + this.serverJid);

            var room: IRoom;
            this.serverItemsResponse = iq;
            //this.connection.pause();
            $(iq).find('item').each((index, item) => {
                room = new Room($(item).attr('jid'), $(item).attr('name'), this.connection)
                room.getInfo();
                this.rooms[room.jid] = room;
            });
            //this.connection.resume();

            // notify user code of room changes
            $(document).trigger("rooms_changed", this);
        }

        serverItemsError(iq) {
            Strophe.error("Server ERROR: get server items for: " + this.serverJid);

            var errorIq = $(iq);
        }

        incomingMucMessage(stanza) {
            var message = $(stanza);
            var from = message.attr('from');
            var server = Strophe.getBareJidFromJid(from);
            var room = this.rooms[from];
            if (!room) {
                return false;
            }
            room.incomingMucMessage(stanza);
        }

        isRoom(jid: string) {
            var room = this.getRoom(jid)
            if (room) {
                return true;
            }
            return false;
        }

        getRoom(jid: string) {
            var roomJid = Strophe.getBareJidFromJid(jid);
            var room = this.rooms[roomJid];
            return room;
        }

        destroyRoom(jid: string, reason?: string, altRoomJid?: string, altRoomPassword?: string) {
            var roomJid = Strophe.getBareJidFromJid(jid);
            // Build Destroy Iq
            var destroyIq = $iq({
                "to": roomJid,
                "type": "set"
            }).c('query', {
                "xmlns": Strophe.NS.MUC_OWNER
            });

            if (altRoomJid) {
                destroyIq.c('destroy', { "jid": altRoomJid })
            } else {
                destroyIq.c('destroy')
            }
            if (altRoomPassword) {
                destroyIq.c('password').t(altRoomPassword).up();
            }
            if (reason) {
                destroyIq.c('reason').t(reason);
            }

            this.connection.sendIQ(destroyIq.tree(), this._roomDestroyed.bind(this));
        }

        _roomDestroyed(iq) {
            var roomJid = $(iq).attr('from');
            this.removeFromList(roomJid);
        }
    }
}
