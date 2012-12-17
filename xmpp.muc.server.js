var Xmpp;
(function (Xmpp) {
    var Server = (function () {
        function Server(jid, conn) {
            this.serverJid = Strophe.getDomainFromJid(jid);
            this.connection = conn;
            this.serverInfoResponse = [];
            this.serverItemsResponse = [];
            this.rooms = [];
            Strophe.info("Server: new server created: " + this.serverJid);
        }
        Server.prototype.getInfo = function () {
            Strophe.info("Server: get info for: " + this.serverJid);
            var serverInfoIq = $iq({
                to: this.serverJid,
                type: "get"
            }).c("query", {
                xmlns: Strophe.NS.DISCO_INFO
            });
            this.connection.sendIQ(serverInfoIq, this.serverInfo.bind(this), this.serverInfoError.bind(this));
        };
        Server.prototype.removeFromList = function (roomJid) {
            delete this.rooms[roomJid];
            $(document).trigger('remove_room_from_list', roomJid);
        };
        Server.prototype.serverInfo = function (iq) {
            Strophe.info("Server: got info for: " + this.serverJid);
            this.serverInfoResponse = iq;
            var serverItemsIq = $iq({
                to: this.serverJid,
                type: "get"
            }).c("query", {
                xmlns: Strophe.NS.DISCO_ITEMS
            });
            Strophe.info("Server: get items for: " + this.serverJid);
            this.connection.sendIQ(serverItemsIq, this.serverItems.bind(this), this.serverItemsError.bind(this));
        };
        Server.prototype.serverInfoError = function (iq) {
            Strophe.error("ERROR: get server info for: " + this.serverJid);
            var errorIq = $(iq);
        };
        Server.prototype.serverItems = function (iq) {
            var _this = this;
            Strophe.info("Server: got items for: " + this.serverJid);
            var room;
            this.serverItemsResponse = iq;
            $(iq).find('item').each(function (index, item) {
                room = new Xmpp.Room($(item).attr('jid'), $(item).attr('name'), _this.connection);
                room.getInfo();
                _this.rooms[room.jid] = room;
            });
            $(document).trigger("rooms_changed", this);
        };
        Server.prototype.serverItemsError = function (iq) {
            Strophe.error("Server ERROR: get server items for: " + this.serverJid);
            var errorIq = $(iq);
        };
        Server.prototype.incomingMucMessage = function (stanza) {
            var message = $(stanza);
            var from = message.attr('from');
            var server = Strophe.getBareJidFromJid(from);
            var room = this.rooms[from];
            if(!room) {
                return false;
            }
            room.incomingMucMessage(stanza);
        };
        Server.prototype.isRoom = function (jid) {
            var room = this.getRoom(jid);
            if(room) {
                return true;
            }
            return false;
        };
        Server.prototype.getRoom = function (jid) {
            var roomJid = Strophe.getBareJidFromJid(jid);
            var room = this.rooms[roomJid];
            return room;
        };
        Server.prototype.destroyRoom = function (jid, reason, altRoomJid, altRoomPassword) {
            var roomJid = Strophe.getBareJidFromJid(jid);
            var destroyIq = $iq({
                "to": roomJid,
                "type": "set"
            }).c('query', {
                "xmlns": Strophe.NS.MUC_OWNER
            });
            if(altRoomJid) {
                destroyIq.c('destroy', {
                    "jid": altRoomJid
                });
            } else {
                destroyIq.c('destroy');
            }
            if(altRoomPassword) {
                destroyIq.c('password').t(altRoomPassword).up();
            }
            if(reason) {
                destroyIq.c('reason').t(reason);
            }
            this.connection.sendIQ(destroyIq.tree(), this._roomDestroyed.bind(this));
        };
        Server.prototype._roomDestroyed = function (iq) {
            var roomJid = $(iq).attr('from');
            this.removeFromList(roomJid);
        };
        return Server;
    })();
    Xmpp.Server = Server;    
})(Xmpp || (Xmpp = {}));
//@ sourceMappingURL=xmpp.muc.server.js.map
