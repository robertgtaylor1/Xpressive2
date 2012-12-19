/// <reference path="xmpp.muc.servers.ts" />
/// <reference path="xmpp.muc.server.ts" />
/// <reference path="xmpp.muc.room.ts" />
/// <reference path="xmpp.xdata.ts" />
/// <reference path="xpressive.ts" />

interface IMuc {
    getRoom(jid: string): IRoom;
    destroyRoom(jid: string, reason?: string, altRoomJid?: string, altRoomPassword?: string): void;
    refreshInfo(jid: string): void;
    configureRoom(jid: string): void;
    getOrAddRoom(jid: string): void;
    join(jid: string, nickname: string, password: string): void;
    leave(roomJid: string): void;
    isRoomSecure(jid: string): bool;
    createRoom(roomName: string, nickname: string): void;
    handlePresence(jid: string): void;
}

// Module
module Xmpp {

    // Class
    export class Muc implements IMuc {
        // Constructor
        constructor () { }

        // local variables
        _connection: any;
        _servers: IServers;

        init(connection: any) {
            Strophe.debug("init muc plugin");

            this._connection = connection;
            this._servers = null;

            Strophe.addNamespace('MUC_USER', 'http://jabber.org/protocol/muc#user');
            Strophe.addNamespace('MUC_OWNER', 'http://jabber.org/protocol/muc#owner');
            Strophe.addNamespace('X_DATA', 'jabber:x:data');
        };

        // called when connection status is changed
        statusChanged(status: string) {
            if (status === Strophe.Status.CONNECTED) {
                this._servers = new Xmpp.Servers(this._connection);
                this._connection.addHandler(this.handlePresence.bind(this), Strophe.NS.MUC_USER, "presence");

            } else if (status === Strophe.Status.DISCONNECTED) {
                this._servers = null;
            }
        };

        processDiscoItems(iq: any) {
            var discoItems = $(iq);
            var mucJid;
            var mucInfoRequest;
            var hasMucItem = discoItems.find('item').each((index, item) => {
                if ($(item).attr('name') === 'conference') {
                    mucJid = $(item).attr('jid');
                    return;
                }
            });
            if (mucJid) {
                this._servers.addServerAndGetInfo(mucJid);
            }
        };

        join(roomJid: string, nickname: string, password: string) {
            var room = this._servers.getRoom(roomJid);
            room.join(nickname, password);
        };

        leave(roomJid: string) {
            var room = this._servers.getRoom(roomJid);
            room.leave();
        };

        isRoomSecure(roomJid: string) {
            var room = this._servers.getRoom(roomJid);
            if (room) {
                return room.requiresPassword();
            }
            return true;
        };

        handlePresence(stanza: any) {
            var nickname;
            var presence = $(stanza);
            var presType = presence.attr('type');
            var from = presence.attr('from');
            var room = this._servers.getRoom(from);
            var occupant;

            if (presType === "error") {
                var error = presence.find('error');
                if (error.length > 0) {
                    var errorType = error.attr('type');
                    var errorCode = error.next().prop("tagName");

                    Strophe.error("MUC presence error: type=" + errorType + ", code=" + errorCode);

                    switch (errorType) {
                        case "auth":
                            switch (errorCode) {
                                case "forbidden":
                                    // banned/outcast
                                    break;
                                case "not-authorized":
                                    // password not supplied or incorrect
                                    break;
                                case "registration-required":
                                    // members only
                                    break;
                                default:
                                    break;
                            }
                            break;
                        case "cancel":
                            switch (errorCode) {
                                case "conflict":
                                    // nickname clash
                                    break;
                                case "not-allowed":
                                    // can't create room
                                    break;
                                case "item-not-found":
                                    // room doesn't exist or is locked 
                                    break;
                                default:
                                    break;
                            }
                            break;
                        case "wait":
                            switch (errorCode) {
                                case "service-unavailable":
                                    // user limit reached
                                    break;
                                default:
                                    break;
                            }
                            break;
                        case "modify":
                            switch (errorCode) {
                                case "jid-malformed":
                                    // Nickname missing
                                    break;
                                default:
                                    break;
                            }
                            break;
                        default:
                            break;
                    }
                }
            } else {
                if (room && room.isConfigured) {
                    Strophe.info("[MUC] Presence received for: " + from);

                    nickname = Strophe.getResourceFromJid(from);
                    if (nickname === room.myNickname) {
                        // this is me
                        if (presType === 'unavailable') {
                            // I have left the room					
                            $(document).trigger("I_have_left_room", room);
                            return true;
                        }
                    }
                    occupant = this._servers.updatePresence(presence);

                    if (presType === 'unavailable') {
                        // Someone has left the room
                        return true;
                    }

                    $(document).trigger("update_room_occupants", occupant);
                } else {
                    Strophe.info("[MUC] Presence for new room: " + from);
                    // request room config
                    this._requestRoomForm(from);
                }
            }
            return true;
        };

