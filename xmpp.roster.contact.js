var Xmpp;
(function (Xmpp) {
    var Contact = (function () {
        function Contact(item, jid) {
            if(!item) {
                this._jid = jid;
                this._item = item;
                this._name = Strophe.getNodeFromJid(this.jid);
                this._subscription = "none";
                this._ask = "";
                this._groups = {
                };
            } else {
                this._jid = $(item).attr('jid');
                this._item = item;
                this._name = $(item).attr('name') || Strophe.getNodeFromJid(this.jid);
                this._subscription = $(item).attr('subscription') || "none";
                this._ask = $(item).attr('ask') || "";
                this._groups = $(item).find('group') || {
                };
            }
            Strophe.debug("Contact created for: " + this.jid);
            this._resources = {
            };
            this._vCard = {
            };
            this._chatSession = null;
            this._ptype = null;
        }
        Object.defineProperty(Contact.prototype, "jid", {
            get: function () {
                return this._jid;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Contact.prototype, "item", {
            get: function () {
                return this._item;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Contact.prototype, "subscription", {
            get: function () {
                return this._subscription;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Contact.prototype, "ask", {
            get: function () {
                return this._ask;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Contact.prototype, "groups", {
            get: function () {
                return this._groups;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Contact.prototype, "name", {
            get: function () {
                return this._name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Contact.prototype, "resources", {
            get: function () {
                return this._resources;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Contact.prototype, "vCard", {
            get: function () {
                return this._vCard;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Contact.prototype, "chatSession", {
            get: function () {
                return this._chatSession;
            },
            set: function (value) {
                this._chatSession = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Contact.prototype, "ptype", {
            get: function () {
                return this._ptype;
            },
            enumerable: true,
            configurable: true
        });
        Contact.prototype.online = function () {
            var result = false;
            for(var k in this.resources) {
                result = true;
                break;
            }
            return result;
        };
        Contact.prototype.update = function (item) {
            this._item = item;
            var _name = $(item).attr('name');
            Strophe.debug("Contact.update for: " + this.jid);
            if(_name !== undefined) {
                if(this.name !== _name) {
                    this.name = _name;
                    $(document).trigger('contactname_changed', this);
                }
            }
            var _subscription = item.attr('subscription');
            if(_subscription !== undefined) {
                this.subscription = _subscription;
            }
            var _ask = $(item).attr('ask');
            if(_ask !== undefined) {
                this.ask = _ask;
            }
            var _groups = $(item).find('group');
            if(_groups !== undefined) {
                this.groups = _groups;
            }
        };
        Contact.prototype.endChat = function () {
            var message = $msg({
                to: this.jid
            }).c("gone", {
                xmlns: Strophe.NS.CHATSTATES
            });
        };
        Contact.prototype.getVCard = function () {
        };
        Contact.prototype.getGroups = function () {
            var _list = [];
            if(this.groups.length === 0) {
                return "none";
            }
            this.groups.each(function () {
                _list.push(this.textContent);
            });
            return _list.join(", ");
        };
        Contact.prototype.getInfo = function () {
            var ret = "offline";
            if(this.resources) {
                $.each(this.resources, function (key, resource) {
                    ret = "[" + key + "]";
                    ret += " Status: " + (resource.show || "online");
                    if(resource.status) {
                        ret += ": " + resource.status;
                    }
                    if(resource.timestamp !== undefined) {
                        ret += " Updated at: " + Xmpp.Util.formatDate(resource.timestamp, "{Hours:2}:{Minutes:2} on {Date}/{Month}/{FullYear}");
                    }
                    return;
                });
            }
            return ret;
        };
        Contact.prototype.toString = function () {
            return "jid:" + this.jid + ", name:" + this.name + ", subscription:" + this.subscription + ", groups:" + this.groups.toString();
        };
        return Contact;
    })();
    Xmpp.Contact = Contact;    
    var Contacts = (function () {
        function Contacts(connection) {
            this.conn = connection;
            this.list = [];
        }
        Contacts.prototype.rosterChanged = function (iq) {
            var item = $(iq).find('item');
            var jid = item.attr('jid');
            var subscription = item.attr('subscription') || "";
            var ask = item.attr('ask') || "";
            var contact = null;
            var _list = {
            };
            Strophe.info("rosterChange for: " + jid + " [" + subscription + "]");
            this.conn.send($iq({
                type: "result",
                id: $(iq).attr('id')
            }).tree());
            if(subscription === "remove") {
                contact = new Xmpp.Contact(item);
                delete this.list[jid];
            } else {
                contact = this.list[jid];
                if(!contact) {
                    contact = new Xmpp.Contact(item);
                    this.list[jid] = contact;
                    if(ask === "" && subscription === "none") {
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
            $(document).trigger("roster_changed", _list);
            return true;
        };
        Contacts.prototype.presenceChanged = function (presence) {
            var from = $(presence).attr("from");
            var jid = Strophe.getBareJidFromJid(from);
            if(jid === this.conn.me.myJid()) {
                return true;
            }
            var resource = Strophe.getResourceFromJid(from);
            var ptype = $(presence).attr("type") || $(presence).find("show").text() || "available";
            Strophe.info("presenceChange for: " + from + " [" + ptype + "]");
            if(ptype === "error") {
                return true;
            }
            var contact = this.list[jid];
            if(!contact) {
                if(this.conn.muc.isServer(jid)) {
                    return true;
                }
                if(ptype === "subscribe") {
                    $(document).trigger("ask_subscription", jid);
                }
            } else {
                contact.ptype = ptype;
                if(ptype === "unavailable") {
                    try  {
                        delete contact.resources[resource];
                    } catch (e) {
                    }
                } else {
                    if(ptype === "subscribe") {
                        this.conn.send($pres({
                            to: jid,
                            type: "subscribed"
                        }).tree());
                    } else {
                        if(ptype === "unsubscribe") {
                            this.conn.send($pres({
                                to: jid,
                                type: "unsubscribed"
                            }).tree());
                        } else {
                            if(ptype === "subscribed") {
                            } else {
                                if(resource) {
                                    var stamp = $(presence).find("delay").attr("stamp");
                                    var time = stamp === undefined ? new Date() : new Date(stamp);
                                    contact.resources[resource] = {
                                        show: $(presence).find("show").text() || "online",
                                        status: $(presence).find("status").text(),
                                        timestamp: time
                                    };
                                }
                            }
                        }
                    }
                }
                $(document).trigger("presence_changed", contact);
            }
            return true;
        };
        return Contacts;
    })();
    Xmpp.Contacts = Contacts;    
})(Xmpp || (Xmpp = {}));
