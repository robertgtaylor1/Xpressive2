var Xmpp;
(function (Xmpp) {
    var Servers = (function () {
        function Servers(connection) {
            this.conn = connection;
            this.servers = [];
        }
        Servers.prototype.refresh = function (jid) {
            if(jid) {
                this.getServer(jid).getInfo();
            } else {
                for(var serverJid in this.servers) {
                    this.servers[serverJid].getInfo();
                }
            }
        };
        Servers.prototype.addServerAndGetInfo = function (jid) {
            this.addServer(jid).getInfo();
        };
        Servers.prototype.addServer = function (jid) {
            var serverJid = Strophe.getDomainFromJid(jid);
            this.servers[serverJid] = new Xmpp.Server(serverJid, this.conn);
            return this.servers[serverJid];
        };
        Servers.prototype.removeServer = function (jid) {
            var serverJid = Strophe.getDomainFromJid(jid);
            delete this.servers[serverJid];
        };
        Servers.prototype.incomingMucMessage = function (stanza) {
            var from, server, serverJid;
            var message = $(stanza);
            var type = message.attr('type');
            if(type === 'groupchat') {
                from = message.attr('from');
                serverJid = Strophe.getDomainFromJid(from);
                server = this.servers[serverJid];
                if(server) {
                    return server.incomingMucMessage(stanza);
                }
            }
            return false;
        };
        Servers.prototype.isRoom = function (jid) {
            var server = this.getServer(jid);
            if(server) {
                return server.isRoom(jid);
            }
            return false;
        };
        Servers.prototype.getServer = function (jid) {
            var serverJid = Strophe.getDomainFromJid(jid);
            var server = this.servers[serverJid];
            return server;
        };
        Servers.prototype.getMyServer = function () {
            return this.servers[Object.keys(this.servers)[0]];
        };
        Servers.prototype.getRoom = function (jid) {
            var room = null;
            var server = this.getServer(jid);
            if(server) {
                room = server.getRoom(jid);
            }
            return room;
        };
        Servers.prototype.destroyRoom = function (jid, reason, altRoomJid, altRoomPassword) {
            var room = null;
            var server = this.getServer(jid);
            if(server) {
                server.destroyRoom(jid, reason, altRoomJid, altRoomPassword);
            }
        };
        Servers.prototype.updatePresence = function (pres) {
            var jid = $(pres).attr('from');
            var presType = $(pres).attr('type');
            var room = this.getRoom(jid);
            var occupant;
            if(room) {
                if(presType === "unavailable") {
                    room.removeOccupant(jid);
                } else {
                    occupant = room.updateOccupant(pres);
                }
            }
            return occupant;
        };
        Servers.prototype.getOrAddRoom = function (jid) {
            var server;
            var roomJid = Strophe.getBareJidFromJid(jid);
            var room = this.getRoom(roomJid);
            if(!room) {
                server = this.getServer(roomJid);
                if(!server) {
                    server = this.addServer(roomJid);
                }
                room = new Xmpp.Room(roomJid, null, this.conn);
                room.getInfo();
                server.rooms[room.jid] = room;
            }
            return room;
        };
        return Servers;
    })();
    Xmpp.Servers = Servers;    
})(Xmpp || (Xmpp = {}));
