/// <reference path="xpressive.ts" />
/// <reference path="xmpp.util.ts" />
/// <reference path="Scripts/ts/jquery-1.8.d.ts" />

// Interfaces
interface IContact {
    jid: string;
    item: any;
    subscription: string;
    ask: string;
    groups: any;
    name: string;
    resources: any;
    vCard: any;
    chatSession: any;
    ptype: string;
    update(item: any): void;
    online(): bool;
    //chatTo(): void;
}

interface IContacts {
    list: IContact[];
    rosterChanged(iq: any): bool;
    presenceChanged(pres: any): bool;
}

declare var Xpressive: IXpressive;

module Xmpp {

    // Class
    export class Contact implements IContact {
        private _jid: string;
        private _item: any;
        private _subscription: string;
        private _ask: string;
        private _groups: any;
        private _name: string;
        private _resources: any;
        private _vCard: any;
        private _chatSession: IChatSession;
        private _ptype: string;

        get jid() {
            return this._jid;
        }
        get item() {
            return this._item;
        }
        get subscription() {
            return this._subscription;
        }
        get ask() {
            return this._ask;
        }
        get groups() {
            return this._groups;
        }
        get name() {
            return this._name;
        }
        get resources() {
            return this._resources;
        }
        get vCard() {
            return this._vCard;
        }
        get chatSession() {
            return this._chatSession;
        }
        set chatSession(value) {
            this._chatSession = value;
        }

        get ptype() {
            return this._ptype;
        }

        // Constructor
        constructor (item: any, jid?: string) {
            if (!item) {
                this._jid = jid;
                this._item = item;
                this._name = Strophe.getNodeFromJid(this.jid);
                this._subscription = "none";
                this._ask = "";
                this._groups = {};
            } else {
                this._jid = $(item).attr('jid');
                this._item = item;
                this._name = $(item).attr('name') || Strophe.getNodeFromJid(this.jid);
                this._subscription = $(item).attr('subscription') || "none";
                this._ask = $(item).attr('ask') || "";
                this._groups = $(item).find('group') || {};
            }
            Strophe.debug("Contact created for: " + this.jid)

            this._resources = {};
            this._vCard = {};
            this._chatSession = null;
            this._ptype = null;
        }

        // Instance member
        // compute whether user is online from their
        // list of resources
        online() {
            var result = false;
            for (var k in this.resources) {
                result = true;
                break;
            }
            return result;
        }

        //chatTo() {}

        update(item) {
            this._item = item;
            var _name = $(item).attr('name');

            Strophe.debug("Contact.update for: " + this.jid);

            if (_name !== undefined) {
                if (this.name !== _name) {
                    this.name = _name;
                    $(document).trigger('contactname_changed', this);
                }
            }
            var _subscription = item.attr('subscription');
            if (_subscription !== undefined) {
                this.subscription = _subscription;
            }
            var _ask = $(item).attr('ask');
            if (_ask !== undefined) {
                this.ask = _ask;
            }
            var _groups = $(item).find('group');
            if (_groups !== undefined) {
                this.groups = _groups;
            }
        }

        endChat() {
            var message = $msg({
                to: this.jid
            }).c("gone", {
                xmlns: Strophe.NS.CHATSTATES
            });

            //Xpressive.connection.send(message);
        }

        getVCard() {
            //TODO:
        }

        getGroups() {
            var _list = [];
            if (this.groups.length === 0) {
                return "none";
            }
            this.groups.each(function () {
                _list.push(this.textContent);
            })
            return _list.join(", ");
        }

        getInfo() {
            var ret = "offline";

            if (this.resources) {
                $.each(this.resources, function (key, resource) {
                    ret = "[" + key + "]";
                    ret += " Status: " + (resource.show || "online");
                    if (resource.status) {
                        ret += ": " + resource.status;
                    }
                    if (resource.timestamp !== undefined) {
                        ret += " Updated at: " + Xmpp.Util.formatDate(resource.timestamp, "{Hours:2}:{Minutes:2} on {Date}/{Month}/{FullYear}");
                    }
                    return;
                });
            }
            return ret;
        }

