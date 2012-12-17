/// <reference path="xpressive.ts" />

// Interface
interface IChatstates {
    addActive(message: string): void;
    sendActive(jid: string, type: string): void;
    sendComposing(jid: string, type: string): void;
    sendPaused(jid: string, type: string): void;
    sendGone(jid: string, type: string): void;
}

// Module
module Xmpp {

    // Class
    export class Chatstates implements IChatstates {

        _connection: any;

        // Constructor
        constructor () { }

        init(connection) {
            this._connection = connection;
            Strophe.addNamespace('CHATSTATES', 'http://jabber.org/protocol/chatstates');
        }

        statusChanged(status) {
            if (status === Strophe.Status.CONNECTED || status === Strophe.Status.ATTACHED) {
                this._connection.addHandler(this._notificationReceived.bind(this), Strophe.NS.CHATSTATES, "message");
                this._connection.disco.addFeature(Strophe.NS.CHATSTATES);
            }
        }

        addActive(message) {
            return message.c('active', {
                xmlns: Strophe.NS.CHATSTATES
            }).up();
        }

        _notificationReceived(message) {
            var composing = $(message).find('composing'),
                paused = $(message).find('paused'),
                active = $(message).find('active'),
                gone = $(message).find('gone'),
                jid = $(message).attr('from');

            if (composing.length > 0) {
                $(document).trigger('composing.chatstates', jid);
            }

            if (paused.length > 0) {
                $(document).trigger('paused.chatstates', jid);
            }

            if (active.length > 0) {
                $(document).trigger('active.chatstates', jid);
            }

            if (gone.length > 0) {
                $(document).trigger('gone.chatstates', jid);
            }
            return true;
        }

        sendActive(jid, type) {
            this._sendNotification(jid, type, 'active');
        }

        sendComposing(jid, type) {
            this._sendNotification(jid, type, 'composing');
        }

        sendPaused(jid, type) {
            this._sendNotification(jid, type, 'paused');
        }

        sendGone(jid, type) {
            this._sendNotification(jid, type, 'gone');
        }

        _sendNotification(jid, type, notification) {
            if (!type)
                type = 'chat';

            this._connection.send($msg({
                to: jid,
                type: type
            }).c(notification, {
                xmlns: Strophe.NS.CHATSTATES
            }));
        }
    }
}

Strophe.addConnectionPlugin('chatstates', (function() {
    var _chatstates = new Xmpp.Chatstates();

    return {
        init: (connection) => _chatstates.init(connection),
        statusChanged: (status) => _chatstates.statusChanged(status),
        addActive: (message) => _chatstates.addActive(message),
        sendActive: (jid, type) => _chatstates.sendActive(jid, type),
        sendComposing: (jid, type) => _chatstates.sendComposing(jid, type),
        sendPaused: (jid, type) => _chatstates.sendPaused(jid, type),
        sendGone: (jid, type) => _chatstates.sendGone(jid, type),
    }
} ()))