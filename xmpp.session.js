var Xmpp;
(function (Xmpp) {
    var Session = (function () {
        function Session() {
            this.discoInfo = [];
            this.discoItems = [];
        }
        Session.prototype.onDiscoInfo = function (iq) {
            Strophe.info("got disco#info response.");
            this.discoInfo = iq;
            var discoItemsIq = $iq({
                to: this.jid(),
                type: 'get'
            }).c('query', {
                xmlns: Strophe.NS.DISCO_ITEMS
            });
            Strophe.info("request disco#items.");
            this.conn.sendIQ(discoItemsIq, this.onDiscoItems.bind(this), this.onItemsError.bind(this));
        };
        Session.prototype.onInfoError = function (iq) {
            if(iq === null) {
                Strophe.warn("disco#info timed out.");
            } else {
                Strophe.error("disco#info returned an error.");
            }
        };
        Session.prototype.onDiscoItems = function (iq) {
            Strophe.info("got disco#items response.");
            this.discoItems = iq;
            if(this.conn.muc) {
                this.conn.muc.processDiscoItems(iq);
            }
            if(this.conn.pubsub) {
                this.conn.pubsub.processDiscoItems(iq);
            }
        };
        Session.prototype.onItemsError = function (iq) {
            if(iq === null) {
                Strophe.warn("disco#info timed out.");
            } else {
                Strophe.error("disco#info returned an error.");
            }
        };
        Session.prototype.init = function (connection) {
            Strophe.debug("init session plugin");
            this.conn = connection;
            this.jid = function () {
                return Strophe.getDomainFromJid(this.conn.jid);
            };
        };
        Session.prototype.statusChanged = function (status) {
            if(status === Strophe.Status.CONNECTED || status === Strophe.Status.ATTACHED) {
                var discoInfo = $iq({
                    type: 'get'
                }).c('query', {
                    xmlns: Strophe.NS.DISCO_INFO
                });
                Strophe.info("request info");
                this.conn.sendIQ(discoInfo, this.onDiscoInfo.bind(this), this.onInfoError.bind(this));
            } else {
                if(status === Strophe.Status.DISCONNECTED) {
                    this.discoInfo = [];
                }
            }
        };
        Session.prototype.disconnect = function () {
            this.conn.disconnect();
        };
        Session.prototype.unhandledIq = function (iq) {
            Strophe.info("Unhandled Iq");
            return true;
        };
        return Session;
    })();
    Xmpp.Session = Session;    
})(Xmpp || (Xmpp = {}));
Strophe.addConnectionPlugin('session', ((function () {
    var _session = new Xmpp.Session();
    return {
        init: function (connection) {
            return _session.init(connection);
        },
        statusChanged: function (status) {
            return _session.statusChanged(status);
        },
        disconnect: function () {
            return _session.disconnect();
        },
        unhandledIq: function (iq) {
            return _session.unhandledIq(iq);
        }
    };
})()));
//@ sourceMappingURL=xmpp.session.js.map
