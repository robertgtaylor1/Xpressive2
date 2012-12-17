var Xmpp;
(function (Xmpp) {
    var Roster = (function () {
        function Roster() {
            this.contacts = null;
        }
        Roster.prototype.init = function (connection) {
            Strophe.debug("init roster plugin");
            this.conn = connection;
            this.contacts = new Xmpp.Contacts(connection);
        };
        Roster.prototype.statusChanged = function (status) {
            var _this = this;
            try  {
                var roster_iq, contact;
                if(status === Strophe.Status.CONNECTED) {
                    this.contacts = new Xmpp.Contacts(this.conn);
                    this.conn.addHandler(this.contacts.rosterChanged.bind(this.contacts), Strophe.NS.ROSTER, "iq", "set");
                    this.conn.addHandler(this.contacts.presenceChanged.bind(this.contacts), null, "presence");
                    roster_iq = $iq({
                        type: "get"
                    }).c('query', {
                        xmlns: Strophe.NS.ROSTER
                    });
                    this.conn.sendIQ(roster_iq, function (iq) {
                        Strophe.info("roster_iq received.");
                        $(iq).find("item").each(function (index, item) {
                            contact = new Xmpp.Contact(item);
                            _this.contacts.list[$(item).attr('jid')] = contact;
                        });
                        $(document).trigger('roster_changed', _this.contacts);
                        _this.conn.me.available();
                    });
                } else {
                    if(status === Strophe.Status.DISCONNECTED) {
                        for(contact in this.contacts.list) {
                            this.contacts.list[contact].resources = {
                            };
                        }
                        $(document).trigger('roster_changed', this.contacts);
                    }
                }
            } catch (ex) {
                console.log(ex);
            }
        };
        Roster.prototype.chatToDirect = function (jid) {
            try  {
                var contact = this.findContact(Strophe.getBareJidFromJid(jid));
                if(!contact) {
                    contact = new Xmpp.Contact(null, jid);
                }
                return contact;
            } catch (ex) {
                console.log(ex);
            }
        };
        Roster.prototype.chatTo = function (jid) {
            var contact = this.findContact(Strophe.getBareJidFromJid(jid));
            return contact;
        };
        Roster.prototype.findContact = function (jid) {
            for(var listJid in this.contacts.list) {
                if(listJid === jid) {
                    return this.contacts.list[listJid];
                }
            }
            return null;
        };
        Roster.prototype.deleteContact = function (jid) {
            try  {
                var iq = $iq({
                    "type": "set"
                }).c("query", {
                    "xmlns": Strophe.NS.ROSTER
                }).c("item", {
                    "jid": jid,
                    "subscription": "remove"
                });
                this.conn.sendIQ(iq);
            } catch (ex) {
                console.log(ex);
            }
        };
        Roster.prototype.addContact = function (jid, name, groups) {
            try  {
                var iq = $iq({
                    "type": "set"
                }).c("query", {
                    "xmlns": Strophe.NS.ROSTER
                }).c("item", {
                    "name": name || "",
                    "jid": jid
                });
                var _groups = groups.split(" ");
                if(_groups && _groups.length > 0) {
                    $.each(_groups, function () {
                        if(this.length > 0) {
                            iq.c("group").t(this).up();
                        }
                    });
                }
                this.conn.sendIQ(iq);
            } catch (ex) {
                console.log(ex);
            }
        };
        Roster.prototype.modifyContact = function (jid, name, groups) {
            this.addContact(jid, name, groups);
        };
        Roster.prototype.subscribe = function (jid, name, groups) {
            try  {
                this.addContact(jid, name, groups);
                var presence = $pres({
                    "to": jid,
                    "type": "subscribe"
                });
                this.conn.send(presence);
            } catch (ex) {
                console.log(ex);
            }
        };
        Roster.prototype.unsubscribe = function (jid) {
            try  {
                var presence = $pres({
                    to: jid,
                    "type": "unsubscribe"
                });
                this.conn.send(presence);
                this.deleteContact(jid);
            } catch (ex) {
                console.log(ex);
            }
        };
        return Roster;
    })();
    Xmpp.Roster = Roster;    
})(Xmpp || (Xmpp = {}));
Strophe.addConnectionPlugin('roster', ((function () {
    var _roster = new Xmpp.Roster();
    return {
        init: function (connection) {
            return _roster.init(connection);
        },
        statusChanged: function (status) {
            return _roster.statusChanged(status);
        },
        chatTo: function (jid) {
            return _roster.chatTo(jid);
        },
        chatToDirect: function (jid) {
            return _roster.chatToDirect(jid);
        },
        findContact: function (jid) {
            return _roster.findContact(jid);
        },
        deleteContact: function (jid) {
            return _roster.deleteContact(jid);
        },
        addContact: function (jid, name, groups) {
            return _roster.addContact(jid, name, groups);
        },
        modifyContact: function (jid, name, groups) {
            return _roster.modifyContact(jid, name, groups);
        },
        subscribe: function (jid, name, groups) {
            return _roster.subscribe(jid, name, groups);
        },
        unsubscribe: function (jid) {
            return _roster.unsubscribe(jid);
        }
    };
})()));
//@ sourceMappingURL=xmpp.roster.js.map
