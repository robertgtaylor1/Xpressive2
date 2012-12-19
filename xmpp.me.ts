/// <reference path="xpressive.ts" />
/// <reference path="Scripts/ts/jquery-1.8.d.ts" />
/// <reference path="Scripts/ts/jstorage.d.ts" />

// Interface
interface IMe {
    init(connection): void;
    statusChanged(status: string): void;
    setNickname(nickname: string);
    getNickname(): string;
    setStatus(newStatus: string, newInfo: string): void;
    statusToString(): any;
    extendedStatusToString(): any;
    sendPresence(): void;
    myJid(): string;
    changeStatus(status: string, info: string): void;
    available(): void;
    away(): void;
    chat(): void;
    xa(): void;
    dnd(): void;
    offline(): void;
}

interface statusObjString {
    default: string;
    unavailable: string;
    available: string;
    chat: string;
    away: string;
    xa: string;
    dnd: string;
    disconnected: string;
    authfail: string;
    connfail: string;
    authenticating: string;
}

// Module
module Xmpp {

    // Class
    export class Me implements IMe {

        private nickname: string;
        private status: string;
        private info: string;
        private conn: any;
        private jid = "";
        private password = "";
        private xpressive: IXpressive;

        // Constructor
        constructor (xpressive: IXpressive) {
            this.xpressive = xpressive;
        }

        init(connection) {
            Strophe.debug("init me plugin");

            this.conn = connection;
            connection.addHandler(this._onVersionIq.bind(this), Strophe.NS.VERSION, 'iq', 'get', null, null);
        }

        statusChanged(status) {

            switch (status) {
                case Strophe.Status.CONNECTED:
                    this.jid = this.conn.jid;
                    this.setStatus("connected");
                    this.xpressive.Disco.addFeature(Strophe.NS.VERSION);
                    break;
                case Strophe.Status.CONNECTING:
                    this.setStatus("connecting");
                    break;
                case Strophe.Status.DISCONNECTING:
                    this.setStatus("disconnecting");
                    break;
                case Strophe.Status.DISCONNECTED:
                    this.setStatus("disconnected");
                    break;
                case Strophe.Status.CONNFAIL:
                    this.setStatus("connfail");
                    break;
                case Strophe.Status.AUTHENTICATING:
                    this.setStatus("authenticating");
                    break;
                case Strophe.Status.AUTHFAIL:
                    this.setStatus("authfail");
                    break;
            }
        }

        private _onVersionIq(iq) {
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
        }

        setNickname(newNickname) {
            this.nickname = newNickname;

            $(document).trigger('my_status_changed', this);
        }

        getNickname() {
            if ((this.nickname || "").length === 0) {
                var _nickname = this.xpressive.getSetting("nickname");
                if ((_nickname || "").length === 0) {
                    _nickname = Strophe.getNodeFromJid(this.jid);
                }
                this.setNickname(_nickname);
            }
            return this.nickname;
        }

        setStatus(newStatus, newInfo? ) {
            var oldStatus = this.status;

            if (oldStatus === newStatus && (newInfo || "") === this.info) {
                return;
            }
            Strophe.debug("Status change: " + oldStatus + " > " + newStatus + " [" + newInfo + "]");

            this.info = newInfo || "";
            this.status = newStatus;

            $(document).trigger('my_status_changed', this);

            if (oldStatus === "connected") {
                this.conn.caps.sendPres();
            } else {
                this.sendPresence();
            }
        }

        statusObj: statusObjString = {
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
        }

        statusToString() {
            return this.statusObj[this.status] || this.statusObj["default"];
        }

        extendedStatusToString() {
            var status = this.statusToString();
            if (this.info.length > 0) {
                status += " : " + this.info;
            }
            return status;
        }

        sendPresence() {
            if (this.conn !== undefined) {
                switch (this.status) {
                    case "unavailable":
                        this.conn.send($pres({
                            type: "unavailable"
                        }).tree());
                        return;
                    case "available":
                        this.conn.send($pres());
                        return;
                    case "away":
                    case "xa":
                    case "chat":
                    case "dnd":
                        var pres = $pres().c('show', null, this.status);
                        if (this.info.length > 0) {
                            pres.c('status', null, this.info);
                        }
                        this.conn.send(pres.tree());
                        return;
                }
            }
        }

        myJid(): string {
            return Strophe.getBareJidFromJid(this.jid);
        }

        changeStatus(status, info) {
            this.setStatus(status, info);
        }

        available() {
            this.setStatus("available");
        }

        away() {
            this.setStatus("away");
        }

        chat() {
            this.setStatus("chat");
        }

        xa() {
            this.setStatus("xa");
        }

        dnd() {
            this.setStatus("dnd");
        }

        offline() {
            this.setStatus("unavailable");
        }
    }
}

Strophe.addConnectionPlugin('me', (function() {
    var _me = new Xmpp.Me(Xpressive);

    return {
        init: (connection) => _me.init(connection),
        statusChanged: (status) => _me.statusChanged(status),
 		changeStatus : (status, info) => _me.changeStatus(status, info),
		available : () => _me.available(),
		away : () => _me.away(),
		chat : () => _me.chat(),
		xa : () => _me.xa(),
		dnd : () => _me.dnd(),
		offline : () => _me.offline(),
		myJid : () => _me.myJid(),
        myNickname: () => _me.getNickname()
    }
} ()))