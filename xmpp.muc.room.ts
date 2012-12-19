/// <reference path="xmpp.xdata.ts" />
/// <reference path="xmpp.muc.occupant.ts" />
/// <reference path="xpressive.ts" />

// Interface
interface IRoom {
    roomName: string;
    jid: string;
    isConfigured: bool;
    myNickname: string;
    myAffiliation: string;
    myRole: string;
    canModifySubject(): bool;
    getInfo(): void;
    description(): string;
    numberOfOccupants(): number;
    rejoin(): void;
    join(nickname: string, password: string): void;
    leave(): void;
    incomingMucMessage(message: any): Date;
    sendMessage(messageText: string): void;
    requiresPassword(): bool;
    iAmModerator(): bool;
    iAmOwner(): bool;
    iAmMember(): bool;
    iAmAdmin(): bool;
    iAmBanned(): bool;
    iHaveVoice(): bool;
    queryOccupants(): void;
    addOccupant(jid: string, pres: any): IOccupant;
    findOccupant(jid: string): IOccupant;
    removeOccupant(jid: string): bool;
    updateOccupant(pres: any): IOccupant;
    invite(): void;
    sendInvite(data): void;
    inviteReceived(from: string, fromName: string, reason: string, password: string): void;
    acceptInvite(nickname: string, password: string): void;
    declineInvite(from: string, sender: string, reasonstring): void;
}

// Module
module Xmpp {

    // Class
    export class Room implements IRoom {
        public jid: string;
        public myNickname: string;
        public myAffiliation: string;
        public myRole: string;
        private connection: any;
        public roomName: string;
        private roomInfoResponse: any;
        private occupants: IOccupant[];
        private joined = false;
        private presenceResponse: any;
        private form: any;
        public isConfigured = true;
        private chatSession = null;

        // Constructor
        constructor(jid, name, conn) {
            this.jid = Strophe.getBareJidFromJid(jid);
            this.myNickname = "";
            this.myAffiliation = "none";
            this.myRole = "none";
            this.connection = conn;
            this.roomName = name;
            this.roomInfoResponse = {};
            this.occupants = [];
            this.joined = false;
            this.presenceResponse = {};
            this.form = {};
            this.isConfigured = true;
            this.chatSession = null;
            Strophe.info("new room created: " + this.jid);
        }

        canModifySubject() {
            var value: string;
            if (this.roomInfoResponse) {
                var fld = $(this.roomInfoResponse).find('field[var="muc#roominfo_subjectmod"]');
                if (fld) {
                    value = $(fld).find('value').text();
                    if (value === "1")
                        return true;
                }
            }
            if (this.iAmAdmin())
                return true;
            return false;
        }

        getInfo() {
            Strophe.info("Room: get room info for: " + this.jid);
            var attrs = {
                xmlns: Strophe.NS.DISCO_INFO
            };
            var roomInfoIq = $iq({
                to: this.jid,
                type: 'get'
            }).c('query', attrs);

            this.connection.sendIQ(roomInfoIq, this.roomInfoResult.bind(this), this.roomInfoError.bind(this));
        }

        roomInfoResult(iq) {
            Strophe.info("got room info for: " + this.jid);
            this.roomInfoResponse = iq;
            var name = $(iq).find('identity').attr('name');
            if (name && this.roomName !== name) {
                this.roomName = name;
                $(document).trigger("roomname_changed", this);
            }
            Strophe.info("Room Description: " + this.description());
            Strophe.info("Number Of Occupants: " + this.numberOfOccupants());

            this.form = Xmpp.Form.fromXML($(iq).find('x'));

            // notify user code of room change
            $(document).trigger("room_changed", this);
        }

        roomInfoError() {
            Strophe.error("Room ERROR: for room info: " + this.jid);
        }

        description() {
            var val = "xx";
            if (this.roomInfoResponse) {
                $(this.roomInfoResponse).find('x field').each(function () {
                    if ($(this).attr('var') === "muc#roominfo_description") {
                        val = $(this).find('value').text();
                        return;
                    }
                });
            }
            return val;
        }

        numberOfOccupants() {
            var val = -1;
            if (this.roomInfoResponse) {
                $(this.roomInfoResponse).find('x field').each(function () {
                    if ($(this).attr('var') === "muc#roominfo_occupants") {
                        val = parseInt($(this).find('value').text());
                        return val;
                    }
                });
            }
            return val;
        }

        // This function is used after a room is created as you are
        // automatically added to the room by the serever and don't
        // have to send another presence stanza.
        rejoin() {
            this.chatSession = this.connection.chat.joinRoomChat(this);
        }

