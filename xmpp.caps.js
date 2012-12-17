var Xmpp;
(function (Xmpp) {
    var Caps = (function () {
        function Caps() {
        }
        Caps.prototype.init = function (connection) {
            Strophe.debug("init caps plugin");
            this.conn = connection;
            Strophe.addNamespace('CAPS', "http://jabber.org/protocol/caps");
            if(this.conn.disco === void 0) {
                throw new Error("disco plugin required!");
            }
            if(b64_sha1 === void 0) {
                throw new Error("SHA-1 library required!");
            }
            this.conn.disco.addFeature(Strophe.NS.CAPS);
            this.conn.disco.addFeature(Strophe.NS.DISCO_INFO);
            if(this.conn.disco.hasIdentities) {
                return this.conn.disco.addIdentity("client", "pc", "XpressiveJS 0.1", "");
            }
        };
        Caps.prototype.addFeature = function (feature) {
            return this.conn.disco.addFeature(feature);
        };
        Caps.prototype.removeFeature = function (feature) {
            return this.conn.disco.removeFeature(feature);
        };
        Caps.prototype.sendPres = function () {
            return this.conn.send($pres().cnode(this.createCapsNode().tree()));
        };
        Caps.prototype.createCapsNode = function () {
            var node;
            if(this.conn.disco.hasIdentities) {
                node = this.conn.disco.getIdentity(0).name || "";
            } else {
                node = "dummyId.name";
            }
            return $build("c", {
                xmlns: Strophe.NS.CAPS,
                hash: "sha-1",
                node: node,
                ver: this.generateVerificationString()
            });
        };
        Caps.prototype.propertySort = function (array, property) {
            return array.sort(function (a, b) {
                if(a[property] > b[property]) {
                    return -1;
                } else {
                    return 1;
                }
            });
        };
        Caps.prototype.generateVerificationString = function () {
            var S, features, i, id, ids, k, key, ns, _i, _j, _k, _len, _len2, _len3, _ref, _ref2;
            ids = [];
            _ref = this.conn.disco.identities;
            for(_i = 0 , _len = _ref.length; _i < _len; _i++) {
                i = _ref[_i];
                ids.push(i);
            }
            features = [];
            _ref2 = this.conn.disco.features;
            for(_j = 0 , _len2 = _ref2.length; _j < _len2; _j++) {
                k = _ref2[_j];
                features.push(k);
            }
            S = "";
            this.propertySort(ids, "category");
            this.propertySort(ids, "type");
            this.propertySort(ids, "lang");
            for(key in ids) {
                id = ids[key];
                S += "" + id.category + "/" + id.type + "/" + id.lang + "/" + id.name + "<";
            }
            features.sort();
            for(_k = 0 , _len3 = features.length; _k < _len3; _k++) {
                ns = features[_k];
                S += "" + ns + "<";
            }
            return "" + (b64_sha1(S)) + "=";
        };
        return Caps;
    })();
    Xmpp.Caps = Caps;    
    var hexcase = 0;
    var b64pad = "";
    var chrsz = 8;
    function hex_sha1(s) {
        return binb2hex(core_sha1(str2binb(s), s.length * chrsz));
    }
    function b64_sha1(s) {
        return binb2b64(core_sha1(str2binb(s), s.length * chrsz));
    }
    function str_sha1(s) {
        return binb2str(core_sha1(str2binb(s), s.length * chrsz));
    }
    function hex_hmac_sha1(key, data) {
        return binb2hex(core_hmac_sha1(key, data));
    }
    function b64_hmac_sha1(key, data) {
        return binb2b64(core_hmac_sha1(key, data));
    }
    function str_hmac_sha1(key, data) {
        return binb2str(core_hmac_sha1(key, data));
    }
    function sha1_vm_test() {
        return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
    }
    function core_sha1(x, len) {
        x[len >> 5] |= 128 << (24 - len % 32);
        x[((len + 64 >> 9) << 4) + 15] = len;
        var w = Array(80);
        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;
        var e = -1009589776;
        for(var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;
            var olde = e;
            for(var j = 0; j < 80; j++) {
                if(j < 16) {
                    w[j] = x[i + j];
                } else {
                    w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
                }
                var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), safe_add(safe_add(e, w[j]), sha1_kt(j)));
                e = d;
                d = c;
                c = rol(b, 30);
                b = a;
                a = t;
            }
            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
            e = safe_add(e, olde);
        }
        return Array(a, b, c, d, e);
    }
    function sha1_ft(t, b, c, d) {
        if(t < 20) {
            return (b & c) | ((~b) & d);
        }
        if(t < 40) {
            return b ^ c ^ d;
        }
        if(t < 60) {
            return (b & c) | (b & d) | (c & d);
        }
        return b ^ c ^ d;
    }
    function sha1_kt(t) {
        return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 : (t < 60) ? -1894007588 : -899497514;
    }
    function core_hmac_sha1(key, data) {
        var bkey = str2binb(key);
        if(bkey.length > 16) {
            bkey = core_sha1(bkey, key.length * chrsz);
        }
        var ipad = Array(16), opad = Array(16);
        for(var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 909522486;
            opad[i] = bkey[i] ^ 1549556828;
        }
        var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
        return core_sha1(opad.concat(hash), 512 + 160);
    }
    function safe_add(x, y) {
        var lsw = (x & 65535) + (y & 65535);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 65535);
    }
    function rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }
    function str2binb(str) {
        var bin = Array();
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < str.length * chrsz; i += chrsz) {
            bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i % 32);
        }
        return bin;
    }
    function binb2str(bin) {
        var str = "";
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < bin.length * 32; i += chrsz) {
            str += String.fromCharCode((bin[i >> 5] >>> (32 - chrsz - i % 32)) & mask);
        }
        return str;
    }
    function binb2hex(binarray) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var str = "";
        for(var i = 0; i < binarray.length * 4; i++) {
            str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 15) + hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 15);
        }
        return str;
    }
    function binb2b64(binarray) {
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var str = "";
        for(var i = 0; i < binarray.length * 4; i += 3) {
            var triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 255) << 16) | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 255) << 8) | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 255);
            for(var j = 0; j < 4; j++) {
                if(i * 8 + j * 6 > binarray.length * 32) {
                    str += b64pad;
                } else {
                    str += tab.charAt((triplet >> 6 * (3 - j)) & 63);
                }
            }
        }
        return str;
    }
})(Xmpp || (Xmpp = {}));
Strophe.addConnectionPlugin('caps', ((function () {
    var _caps = new Xmpp.Caps();
    return {
        init: function (connection) {
            return _caps.init(connection);
        },
        removeFeature: function (feature) {
            return _caps.removeFeature(feature);
        },
        addFeature: function (feature) {
            return _caps.addFeature(feature);
        },
        sendPres: function () {
            return _caps.sendPres();
        },
        generateVerificationString: function () {
            return _caps.generateVerificationString();
        },
        createCapsNode: function () {
            return _caps.createCapsNode();
        }
    };
})()));
//@ sourceMappingURL=xmpp.caps.js.map
