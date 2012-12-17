var Xmpp;
(function (Xmpp) {
    var Me = (function () {
        function Me(xpressive) {
            this.jid = "";
            this.password = "";
            this.statusObj = {
                "default": "...processing",
                unavailable: "Unavailable",
                available: "Online, Available",
                chat: "Chatting",
                away: "Away",
                xa: "Extended Away",
                dnd: "Do not disturb",
                disconnected: "Not connected",
                authfail: "Authorization failed",
                connfail: "Connection failed",
                authenticating: "Authenticating..."
            };
            this.xpressive = xpressive;
            this._this = this;
        }
        Me.prototype.init = function (connection) {
            Strophe.debug("init me plugin");
            this._this.conn = connection;
            this._this.conn.addHandler(this._onVersionIq.bind(this._this), Strophe.NS.VERSION, 'iq', 'get', null, null);
        };
        Me.prototype.statusChanged = function (status) {
            var that = this._this;
            switch(status) {
                case Strophe.Status.CONNECTED: {
                    this.jid = this.conn.jid;
                    this.setStatus("connected");
                    that.conn.disco.addFeature(Strophe.NS.VERSION);
                    break;

                }
                case Strophe.Status.CONNECTING: {
                    this.setStatus("connecting");
                    break;

                }
                case Strophe.Status.DISCONNECTING: {
                    this.setStatus("disconnecting");
                    break;

                }
                case Strophe.Status.DISCONNECTED: {
                    this.setStatus("disconnected");
                    break;

                }
                case Strophe.Status.CONNFAIL: {
                    this.setStatus("connfail");
                    break;

                }
                case Strophe.Status.AUTHENTICATING: {
                    this.setStatus("authenticating");
                    break;

                }
                case Strophe.Status.AUTHFAIL: {
                    this.setStatus("authfail");
                    break;

                }
            }
        };
        Me.prototype._onVersionIq = function (iq) {
            var stanza = $(iq);
            var id = stanza.attr('id');
            var from = stanza.attr('from');
            var iqresult = $iq({
                to: from,
                type: 'result',
                id: id
            });
            iqresult.c('query', {
                xmlns: Strophe.NS.VERSION
            }).c('name', null, 'XpressiveJS').c('version', null, '0.1');
            this.conn.send(iqresult.tree());
            return true;
        };
        Me.prototype.setNickname = function (newNickname) {
            this.nickname = newNickname;
            $(document).trigger('my_status_changed', this);
        };
        Me.prototype.getNickname = function () {
            if((this.nickname || "").length === 0) {
                var _nickname = this.xpressive.getSetting("nickname");
                if((_nickname || "").length === 0) {
                    _nickname = Strophe.getNodeFromJid(this.jid);
                }
                this.setNickname(_nickname);
            }
            return this.nickname;
        };
        Me.prototype.setStatus = function (newStatus, newInfo) {
            var oldStatus = this.status;
            if(oldStatus === newStatus && (newInfo || "") === this.info) {
                return;
            }
            Strophe.debug("Status change: " + oldStatus + " > " + newStatus + " [" + newInfo + "]");
            this.info = newInfo || "";
            this.status = newStatus;
            $(document).trigger('my_status_changed', this);
            if(oldStatus === "connected") {
                this.conn.caps.sendPres();
            } else {
                this.sendPresence();
            }
        };
        Me.prototype.statusToString = function () {
            return this.statusObj[this.status] || this.statusObj["default"];
        };
        Me.prototype.extendedStatusToString = function () {
            var status = this.statusToString();
            if(this.info.length > 0) {
                status += " : " + this.info;
            }
            return status;
        };
        Me.prototype.sendPresence = function () {
            if(this.conn !== undefined) {
                switch(this.status) {
                    case "unavailable": {
                        this.conn.send($pres({
                            type: "unavailable"
                        }).tree());
                        return;

                    }
                    case "available": {
                        this.conn.send($pres());
                        return;

                    }
                    case "away":
                    case "xa":
                    case "chat":
                    case "dnd": {
                        var pres = $pres().c('show', null, this.status);
                        if(this.info.length > 0) {
                            pres.c('status', null, this.info);
                        }
                        this.conn.send(pres.tree());
                        return;

                    }
                }
            }
        };
        Me.prototype.myJid = function () {
            return Strophe.getBareJidFromJid(this.jid);
        };
        Me.prototype.changeStatus = function (status, info) {
            this.setStatus(status, info);
        };
        Me.prototype.available = function () {
            this.setStatus("available");
        };
        Me.prototype.away = function () {
            this.setStatus("away");
        };
        Me.prototype.chat = function () {
            this.setStatus("chat");
        };
        Me.prototype.xa = function () {
            this.setStatus("xa");
        };
        Me.prototype.dnd = function () {
            this.setStatus("dnd");
        };
        Me.prototype.offline = function () {
            this.setStatus("unavailable");
        };
        return Me;
    })();
    Xmpp.Me = Me;    
})(Xmpp || (Xmpp = {}));
Strophe.addConnectionPlugin('me', ((function () {
    var _me = new Xmpp.Me(Xpressive);
    return {
        init: function (connection) {
            return _me.init(connection);
        },
        statusChanged: function (status) {
            return _me.statusChanged(status);
        },
        changeStatus: function (status, info) {
            return _me.changeStatus(status, info);
        },
        available: function () {
            return _me.available();
        },
        away: function () {
            return _me.away();
        },
        chat: function () {
            return _me.chat();
        },
        xa: function () {
            return _me.xa();
        },
        dnd: function () {
            return _me.dnd();
        },
        offline: function () {
            return _me.offline();
        },
        myJid: function () {
            return _me.myJid();
        },
        myNickname: function () {
            return _me.getNickname();
        }
    };
})()));
//@ sourceMappingURL=xmpp.me.js.map