        join(nickname, password) {
            if (this.chatSession) {
                $(document).trigger('set_focus_on_tab', this.jid);
                return;
            }
            Strophe.info("Room: join room: " + this.jid);

            this.myNickname = nickname;

            $(document).trigger('join_room', this);

            var pw = (password ? password.trim() : "");
            var presence = $pres({
                to: this.jid + "/" + this.myNickname
            }).c('x', { xmlns: Strophe.NS.MUC });
            if (pw.length > 0) {
                presence.c('password', null, pw);
            }

            var elem = this.connection.caps.createCapsNode().tree();
            presence.up().cnode(elem);

            this.connection.send(presence.tree());
            this.chatSession = this.connection.chat.joinRoomChat(this);
            this.getInfo();
        }

        // called by Session.endChat
        leave() {
            Strophe.info("leave room: " + this.jid);
            var leavePres = $pres({
                to: this.jid + "/" + this.myNickname,
                type: 'unavailable'
            });
            this.connection.send(leavePres);
            this.getInfo();
            this.chatSession = null;
            this.occupants = [];
        }

        sendMessage(messageText) {
            Strophe.info("send message to room: " + this.jid);

            var message = $msg({
                to: this.jid,
                type: 'groupchat'
            }).c('body').t(messageText);

            this.connection.send(message);
        }

        incomingMucMessage(message) {
            Strophe.info("got message for room: " + this.jid);
            var messageTime: Date;

            var delay = $(message).find('delay');
            if (delay.length === 0) {
                delay = $(message).find('x');
            }
            if (delay.length !== 0) {
                var stamp = delay.attr('stamp');
                messageTime = new Date(stamp);
            }

            this.chatSession.recvMessage(message, messageTime);
            return messageTime;
        }

        inviteReceived(from, fromName, reason, password) {
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
            })
        }

        requiresPassword() {
            var isSecure = true;
            if (this.roomInfoResponse) {
                $(this.roomInfoResponse).find('feature').each(function () {
                    if ($(this).attr('var') === "muc_unsecured") {
                        isSecure = false;
                        return;
                    }
                });
            }
            return isSecure;
        }

        iAmModerator() {
            return (this.myRole === 'moderator');
        }

        iAmOwner() {
            return (this.myAffiliation === 'owner');
        }

        iAmMember() {
            var resp: bool = (this.iAmModerator || this.myRole === "participant");
            return resp;
        }

        iAmAdmin() {
            var resp: bool = (this.iAmOwner || this.myAffiliation === 'administrator');
            return resp;
        }

        iAmBanned() {
            return false;
        }

        iHaveVoice() {
            return true;
        }

        iCanInvite() {
            return true;
        }

        queryOccupants() {
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
        }

        _occupantsInfo(iq) {
            Strophe.info("Room: got occupants info for: " + this.jid);
            var infoIq = $(iq);
        }

        _errorInfo(iq) {
            Strophe.info("Room ERROR: for occupants info for: " + this.jid);
            var errorIq = $(iq);
        }

        addOccupant(jid: string, pres) {
            return this._addOccupant(jid, pres);
        }

        _addOccupant(jid: string, pres: any): IOccupant {
            var occupant = this.findOccupant(jid);
            if (!occupant) {
                occupant = new Xmpp.Occupant(jid);
                this.occupants[occupant.nickname] = occupant;
            }
            occupant.presenceUpdate(pres);
            if (!occupant.isThisMe()) {
                // fire joined room event
                $(document).trigger("someone_has_joined_room", occupant);
            }
            return occupant;
        }

        findOccupant(jid: string) {
            var nickname = Strophe.getResourceFromJid(jid);
            return this.occupants[nickname];
        }

        removeOccupant(jid) {
            Strophe.info("Room: remove occupant from room: " + jid);
            // fire left room event
            var nickname = Strophe.getResourceFromJid(jid);
            $(document).trigger("someone_has_left_room", this.occupants[nickname]);
            delete this.occupants[nickname];
            return true;
        }

        updateOccupant(pres) {
            var occupantJid = $(pres).attr('from');
            Strophe.info("Room: update room occupant: " + occupantJid);
            return this._addOccupant(occupantJid, pres);
        }

        invite() {
            $(document).trigger("send_invitation", {
                room: this,
                okHandler: this.sendInvite.bind(this)
            });
        }

        sendInvite(data) {
            var msg = $msg({
                "to": this.jid
            }).c("x", {
                "xmlns": Strophe.NS.MUC_USER
            }).c("invite", {
                "to": data.jid
            });

            if (data.reason) {
                msg.c("reason").t(data.reason).up();
            }

            if (data.password) {
                msg.up().c("password").t(data.password);
            }

            this.connection.send(msg.tree());
        }

        acceptInvite(nickname, password) {
            this.join(nickname, password);
        }

        declineInvite(from, sender, reason) {
            var msg = $msg({
                "to": from
            }).c("x", {
                "xmlns": Strophe.NS.MUC_USER
            }).c("decline", {
                "to": sender
            });

            if (reason) {
                msg.c("reason").t(reason);
            }

            this.connection.send(msg.tree());
        }

    }
}
