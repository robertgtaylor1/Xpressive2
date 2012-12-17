var Xmpp;
(function (Xmpp) {
    var Muc = (function () {
        function Muc() {
        }
        Muc.prototype.init = function (connection) {
            Strophe.debug("init muc plugin");
            this._connection = connection;
            this._servers = null;
            Strophe.addNamespace('MUC_USER', 'http://jabber.org/protocol/muc#user');
            Strophe.addNamespace('MUC_OWNER', 'http://jabber.org/protocol/muc#owner');
            Strophe.addNamespace('X_DATA', 'jabber:x:data');
        };
        Muc.prototype.statusChanged = function (status) {
            if(status === Strophe.Status.CONNECTED) {
                this._servers = new Xmpp.Servers(this._connection);
                this._connection.addHandler(this.handlePresence.bind(this), Strophe.NS.MUC_USER, "presence");
            } else {
                if(status === Strophe.Status.DISCONNECTED) {
                    this._servers = null;
                }
            }
        };
        Muc.prototype.processDiscoItems = function (iq) {
            var discoItems = $(iq);
            var mucJid;
            var mucInfoRequest;
            var hasMucItem = discoItems.find('item').each(function (index, item) {
                if($(item).attr('name') === 'conference') {
                    mucJid = $(item).attr('jid');
                    return;
                }
            });
            if(mucJid) {
                this._servers.addServerAndGetInfo(mucJid);
            }
        };
        Muc.prototype.join = function (roomJid, nickname, password) {
            var room = this._servers.getRoom(roomJid);
            room.join(nickname, password);
        };
        Muc.prototype.leave = function (roomJid) {
            var room = this._servers.getRoom(roomJid);
            room.leave();
        };
        Muc.prototype.isRoomSecure = function (roomJid) {
            var room = this._servers.getRoom(roomJid);
            if(room) {
                return room.requiresPassword();
            }
            return true;
        };
        Muc.prototype.handlePresence = function (stanza) {
            var nickname;
            var presence = $(stanza);
            var presType = presence.attr('type');
            var from = presence.attr('from');
            var room = this._servers.getRoom(from);
            var occupant;
            if(presType === "error") {
                var error = presence.find('error');
                if(error.length > 0) {
                    var errorType = error.attr('type');
                    var errorCode = error.next().prop("tagName");
                    Strophe.error("MUC presence error: type=" + errorType + ", code=" + errorCode);
                    switch(errorType) {
                        case "auth": {
                            switch(errorCode) {
                                case "forbidden": {
                                    break;

                                }
                                case "not-authorized": {
                                    break;

                                }
                                case "registration-required": {
                                    break;

                                }
                                default: {
                                    break;

                                }
                            }
                            break;

                        }
                        case "cancel": {
                            switch(errorCode) {
                                case "conflict": {
                                    break;

                                }
                                case "not-allowed": {
                                    break;

                                }
                                case "item-not-found": {
                                    break;

                                }
                                default: {
                                    break;

                                }
                            }
                            break;

                        }
                        case "wait": {
                            switch(errorCode) {
                                case "service-unavailable": {
                                    break;

                                }
                                default: {
                                    break;

                                }
                            }
                            break;

                        }
                        case "modify": {
                            switch(errorCode) {
                                case "jid-malformed": {
                                    break;

                                }
                                default: {
                                    break;

                                }
                            }
                            break;

                        }
                        default: {
                            break;

                        }
                    }
                }
            } else {
                if(room && room.isConfigured) {
                    Strophe.info("[MUC] Presence received for: " + from);
                    nickname = Strophe.getResourceFromJid(from);
                    if(nickname === room.myNickname) {
                        if(presType === 'unavailable') {
                            $(document).trigger("I_have_left_room", room);
                            return true;
                        }
                    }
                    occupant = this._servers.updatePresence(presence);
                    if(presType === 'unavailable') {
                        return true;
                    }
                    $(document).trigger("update_room_occupants", occupant);
                } else {
                    Strophe.info("[MUC] Presence for new room: " + from);
                    this._requestRoomForm(from);
                }
            }
            return true;
        };
        Muc.prototype._requestRoomForm = function (roomJid) {
            var _this = this;
            var iq = $iq({
                type: "get",
                to: Strophe.getBareJidFromJid(roomJid)
            }).c('query', {
                xmlns: Strophe.NS.MUC_OWNER
            });
            this._connection.sendIQ(iq, function (iq) {
                _this._formRequestHandler(iq);
            }, function (iq) {
                _this._formRequestErrorHandler(iq);
            });
        };
        Muc.prototype._formRequestHandler = function (iq) {
            var _this = this;
            $(document).trigger("create_room_form", {
                "iq": iq,
                "onOk": function (iq, form) {
                    _this.configureThisRoom(iq, form);
                },
                "onCancel": function (iq) {
                    _this.cancelThisRoom(iq);
                }
            });
        };
        Muc.prototype._formRequestErrorHandler = function (iq) {
            Strophe.error("Create Room Form request failed.");
        };
        Muc.prototype.configureThisRoom = function (iq, form) {
            var _this = this;
            var xform = Xmpp.Form.fromHTML(form);
            xform.type = "submit";
            var xml = xform.toXML();
            var iqResponse = $iq({
                to: $(iq).attr('from'),
                type: "set"
            }).c('query', {
                xmlns: Strophe.NS.MUC_OWNER
            }).cnode(xml);
            this._connection.sendIQ(iqResponse.tree(), function (iq) {
                _this.on_configure_room_result(iq);
            }, function (iq) {
                _this.on_create_room_error.bind(iq);
            });
        };
        Muc.prototype.cancelThisRoom = function (iq) {
            var roomJid = $(iq).attr('from');
            var iqResponse = $iq({
                to: roomJid,
                type: "set"
            }).c('query', {
                xmlns: Strophe.NS.MUC_OWNER
            }).c('x', {
                xmlns: Strophe.NS.X_DATA,
                type: "cancel"
            });
            this._connection.sendIQ(iqResponse.tree());
        };
        Muc.prototype.on_configure_room_result = function (iq) {
            var from = $(iq).attr('from');
            this.refreshInfo(from);
            var room = this.getRoom(from);
            if(!room.isConfigured) {
                room.isConfigured = true;
                room.rejoin();
            }
        };
        Muc.prototype.on_create_room_error = function (iq) {
        };
        Muc.prototype.refreshInfo = function (jid) {
            this._servers.getRoom(jid).getInfo();
        };
        Muc.prototype.isServer = function (jid) {
            var server = this._servers.getServer(jid);
            if(server) {
                return true;
            }
            return false;
        };
        Muc.prototype.getOrAddRoom = function (jid) {
            return this._servers.getOrAddRoom(jid);
        };
        Muc.prototype.getRoom = function (jid) {
            return this._servers.getRoom(jid);
        };
        Muc.prototype.createRoom = function (roomName, nickname) {
            var myServer = this._servers.getMyServer();
            var roomJid = roomName + "@" + myServer.serverJid;
            var newRoom = new Xmpp.Room(roomJid, "[" + roomName + "]...not configured", this._connection);
            newRoom.isConfigured = false;
            newRoom.myNickname = nickname;
            myServer.rooms[roomJid] = newRoom;
            var request = $pres({
                to: roomJid + "/" + nickname
            }).c('x', {
                xmlns: Strophe.NS.MUC
            });
            this._connection.send(request);
        };
        Muc.prototype.destroyRoom = function (jid, reason, altRoomJid, altRoomPassword) {
            this._servers.destroyRoom(jid, reason, altRoomJid, altRoomPassword);
        };
        Muc.prototype.configureRoom = function (roomJid) {
            this._requestRoomForm(roomJid);
        };
        return Muc;
    })();
    Xmpp.Muc = Muc;    
})(Xmpp || (Xmpp = {}));
Strophe.addConnectionPlugin('muc', ((function () {
    var _muc = new Xmpp.Muc();
    return {
        init: function (connection) {
            return _muc.init(connection);
        },
        statusChanged: function (status) {
            return _muc.statusChanged(status);
        },
        processDiscoItems: function (jid) {
            return _muc.processDiscoItems(jid);
        },
        join: function (roomJid, nickname, password) {
            return _muc.join(roomJid, nickname, password);
        },
        leave: function (jid) {
            return _muc.leave(jid);
        },
        isServer: function (jid) {
            return _muc.isServer(jid);
        },
        isRoomSecure: function (jid) {
            return _muc.isRoomSecure(jid);
        },
        getRoom: function (jid) {
            return _muc.getRoom(jid);
        },
        getOrAddRoom: function (jid) {
            return _muc.getOrAddRoom(jid);
        },
        createRoom: function (roomName, nickname) {
            return _muc.createRoom(roomName, nickname);
        },
        destroyRoom: function (jid, reason, altRoomJid, altRoomPassword) {
            return _muc.destroyRoom(jid, reason, altRoomJid, altRoomPassword);
        },
        refreshInfo: function (jid) {
            return _muc.refreshInfo(jid);
        },
        handlePresence: function (jid) {
            return _muc.handlePresence(jid);
        },
        configureRoom: function (jid) {
            return _muc.configureRoom(jid);
        }
    };
})()));
//@ sourceMappingURL=xmpp.muc.js.map