        toString() {
            return "jid:" + this.jid + ", name:" + this.name + ", subscription:" + this.subscription + ", groups:" + this.groups.toString();
        }
    }

    export class Contacts implements IContacts {
    
        private conn: any;
        public list: IContact[];

        constructor (connection: any) {
            this.conn = connection;
            this.list = [];
        }

        // called when roster udpates are received
        rosterChanged(iq) {
            var item: any = $(iq).find('item');
            var jid: string = item.attr('jid');
            var subscription: string = item.attr('subscription') || "";
            var ask: string = item.attr('ask') || "";
            var contact: IContact = null;
            var _list: any = {};

            Strophe.info("rosterChange for: " + jid + " [" + subscription + "]");

            // acknowledge receipt
            this.conn.send($iq({
                type: "result",
                id: $(iq).attr('id')
            }).tree());

            if (subscription === "remove") {
                // removing contact from roster
                contact = new Xmpp.Contact(item);
                delete this.list[jid];
            } else {
                contact = this.list[jid];
                if (!contact) {
                    // adding contact to roster
                    contact = new Xmpp.Contact(item);
                    this.list[jid] = contact;

                    if (ask === "" && subscription === "none") {
                        // send a presence(type=subscribe)
                        this.conn.send($pres({
                            to: jid,
                            type: 'subscribe'
                        }).tree());
                    } else {
                        Strophe.info("rosterChange ignored");
                    }
                } else {
                    contact.update(item);
                }
            }
            _list[jid] = contact;
            // notify user code of roster changes
            $(document).trigger("roster_changed", _list);

            return true;
        }

        // called when presence stanzas are received
        presenceChanged(presence) {
            var from = $(presence).attr("from");
            var jid = Strophe.getBareJidFromJid(from);

            if (jid === this.conn.me.myJid()) {
                // It's my presence so ignore it
                return true;
            }

            var resource = Strophe.getResourceFromJid(from);
            var ptype = $(presence).attr("type") || $(presence).find("show").text() || "available";

            Strophe.info("presenceChange for: " + from + " [" + ptype + "]");

            if (ptype === "error") {
                //TODO: ignore error presence for now
                return true;
            }
            var contact = this.list[jid];
            if (!contact) {
                // it might be a room
                if (this.conn.muc.isServer(jid)) {
                    //Xpressive.connection.muc.handlePresence(presence);
                    return true;
                }
                // This is someone we don't have on our roster so pop-up the dialog
                if (ptype === "subscribe") {
                    $(document).trigger("ask_subscription", jid);
                }
            } else {
                contact.ptype = ptype;

                if (ptype === "unavailable") {
                    // remove resource, contact went offline
                    try {
                        delete contact.resources[resource];
                    } catch (e) { }
                } else if (ptype === "subscribe") {
                    // this is someone we know about so accept request
                    this.conn.send($pres({
                        to: jid,
                        type: "subscribed"
                    }).tree());
                } else if (ptype === "unsubscribe") {
                    // this is someone we know about so accept request
                    this.conn.send($pres({
                        to: jid,
                        type: "unsubscribed"
                    }).tree());
                } else if (ptype === "subscribed") {
                    // ignore this
                } else {
                    // contact came online or changed status
                    if (resource) {
                        // make sure we have a resource string
                        var stamp = $(presence).find("delay").attr("stamp")
                        var time = stamp === undefined ? new Date() : new Date(stamp);

                        contact.resources[resource] = {
                            show: $(presence).find("show").text() || "online",
                            status: $(presence).find("status").text(),
                            timestamp: time
                        };
                    }
                }

                // notify user code of roster changes
                $(document).trigger("presence_changed", contact);
            }
            return true;
        }
    }
}