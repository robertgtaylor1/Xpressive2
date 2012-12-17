var Xmpp;
(function (Xmpp) {
    var Occupant = (function () {
        function Occupant(jid) {
            this.jid = jid;
            this.item = {
            };
            this.fullJid = jid;
            this.show = "";
            this.status = "";
            this.thisIsMe = false;
            this.item = {
            };
            this.fullJid = jid;
            this.capabilities = null;
            this.show = "";
            this.status = "";
            this.thisIsMe = false;
        }
        Object.defineProperty(Occupant.prototype, "nickname", {
            get: function () {
                return Strophe.getResourceFromJid(this.fullJid);
            },
            enumerable: true,
            configurable: true
        });
        Occupant.prototype.getStatus = function () {
            if(this.role === 'none') {
                return 'unavailable';
            }
            return this.status;
        };
        Object.defineProperty(Occupant.prototype, "affiliation", {
            get: function () {
                var _affiliation = "none";
                if(this.item) {
                    _affiliation = this.item.attr('affiliation') || "none";
                }
                return _affiliation;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Occupant.prototype, "role", {
            get: function () {
                var _role = "none";
                if(this.item) {
                    _role = this.item.attr('role') || "none";
                }
                return _role;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Occupant.prototype, "realJid", {
            get: function () {
                return this.item ? this.item.attr('jid') || null : null;
            },
            enumerable: true,
            configurable: true
        });
        Occupant.prototype.isThisMe = function () {
            return this.thisIsMe;
        };
        Occupant.prototype.startChat = function (jid) {
            var myName = Strophe.getResourceFromJid(jid);
        };
        Occupant.prototype.presenceUpdate = function (pres) {
            this.item = pres.find('item');
            var capsElem = pres.find('c');
            if(capsElem && capsElem.length > 0) {
                this.capabilitiesUpdate(capsElem);
            }
            var statusElem = $(pres).find('status');
            if(statusElem && statusElem.length > 0) {
                this.status = statusElem.text();
            }
            var showElem = $(pres).find('show');
            if(showElem && showElem.length > 0) {
                this.show = showElem.text();
            }
            var xElem = $(pres).find("x status[code='110']");
            if(xElem && xElem.length > 0) {
                this.thisIsMe = true;
            }
            if(this.thisIsMe) {
                $(document).trigger("update_my_room_info", {
                    "jid": this.fullJid,
                    "affiliation": this.affiliation,
                    "role": this.role
                });
            }
        };
        Occupant.prototype.capabilitiesUpdate = function (caps) {
            this.capabilities = new Xmpp.Capabilities(caps);
        };
        Occupant.prototype.toString = function () {
            return "Occupant: Nickname=" + this.nickname + ", " + "RealJid=" + this.realJid + ", " + "isThisMe=" + this.isThisMe() + ", " + "affiliation=" + this.affiliation + ", " + "role=" + this.role + ", " + "status=" + this.getStatus() + ", " + "show=" + this.show + ". ";
        };
        return Occupant;
    })();
    Xmpp.Occupant = Occupant;    
})(Xmpp || (Xmpp = {}));
