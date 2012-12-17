var Xmpp;
(function (Xmpp) {
    var Room = (function () {
        function Room(jid, name, conn) {
            this.joined = false;
            this.isConfigured = true;
            this.chatSession = null;
            this.jid = Strophe.getBareJidFromJid(jid);
            this.myNickname = "";
            this.myAffiliation = "none";
            this.myRole = "none";
            this.connection = conn;
            this.roomName = name;
            this.roomInfoResponse = {
            };
            this.occupants = [];
            this.joined = false;
            this.presenceResponse = {
            };
            this.form = {
            };
            this.isConfigured = true;
            this.chatSession = null;
            Strophe.info("new room created: " + this.jid);
        }
        Room.prototype.canModifySubject = function () {
            var value;
            if(this.roomInfoResponse) {
                var fld = $(this.roomInfoResponse).find('field[var="muc#roominfo_subjectmod"]');
                if(fld) {
                    value = $(fld).find('value').text();
                    if(value === "1") {
                        return true;
                    }
                }
            }
            if(this.iAmAdmin()) {
                return true;
            }
            return false;
        };
        Room.prototype.getInfo = function () {
            Strophe.info("Room: get room info for: " + this.jid);
            var attrs = {
                xmlns: Strophe.NS.DISCO_INFO
            };
            var roomInfoIq = $iq({
                to: this.jid,
                type: 'get'
            }).c('query', attrs);
            this.connection.sendIQ(roomInfoIq, this.roomInfoResult.bind(this), this.roomInfoError.bind(this));
        };
        Room.prototype.roomInfoResult = function (iq) {
            Strophe.info("got room info for: " + this.jid);
            this.roomInfoResponse = iq;
            var name = $(iq).find('identity').attr('name');
            if(name && this.roomName !== name) {
                this.roomName = name;
                $(document).trigger("roomname_changed", this);
            }
            Strophe.info("Room Description: " + this.description());
            Strophe.info("Number Of Occupants: " + this.numberOfOccupants());
            this.form = Xmpp.Form.fromXML($(iq).find('x'));
            $(document).trigger("room_changed", this);
        };
        Room.prototype.roomInfoError = function () {
            Strophe.error("Room ERROR: for room info: " + this.jid);
        };
        Room.prototype.description = function () {
            var val = "xx";
            if(this.roomInfoResponse) {
                $(this.roomInfoResponse).find('x field').each(function () {
                    if($(this).attr('var') === "muc#roominfo_description") {
                        val = $(this).find('value').text();
                        return;
                    }
                });
            }
            return val;
        };
        Room.prototype.numberOfOccupants = function () {
            var val = -1;
            if(this.roomInfoResponse) {
                $(this.roomInfoResponse).find('x field').each(function () {
                    if($(this).attr('var') === "muc#roominfo_occupants") {
                        val = parseInt($(this).find('value').text());
                        return val;
                    }
                });
            }
            return val;
        };
        Room.prototype.rejoin = function () {
            this.chatSession = this.connection.chat.joinRoomChat(this);
        };
        Room.prototype.join = function (nickname, password) {
            if(this.chatSession) {
                $(document).trigger('set_focus_on_tab', this.jid);
                return;
            }
            Strophe.info("Room: join room: " + this.jid);
            this.myNickname = nickname;
            $(document).trigger('join_room', this);
            var pw = (password ? password.trim() : "");
            var presence = $pres({
                to: this.jid + "/" + this.myNickname
            }).c('x', {
                xmlns: Strophe.NS.MUC
            });
            if(pw.length > 0) {
                presence.c('password', null, pw);
            }
            var elem = this.connection.caps.createCapsNode().tree();
            presence.up().cnode(elem);
            this.connection.send(presence.tree());
            this.chatSession = this.connection.chat.joinRoomChat(this);
            this.getInfo();
        };
        Room.prototype.leave = function () {
            Strophe.info("leave room: " + this.jid);
            var leavePres = $pres({
                to: this.jid + "/" + this.myNickname,
                type: 'unavailable'
            });
            this.connection.send(leavePres);
            this.getInfo();
            this.chatSession = null;
            this.occupants = [];
        };
        Room.prototype.sendMessage = function (messageText) {
            Strophe.info("send message to room: " + this.jid);
            var message = $msg({
                to: this.jid,
                type: 'groupchat'
            }).c('body').t(messageText);
            this.connection.send(message);
        };
        Room.prototype.incomingMucMessage = function (message) {
            Strophe.info("got message for room: " + this.jid);
            var messageTime;
            var delay = $(message).find('delay');
            if(delay.length === 0) {
                delay = $(message).find('x');
            }
            if(delay.length !== 0) {
                var stamp = delay.attr('stamp');
                messageTime = new Date(stamp);
            }
            this.chatSession.recvMessage(message, messageTime);
            return messageTime;
        };
        Room.prototype.inviteReceived = function (from, fromName, reason, password) {
            Strophe.info("got invite for room: " + this.jid);
            $(document).trigger("prompt_for_invite_response", {
                "fromJid": from,
                "fromName": fromName,
                "reason": reason,
                "password": password,
                "roomJid": this.jid,
                "roomName": this.roomName,
                "accept": this.acceptInvite.bind(this),
                "decline": this.declineInvite.bind(this),
                "ignore": null
            });
        };
        Room.prototype.requiresPassword = function () {
            var isSecure = true;
            if(this.roomInfoResponse) {
                $(this.roomInfoResponse).find('feature').each(function () {
                    if($(this).attr('var') === "muc_unsecured") {
                        isSecure = false;
                        return;
                    }
                });
            }
            return isSecure;
        };
        Room.prototype.iAmModerator = function () {
            return (this.myRole === 'moderator');
        };
        Room.prototype.iAmOwner = function () {
            return (this.myAffiliation === 'owner');
        };
        Room.prototype.iAmMember = function () {
            var resp = (this.iAmModerator || this.myRole === "participant");
            return resp;
        };
        Room.prototype.iAmAdmin = function () {
            var resp = (this.iAmOwner || this.myAffiliation === 'administrator');
            return resp;
        };
        Room.prototype.iAmBanned = function () {
            return false;
        };
        Room.prototype.iHaveVoice = function () {
            return true;
        };
        Room.prototype.iCanInvite = function () {
            return true;
        };
        Room.prototype.queryOccupants = function () {
            var attrs, info;
            attrs = {
                xmlns: Strophe.NS.DISCO_ITEMS
            };
            info = $iq({
                from: this.connection.jid,
                to: this.jid,
                type: 'get'
            }).c('query', attrs);
            this.connection.sendIQ(info, this._occupantsInfo.bind(this), this._errorInfo.bind(this));
        };
        Room.prototype._occupantsInfo = function (iq) {
            Strophe.info("Room: got occupants info for: " + this.jid);
            var infoIq = $(iq);
        };
        Room.prototype._errorInfo = function (iq) {
            Strophe.info("Room ERROR: for occupants info for: " + this.jid);
            var errorIq = $(iq);
        };
        Room.prototype.addOccupant = function (jid, pres) {
            return this._addOccupant(jid, pres);
        };
        Room.prototype._addOccupant = function (jid, pres) {
            var occupant = this.findOccupant(jid);
            if(!occupant) {
                occupant = new Xmpp.Occupant(jid);
                this.occupants[occupant.nickname] = occupant;
            }
            occupant.presenceUpdate(pres);
            if(!occupant.isThisMe()) {
                $(document).trigger("someone_has_joined_room", occupant);
            }
            return occupant;
        };
        Room.prototype.findOccupant = function (jid) {
            var nickname = Strophe.getResourceFromJid(jid);
            return this.occupants[nickname];
        };
        Room.prototype.removeOccupant = function (jid) {
            Strophe.info("Room: remove occupant from room: " + jid);
            var nickname = Strophe.getResourceFromJid(jid);
            $(document).trigger("someone_has_left_room", this.occupants[nickname]);
            delete this.occupants[nickname];
            return true;
        };
        Room.prototype.updateOccupant = function (pres) {
            var occupantJid = $(pres).attr('from');
            Strophe.info("Room: update room occupant: " + occupantJid);
            return this._addOccupant(occupantJid, pres);
        };
        Room.prototype.invite = function () {
            $(document).trigger("send_invitation", {
                room: this,
                okHandler: this.sendInvite.bind(this)
            });
        };
        Room.prototype.sendInvite = function (data) {
            var msg = $msg({
                "to": this.jid
            }).c("x", {
                "xmlns": Strophe.NS.MUC_USER
            }).c("invite", {
                "to": data.jid
            });
            if(data.reason) {
                msg.c("reason").t(data.reason).up();
            }
            if(data.password) {
                msg.up().c("password").t(data.password);
            }
            this.connection.send(msg.tree());
        };
        Room.prototype.acceptInvite = function (nickname, password) {
            this.join(nickname, password);
        };
        Room.prototype.declineInvite = function (from, sender, reason) {
            var msg = $msg({
                "to": from
            }).c("x", {
                "xmlns": Strophe.NS.MUC_USER
            }).c("decline", {
                "to": sender
            });
            if(reason) {
                msg.c("reason").t(reason);
            }
            this.connection.send(msg.tree());
        };
        return Room;
    })();
    Xmpp.Room = Room;    
})(Xmpp || (Xmpp = {}));
//@ sourceMappingURL=xmpp.muc.room.js.map
