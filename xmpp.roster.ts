/// <reference path="Scripts/ts/underscore-1.4.d.ts" />
/// <reference path="xpressive.ts" />
/// <reference path="xmpp.util.ts" />
/// <reference path="xmpp.roster.contact.ts" />
/// <reference path="Scripts/ts/jquery-1.8.d.ts" />

// Interface
interface IRoster {
    init(connection: any): void;
    statusChanged(status: string): void;
    chatTo(jid: string): IContact;
    chatToDirect(jid: string): IContact;
    findContact(jid: string): IContact;
    deleteContact(jid: string): void;
    addContact(jid: string, name?: string, groups?: string): void;
    modifyContact(jid: string, name?: string, groups?: string): void;
    subscribe(jid: string, name?: string, groups?: string): void;
    unsubscribe(jid: string): void;
}

// Module
module Xmpp {

    // Class  
    export class Roster implements IRoster {

        // local variables
        private conn: any;
        private contacts: IContacts;

        constructor () {
            this.contacts = null;
        }

        init(connection) {
            Strophe.debug("init roster plugin");

            this.conn = connection;
            this.contacts = new Xmpp.Contacts(connection);
        }

        // called when connection status is changed
        statusChanged(status) {
            try { 
                var roster_iq, contact;

                if (status === Strophe.Status.CONNECTED) {
                    this.contacts = new Xmpp.Contacts(this.conn);

                    // set up handlers for updates
                    this.conn.addHandler(this.contacts.rosterChanged.bind(this.contacts), Strophe.NS.ROSTER, "iq", "set");
                    this.conn.addHandler(this.contacts.presenceChanged.bind(this.contacts), null, "presence");

                    // build and send initial roster query
                    roster_iq = $iq({
                        type: "get"
                    }).c('query', {
                        xmlns: Strophe.NS.ROSTER
                    });

                    this.conn.sendIQ(roster_iq, (iq) => {
                        Strophe.info("roster_iq received.");

                        $(iq).find("item").each((index, item) => {
                            // build a new contact and add it to the roster
                            contact = new Xmpp.Contact(item);
                            // TODO move to prototype
                            this.contacts.list[$(item).attr('jid')] = contact;
                        });

                        // let user code know something happened
                        $(document).trigger('roster_changed', this.contacts);

                        // TODO find a way to fire an event to do this
                        this.conn.me.available();
                    });
                } else if (status === Strophe.Status.DISCONNECTED) {
                    // set all users offline
                    // TODO move to prototype
                    for (contact in this.contacts.list) {
                        this.contacts.list[contact].resources = {};
                    }

                    // notify user code
                    $(document).trigger('roster_changed', this.contacts);
                } 
            } catch (ex) { console.log(ex); }
        }

        chatToDirect(jid) {
            try {
                var contact = this.findContact(Strophe.getBareJidFromJid(jid));

                if (!contact) {
                    contact = new Xmpp.Contact(null, jid);
                }
                return contact;
            } catch (ex) { console.log(ex); }
        }

        chatTo(jid) {
            var contact = this.findContact(Strophe.getBareJidFromJid(jid));
            return contact;
        }

        findContact(jid) : IContact {
            for (var listJid in this.contacts.list) {
                if (listJid === jid)
                    return this.contacts.list[listJid];
            }
            return null;
        }

        // delete a contact from the roster
        deleteContact(jid) {
            try {
                var iq = $iq({
                    "type": "set"
                }).c("query", {
                    "xmlns": Strophe.NS.ROSTER
                }).c("item", {
                    "jid": jid,
                    "subscription": "remove"
                });
                this.conn.sendIQ(iq);
            } catch (ex) { console.log(ex); }
        }

        // add a contact to the roster
        addContact(jid: string, name?: string, groups?: string) {
            try {
                var iq = $iq({
                    "type": "set"
                }).c("query", {
                    "xmlns": Strophe.NS.ROSTER
                }).c("item", {
                    "name": name || "",
                    "jid": jid
                });
                var _groups = groups.split(" ");
                if (_groups && _groups.length > 0) {
                    $.each(_groups, function () {
                        if (this.length > 0)
                            iq.c("group").t(this).up();
                    });
                }
                this.conn.sendIQ(iq);
            } catch (ex) { console.log(ex); }
        }

        // modify a roster contact
        modifyContact(jid: string, name?: string, groups?: string) {
            this.addContact(jid, name, groups);
        }

        // subscribe to a new contact's presence
        subscribe(jid, name? , groups? ) {
            try {
                this.addContact(jid, name, groups);

                var presence = $pres({
                    "to": jid,
                    "type": "subscribe"
                });
                this.conn.send(presence);
            } catch (ex) { console.log(ex); }
        }

        // unsubscribe from a contact's presence
        unsubscribe(jid) {
            try {
                var presence = $pres({
                    to: jid,
                    "type": "unsubscribe"
                });
                this.conn.send(presence);

                this.deleteContact(jid);
            } catch (ex) { console.log(ex); }
        }
    }
}
// Local variables
declare var Xpressive: IXpressive;

// example roster plugin
Strophe.addConnectionPlugin('roster', (function() {
    var _roster = new Xmpp.Roster();

    return {
        init: (connection: any) => _roster.init(connection),
        statusChanged: (status: string) => _roster.statusChanged(status),
        chatTo: (jid: string) => _roster.chatTo(jid),
        chatToDirect: (jid: string) => _roster.chatToDirect(jid),
        findContact: (jid: string) => _roster.findContact(jid),
        deleteContact: (jid: string) => _roster.deleteContact(jid),
        addContact: (jid: string, name?: string, groups?: string) => _roster.addContact(jid, name, groups),
        modifyContact: (jid: string, name?: string, groups?: string) => _roster.modifyContact(jid, name, groups),
        subscribe: (jid: string, name?: string, groups?: string) => _roster.subscribe(jid, name, groups),
        unsubscribe: (jid: string) => _roster.unsubscribe(jid)
    }
} ()))
