var Xmpp;
(function (Xmpp) {
    var Chatstates = (function () {
        function Chatstates() {
        }
        Chatstates.prototype.init = function (connection) {
            this._connection = connection;
            Strophe.addNamespace('CHATSTATES', 'http://jabber.org/protocol/chatstates');
        };
        Chatstates.prototype.statusChanged = function (status) {
            if(status === Strophe.Status.CONNECTED || status === Strophe.Status.ATTACHED) {
                this._connection.addHandler(this._notificationReceived.bind(this), Strophe.NS.CHATSTATES, "message");
                this._connection.disco.addFeature(Strophe.NS.CHATSTATES);
            }
        };
        Chatstates.prototype.addActive = function (message) {
            return message.c('active', {
                xmlns: Strophe.NS.CHATSTATES
            }).up();
        };
        Chatstates.prototype._notificationReceived = function (message) {
            var composing = $(message).find('composing'), paused = $(message).find('paused'), active = $(message).find('active'), gone = $(message).find('gone'), jid = $(message).attr('from');
            if(composing.length > 0) {
                $(document).trigger('composing.chatstates', jid);
            }
            if(paused.length > 0) {
                $(document).trigger('paused.chatstates', jid);
            }
            if(active.length > 0) {
                $(document).trigger('active.chatstates', jid);
            }
            if(gone.length > 0) {
                $(document).trigger('gone.chatstates', jid);
            }
            return true;
        };
        Chatstates.prototype.sendActive = function (jid, type) {
            this._sendNotification(jid, type, 'active');
        };
        Chatstates.prototype.sendComposing = function (jid, type) {
            this._sendNotification(jid, type, 'composing');
        };
        Chatstates.prototype.sendPaused = function (jid, type) {
            this._sendNotification(jid, type, 'paused');
        };
        Chatstates.prototype.sendGone = function (jid, type) {
            this._sendNotification(jid, type, 'gone');
        };
        Chatstates.prototype._sendNotification = function (jid, type, notification) {
            if(!type) {
                type = 'chat';
            }
            this._connection.send($msg({
                to: jid,
                type: type
            }).c(notification, {
                xmlns: Strophe.NS.CHATSTATES
            }));
        };
        return Chatstates;
    })();
    Xmpp.Chatstates = Chatstates;    
})(Xmpp || (Xmpp = {}));
Strophe.addConnectionPlugin('chatstates', ((function () {
    var _chatstates = new Xmpp.Chatstates();
    return {
        init: function (connection) {
            return _chatstates.init(connection);
        },
        statusChanged: function (status) {
            return _chatstates.statusChanged(status);
        },
        addActive: function (message) {
            return _chatstates.addActive(message);
        },
        sendActive: function (jid, type) {
            return _chatstates.sendActive(jid, type);
        },
        sendComposing: function (jid, type) {
            return _chatstates.sendComposing(jid, type);
        },
        sendPaused: function (jid, type) {
            return _chatstates.sendPaused(jid, type);
        },
        sendGone: function (jid, type) {
            return _chatstates.sendGone(jid, type);
        }
    };
})()));
//@ sourceMappingURL=xmpp.chatstates.js.map
