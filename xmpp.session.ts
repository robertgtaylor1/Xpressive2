/// <reference path="xpressive.ts" />

interface ISession {
    disconnect(): void;
}

// Module
module Xmpp {

    // Class
    export class Session {

        conn: any;
        jid: any;
        discoInfo: any[];
        discoItems: any[];

        // Constructor
        constructor () {
            this.discoInfo = [];
            this.discoItems = [];
        }

        onDiscoInfo(iq) {
            Strophe.info("got disco#info response.");
            this.discoInfo = iq;

            // Get info
            var discoItemsIq = $iq({
                to: this.jid(),
                type: 'get'
            }).c('query', {
                xmlns: Strophe.NS.DISCO_ITEMS
            });

            Strophe.info("request disco#items.");
            this.conn.sendIQ(discoItemsIq, this.onDiscoItems.bind(this), this.onItemsError.bind(this));
        }

        onInfoError(iq) {
            if (iq === null) {
                Strophe.warn("disco#info timed out.");
            } else {
                Strophe.error("disco#info returned an error.")
            }
        }

        onDiscoItems(iq) {
            Strophe.info("got disco#items response.");
            this.discoItems = iq;

            if (this.conn.muc) {
                this.conn.muc.processDiscoItems(iq);
            }
            if (this.conn.pubsub) {
                this.conn.pubsub.processDiscoItems(iq);
            }
        }

        onItemsError(iq) {
            if (iq === null) {
                Strophe.warn("disco#info timed out.");
            } else {
                Strophe.error("disco#info returned an error.")
            }
        }

        init(connection: any) {
            Strophe.debug("init session plugin");
            this.conn = connection;
            this.jid = function () {
                return Strophe.getDomainFromJid(this.conn.jid);
            };
        }

        // called when connection status is changed
        statusChanged(status) {
            if (status === Strophe.Status.CONNECTED || status === Strophe.Status.ATTACHED) {

                // Get info
                var discoInfo = $iq({
                    type: 'get'
                }).c('query', {
                    xmlns: Strophe.NS.DISCO_INFO
                });

                Strophe.info("request info");

                this.conn.sendIQ(discoInfo, this.onDiscoInfo.bind(this), this.onInfoError.bind(this));
                //this.connection.addHandler(this.unhandledIq, null, 'iq', 'get', null, null);
            } else if (status === Strophe.Status.DISCONNECTED) {
                this.discoInfo = [];
            }
        }

        disconnect() {
            this.conn.disconnect();
        };

        unhandledIq(iq) {
            Strophe.info("Unhandled Iq");
            return true;
        }
    }
}

Strophe.addConnectionPlugin('session', (function() {
    var _session = new Xmpp.Session();

    return {
        init: (connection) => _session.init(connection),
        statusChanged: (status) => _session.statusChanged(status),
        disconnect: () => _session.disconnect(),
        unhandledIq: (iq) => _session.unhandledIq(iq)
    }
} ()))