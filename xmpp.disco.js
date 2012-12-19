var Xmpp;
(function (Xmpp) {
    var Disco = (function () {
        function Disco() {
            this._connection = null;
        }
        Disco.prototype.init = function (connection) {
            Strophe.debug("init disco plugin");
            this._connection = connection;
            this._identities = [];
            this._features = [];
            this._items = [];
            this._connection.addHandler(this._onDiscoInfo.bind(this), Strophe.NS.DISCO_INFO, 'iq', 'get', null, null);
            this._connection.addHandler(this._onDiscoItems.bind(this), Strophe.NS.DISCO_ITEMS, 'iq', 'get', null, null);
        };
        Disco.prototype.addIdentity = function (category, type, name, lang) {
            for(var i = 0; i < this._identities.length; i++) {
                if(this._identities[i].category == category && this._identities[i].type == type && this._identities[i].name == name && this._identities[i].lang == lang) {
                    return false;
                }
            }
            this._identities.push({
                category: category,
                type: type,
                name: name,
                lang: lang
            });
            return true;
        };
        Disco.prototype.addFeature = function (var_name) {
            for(var i = 0; i < this._features.length; i++) {
                if(this._features[i] == var_name) {
                    return false;
                }
            }
            this._features.push(var_name);
            return true;
        };
        Disco.prototype.removeFeature = function (var_name) {
            for(var i = 0; i < this._features.length; i++) {
                if(this._features[i] === var_name) {
                    this._features.splice(i, 1);
                    return true;
                }
            }
            return false;
        };
        Disco.prototype.addItem = function (jid, name, node, call_back) {
            if(node && !call_back) {
                return false;
            }
            this._items.push({
                jid: jid,
                name: name,
                node: node,
                call_back: call_back
            });
            return true;
        };
        Disco.prototype.info = function (jid, node, success, error, timeout) {
            var attrs = {
                xmlns: Strophe.NS.DISCO_INFO
            };
            if(node) {
                attrs["node"] = node;
            }
            var info = $iq({
                from: this._connection.jid,
                to: jid,
                type: 'get'
            }).c('query', attrs);
            this._connection.sendIQ(info, success, error, timeout);
        };
        Disco.prototype.items = function (jid, node, success, error, timeout) {
            var attrs = {
                xmlns: Strophe.NS.DISCO_ITEMS
            };
            if(node) {
                attrs["node"] = node;
            }
            var items = $iq({
                from: this._connection.jid,
                to: jid,
                type: 'get'
            }).c('query', attrs);
            this._connection.sendIQ(items, success, error, timeout);
        };
        Disco.prototype.hasIdentities = function () {
            return (this._identities.length > 0);
        };
        Disco.prototype.getIdentity = function (index) {
            if(this._identities.length > 0) {
                return this._identities[index];
            } else {
                return null;
            }
        };
        Disco.prototype.getIdentities = function () {
            return this._identities;
        };
        Disco.prototype.getFeatures = function () {
            return this._features;
        };
        Disco.prototype._buildIQResult = function (stanza, query_attrs) {
            var id = stanza.getAttribute('id');
            var from = stanza.getAttribute('from');
            var iqresult = $iq({
                type: 'result',
                id: id
            });
            if(from !== null) {
                iqresult.attrs({
                    to: from
                });
            }
            return iqresult.c('query', query_attrs);
        };
        Disco.prototype._onDiscoInfo = function (stanza) {
            var node = stanza.getElementsByTagName('query')[0].getAttribute('node');
            var attrs = {
                xmlns: Strophe.NS.DISCO_INFO
            };
            if(node) {
                attrs["node"] = node;
            }
            var iqresult = this._buildIQResult(stanza, attrs);
            for(var i = 0; i < this._identities.length; i++) {
                attrs["category"] = this._identities[i].category , attrs["type"] = this._identities[i].type;
                if(this._identities[i].name) {
                    attrs["name"] = this._identities[i].name;
                }
                if(this._identities[i].lang) {
                    attrs['xml:lang'] = this._identities[i].lang;
                }
                iqresult.c('identity', attrs).up();
            }
            for(var i = 0; i < this._features.length; i++) {
                iqresult.c('feature', {
                    'var': this._features[i]
                }).up();
            }
            this._connection.send(iqresult.tree());
            return true;
        };
        Disco.prototype._onDiscoItems = function (stanza) {
            var query_attrs = {
                xmlns: Strophe.NS.DISCO_ITEMS
            };
            var items;
            var node = stanza.getElementsByTagName('query')[0].getAttribute('node');
            if(node) {
                query_attrs["node"] = node;
                items = [];
                for(var i = 0; i < this._items.length; i++) {
                    if(this._items[i].node == node) {
                        items = this._items[i].call_back(stanza);
                        break;
                    }
                }
            } else {
                items = this._items;
            }
            var iqresult = this._buildIQResult(stanza, query_attrs);
            for(var i = 0; i < items.length; i++) {
                var attrs = {
                    jid: items[i].jid
                };
                if(items[i].name) {
                    attrs["name"] = items[i].name;
                }
                if(items[i].node) {
                    attrs["node"] = items[i].node;
                }
                iqresult.c('item', attrs).up();
            }
            this._connection.send(iqresult.tree());
            return true;
        };
        return Disco;
    })();
    Xmpp.Disco = Disco;    
})(Xmpp || (Xmpp = {}));
Strophe.addConnectionPlugin('disco', ((function () {
    var _disco = new Xmpp.Disco();
    return {
        init: function (connection) {
            return _disco.init(connection);
        },
        addIdentity: function (category, type, name, lang) {
            return _disco.addIdentity(category, type, name, lang);
        },
        addFeature: function (name) {
            return _disco.addFeature(name);
        },
        removeFeature: function (name) {
            return _disco.removeFeature(name);
        },
        items: function (jid, node, success, error, timeout) {
            return _disco.items(jid, node, success, error, timeout);
        },
        addItem: function (jid, name, node, call_back) {
            return _disco.addItem(jid, name, node, call_back);
        },
        info: function (jid, node, success, error, timeout) {
            return _disco.info(jid, node, success, error, timeout);
        },
        hasIdentities: function () {
            return _disco.hasIdentities();
        },
        getIdentity: function (index) {
            return _disco.getIdentity(index);
        },
        identities: function () {
            return _disco.getIdentities();
        },
        features: function () {
            return _disco.getFeatures();
        }
    };
})()));
