/// <reference path="xmpp.muc.server.ts" />
/// <reference path="xpressive.ts" />

interface IServers {
    refresh(jid: string): void;
    addServerAndGetInfo(jid: string): void;
    addServer(jid: string): IServer;
    removeServer(jid: string): void;
    incomingMucMessage(stanza: any): bool;
    isRoom(jid: string): bool;
    getServer(jid: string): IServer;
    getMyServer(): IServer;
    getRoom(jid: string): IRoom;
    destroyRoom(jid: string, reason?: string, altRoomJid?: string, altRoomPassword?: string): void;
    getOrAddRoom(jid: string): IRoom;
    updatePresence(pres: any): IOccupant;
}

// Module
module Xmpp {

    // Class
    export class Servers implements IServers {

        private conn: any;
        private servers: IServer[];

        constructor (connection) {
            this.conn = connection;
            this.servers = [];
        }

        refresh(jid) {
            if (jid) {
                this.getServer(jid).getInfo();
            } else {
                for (var serverJid in this.servers) {
                    this.servers[serverJid].getInfo();
                }
            }
        }

        addServerAndGetInfo(jid: string): void {
            this.addServer(jid).getInfo();
        }

        addServer(jid: string): IServer {
            var serverJid = Strophe.getDomainFromJid(jid);
            this.servers[serverJid] = new Server(serverJid, this.conn);
            return this.servers[serverJid];
        }

        removeServer(jid: string) {
            var serverJid = Strophe.getDomainFromJid(jid);

            delete this.servers[serverJid];
        }

        incomingMucMessage(stanza: any): bool {
            var from, server, serverJid
            var message = $(stanza);
            var type = message.attr('type');
            if (type === 'groupchat') {

                from = message.attr('from');
                serverJid = Strophe.getDomainFromJid(from);
                server = this.servers[serverJid];
                if (server) {
                    return server.incomingMucMessage(stanza);
                }
            }
            return false;
        }

        isRoom(jid: string): bool {
            var server = this.getServer(jid);
            if (server) {
                return server.isRoom(jid);
            }
            return false;
        }

        getServer(jid) {
            var serverJid = Strophe.getDomainFromJid(jid);
            var server = this.servers[serverJid];
            return server;
        }

        getMyServer(): IServer {
            // this will get the first server in the object
            // TODO: really need to be better at this as there may be multiple servers
            //       and this needs to be 'my' server
            return this.servers[Object.keys(this.servers)[0]];
        }

        getRoom(jid: string): IRoom {
            var room = null;
            var server = this.getServer(jid);
            if (server) {
                room = server.getRoom(jid);
            }
            return room;
        }

        destroyRoom(jid: string, reason?: string , altRoomJid?: string , altRoomPassword?: string ) {
            var room = null;
            var server = this.getServer(jid);
            if (server) {
                server.destroyRoom(jid, reason, altRoomJid, altRoomPassword);
            }
        }

        updatePresence(pres) {
            var jid = $(pres).attr('from');
            var presType = $(pres).attr('type');

            var room = this.getRoom(jid);
            var occupant: IOccupant;
            if (room) {
                if (presType === "unavailable") {
                    room.removeOccupant(jid);
                } else {
                    occupant = room.updateOccupant(pres);
                }
            }
            return occupant;
        }

        getOrAddRoom(jid) {
            var server : IServer;
            var roomJid = Strophe.getBareJidFromJid(jid);
            var room = this.getRoom(roomJid);
            if (!room) {
                server = this.getServer(roomJid);
                if (!server) {
                    server = this.addServer(roomJid);
                }
                room = new Room(roomJid, null, this.conn);
                room.getInfo();
                server.rooms[room.jid] = room;
            }
            return room;
        }
    }
}