        _requestRoomForm(roomJid: string) {
            var iq = $iq({
                type: "get",
                to: Strophe.getBareJidFromJid(roomJid)
            }).c('query', { xmlns: Strophe.NS.MUC_OWNER });

            this._connection.sendIQ(iq,
                (iq) =>{
                    this._formRequestHandler(iq);
                },
                (iq) =>{
                    this._formRequestErrorHandler(iq);
                });
        };

        _formRequestHandler(iq: any) {
            // notify user code of room change
            $(document).trigger("create_room_form", { "iq": iq, "onOk": (iq, form) =>{ this.configureThisRoom(iq, form); }, "onCancel": (iq) =>{ this.cancelThisRoom(iq); } });
        };

        _formRequestErrorHandler(iq: any) {
            Strophe.error("Create Room Form request failed.")
        };

        configureThisRoom(iq: any, form: any) {
            var xform = Form.fromHTML(form);
            xform.type = "submit";
            var xml = xform.toXML();

            var iqResponse = $iq({
                to: $(iq).attr('from'),
                type: "set"
            })
                .c('query', {
                    xmlns: Strophe.NS.MUC_OWNER
                })
                .cnode(xml);

            this._connection.sendIQ(iqResponse.tree(),
                (iq) => {
                    this.on_configure_room_result(iq);
                },
                (iq) => {
                    this.on_create_room_error.bind(iq);
                });
        }

        cancelThisRoom(iq: any) {
            var roomJid = $(iq).attr('from');
            var iqResponse = $iq({
                to: roomJid,
                type: "set"
            })
                .c('query', {
                    xmlns: Strophe.NS.MUC_OWNER
                })
                .c('x', {
                    xmlns: Strophe.NS.X_DATA,
                    type: "cancel"
                });

            this._connection.sendIQ(iqResponse.tree());
            //_servers.removeFromList(roomJid);
        };

        on_configure_room_result(iq: any) {
            var from = $(iq).attr('from');
            // add room to list
            this.refreshInfo(from);
            // now join it
            var room = this.getRoom(from);
            if (!room.isConfigured) {
                room.isConfigured = true;
                room.rejoin();
            }
        };

        on_create_room_error(iq: any) {

        };

        refreshInfo(jid: string) {
            this._servers.getRoom(jid).getInfo();
        };

        isServer(jid: string) {
            var server = this._servers.getServer(jid);
            if (server)
                return true;
            return false;
        };

        getOrAddRoom(jid: string) {
            return this._servers.getOrAddRoom(jid);
        };

        getRoom(jid: string) {
            return this._servers.getRoom(jid);
        };

        createRoom(roomName: string, nickname: string) {
            var myServer = this._servers.getMyServer();
            var roomJid = roomName + "@" + myServer.serverJid;
            var newRoom: Room = new Xmpp.Room(roomJid, "[" + roomName + "]...not configured", this._connection);
            newRoom.isConfigured = false;
            newRoom.myNickname = nickname;
            myServer.rooms[roomJid] = newRoom;

            // request form
            var request = $pres({
                to: roomJid + "/" + nickname
            }).c('x', { xmlns: Strophe.NS.MUC });

            this._connection.send(request);
        };

        destroyRoom(jid: string, reason?: string, altRoomJid?: string, altRoomPassword?: string) {
            this._servers.destroyRoom(jid, reason, altRoomJid, altRoomPassword);
        };

        configureRoom(roomJid) {
            this._requestRoomForm(roomJid);
        };
    }
}

// example roster plugin
Strophe.addConnectionPlugin('muc', (function() {
    var _muc = new Xmpp.Muc();

    return {
        init: (connection: any) => _muc.init(connection),
        statusChanged: (status: string) => _muc.statusChanged(status),
        processDiscoItems: (jid: string) => _muc.processDiscoItems(jid),
        join: (roomJid: string, nickname: string, password) => _muc.join(roomJid, nickname, password),
        leave: (jid: string) => _muc.leave(jid),
        isServer: (jid: string) => _muc.isServer(jid),
        isRoomSecure: (jid: string) => _muc.isRoomSecure(jid),
        getRoom: (jid: string) => _muc.getRoom(jid),
        getOrAddRoom: (jid: string) => _muc.getOrAddRoom(jid),
        createRoom: (roomName: string, nickname: string) => _muc.createRoom(roomName, nickname),
        destroyRoom: (jid: string, reason?: string, altRoomJid?: string, altRoomPassword?: string) => _muc.destroyRoom(jid, reason, altRoomJid, altRoomPassword),
        refreshInfo: (jid: string) => _muc.refreshInfo(jid),
        handlePresence: (jid: string) => _muc.handlePresence(jid),
        configureRoom: (jid: string) => _muc.configureRoom(jid),
    }
} ()))
