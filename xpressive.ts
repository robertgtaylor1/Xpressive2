/// <reference path="xmpp.session.ts" />
/// <reference path="xmpp.chat.ts" />
/// <reference path="xmpp.chatstates.ts" />
/// <reference path="xmpp.roster.ts" />
/// <reference path="xmpp.me.ts" />
/// <reference path="xmpp.muc.ts" />
/// <reference path="xmpp.util.ts" />
/// <reference path="Scripts/ts/underscore-1.4.d.ts" />
/// <reference path="Scripts/ts/jqueryui-1.9.d.ts" />
/// <reference path="Scripts/ts/jquery-1.8.d.ts" />
/// <reference path="Scripts/ts/jstorage.d.ts" />

declare var Strophe: any;
declare var $pres: any;
declare var $iq: any;
declare var $msg: any;

interface IXpressive {
    sessionDisconnect(): void;
    getMyNickname(): string;
    endSession(jid: string): void;
    getRoom(jid: string): any;
    destroyRoom(jid: string, reason: string, altRoomJid: string, altRoomPassword: string);
    refreshInfo(jid: string): void;
    configureRoom(jid: string): void;
    findContact(jid: string);
    chatTo(jid: string);
    chatToDirect(jid: string);
    addContact(jid: string, name: string, groups: string);
    modifyContact(jid: string, name: string, groups: string);
    jid_to_id(jid: string): string;
    occupantJid_to_id(jid: string): string;
    log(msg: string): void;
    getSettings(): any;
    setSettings(newSettings: any): void;
    getSetting(key: string): any;
    setSetting(key: string, value: any): void;

    Session: ISession;
    Me: IMe;
    Chat: IChat;
    Muc: IMuc;
    Roster: IRoster;

    do_presence_changed(contact: IContact): void;
    do_update_info(contact: IContact): void;
    do_roster_changed(contacts: IContacts): void;
    on_join_room(jid: string, name: string, room?: IRoom): void;
    on_start_chat(jid: string, name: string, groupChat: bool, room: IRoom): void;
}

module Xmpp {

    export class Xpressive implements IXpressive {

        private startTime: number;
        private strophe: any;
        private settings: any;
        private connection: any;

        get Session(): ISession {
            return this.connection.session;
        }

        get Me(): IMe {
            return this.connection.me;
        }

        get Chat(): IChat {
            return this.connection.chat;
        }

        get Muc(): IMuc {
            return this.connection.muc;
        }

        get Roster(): IRoster {
            return this.connection.roster;
        }

        get Chatstates(): IChatstates {
            return this.connection.chatstates;
        }

        constructor (strophe) {
            this.strophe = strophe;
            this.settings = null;
        }

        sessionDisconnect() {
            this.Session.disconnect();
        }

        getMyNickname() {
            return this.Me.getNickname();
        }

        changeStatus(newStatus, info) {
            return this.Me.changeStatus(newStatus, info);
        }

        endSession(jid) {
            return this.Chat.endSession(jid);
        }

        getRoom(jid) {
            return this.Muc.getRoom(jid);
        }

        destroyRoom(jid, reason, altRoomJid, altRoomPassword) {
            return this.Muc.destroyRoom(jid, reason, altRoomJid, altRoomPassword);
        }

        refreshInfo(jid) {
            return this.Muc.refreshInfo(jid);
        }

        configureRoom(jid) {
            this.Muc.configureRoom(jid);
        }

        findContact(jid) {
            return this.Roster.findContact(jid);
        }

        chatTo(jid) {
            var contact = this.Roster.chatTo(jid);
            if (contact) {
                this.Chat.chatTo(contact);
            }
        }

        chatToDirect(jid) {
            var contact = this.Roster.chatToDirect(jid);
            if (contact) {
                this.Chat.chatTo(contact);
            }
        }

        addContact(jid, contactName, contactGroups = null) {
            return this.Roster.addContact(jid, contactName, contactGroups);
        }

        modifyContact(jid, contactName, newGroups = null) {
            return this.Roster.modifyContact(jid, contactName, newGroups);
        }

        deleteContact(jid) {
            return this.Roster.deleteContact(jid);
        }

        jid_to_id(jid) {
            var id: string;
            if (!jid)
                return "";
            id = this.strophe.getBareJidFromJid(jid).replace("@", "-").replace(/\./g, '-');
            return id;
        }

        occupantJid_to_id(jid) {
            var id: string;
            id = jid.replace("@", "-").replace("/", "-").replace(/\./g, '-');
            return id;
        }

        log(msg) {
            //console.log(msg);
            try {
                $('#console .log-messages').append("<div><span class='log'>" + msg + "</span></div>");
            } catch (ex) {
                console.log(ex);
            }

        }

        getSettings() {
            try {
                if (!this.settings) {
                    this.settings = $.jStorage.get("Settings");
                    if (!this.settings) {
                        // popup settings dialog
                        $('#settings_dialog').dialog('open');
                    }
                }
                return this.settings;
            } catch (ex) { console.log(ex); }
        }

        setSettings(newSettings) {
            try {
                $.each(newSettings, (key: string, value: any) => {
                    if (!this.settings) {
                        this.settings = {};
                    }
                    this.settings[key] = value;
                });
                $.jStorage.set("Settings", this.settings);
                //$.jStorage.flush();
            } catch (ex) { console.log(ex); }

        }

        getSetting(key) {
            return this.getSettings()[key];
        }

        setSetting(key, value) {
            this.setSettings({ key: value });
        }

        updateRoomName(roomJid, roomName) {
            var id = this.jid_to_id(roomJid);
            $('#chat-area > ul a[href="#chat-' + id + '"]').text(roomName);
        }

        updateContactName(contactJid, contactName) {
            var id = this.jid_to_id(contactJid);
            $('#roster-area > ul a[href="#' + id + '"]').text(contactName);
        }

        do_presence_changed(contact) {
            if (contact === undefined) {
                return true;
            }

            var show = "online";
            var jid_id = this.jid_to_id(contact.jid);

            this.log("Got presence from: " + contact.jid);
            var contactElem = $('#roster-area li#' + jid_id + ' div.roster-contact');

            if (contactElem) {
                contactElem.removeClass("online").removeClass("away").removeClass("chat").removeClass("xa").removeClass("dnd").removeClass("offline");
                if (contact.online()) {
                    for (var resource in contact.resources) {
                        show = contact.resources[resource].show || "online";
                        break;
                    }
                } else {
                    show = "offline";
                }
                contactElem.addClass(show);

                // reset addressing for user since their presence changed
                //$('#chat-' + jid_id).data('jid', Strophe.getBareJidFromJid(from));
            }
            return true;
        }

        do_ask_subscription(jid) {
            $('#approve_dialog').dialog('option', 'jid', jid);
            $('#approve_dialog').dialog('open');
        }

        do_rooms_changed(server) {
            this.log("Got rooms update:");

            for (var attr in server.rooms) {
                this.do_room_changed(server.rooms[attr]);
            }
        }

        do_room_changed(room) {
            var room_id = this.jid_to_id(room.jid);
            var numberOfOccupants = room.numberOfOccupants();
            var room_html = "<li id='" + room_id + "'>" +
                                "<div class='room-entry'>" +
                                    "<div class='room-name'><span style='display:inline-block;'>" + room.roomName + "</span>";

            if (room.requiresPassword()) {
                room_html += "&nbsp;<img class='ui-icon ui-icon-key xmpp-protected' style='display:inline-block; vertical-align:bottom;'/>" +
                                "<div class='tooltip'>Password required</div>";
            }

            room_html += "&nbsp;<img class='ui-icon ui-icon-pencil xmpp-configure-room' style='display:inline-block; vertical-align:bottom;'/>" +
                            "<div class='tooltip'>Modify Room Settings.</div>";

            if (room.iAmModerator()) {
                room_html += "&nbsp;<img class='ui-icon ui-icon-person xmpp-moderator' style='display:inline-block; vertical-align:bottom;'/>" +
                                "<div class='tooltip'>You are a moderator</div>";
            }

            room_html += "&nbsp;<img class='ui-icon ui-icon-close xmpp-destroy-room' style='display:inline-block; vertical-align:bottom;'/>" +
                            "<div class='tooltip'>Delete this Room.</div>";

            room_html += "<img class='ui-icon ui-icon-refresh xmpp-refresh-room' style='display:inline-block; vertical-align:bottom;'/>" +
                            "<div class='tooltip'>Click to refresh info</div>" +
                         "<img class='ui-icon ui-icon-play xmpp-join-room' style='display:inline-block; vertical-align:bottom;'/>" +
                            "<div class='tooltip'>Click to join</div>";

            room_html += "</div>";
            //room_html += "<div class='room-description'>" + room.description();
            room_html += "<div class='room-jid'>" + room.jid + "</div>" +
                                    "<div><ul id='" + room_id + "-occupants' class='occupants-list";
            if (numberOfOccupants === 0) {
                room_html += " hidden";
            }
            room_html += "'><div style='display:inline-block;'><img class='ui-icon ui-icon-person xmpp-occupantCount' style='display:inline-block; vertical-align:bottom;'/>" +
                                "<span style='font-size:75%; vertical-align:center;'>(" + numberOfOccupants + ") Room Occupants</span></div>";

            if (numberOfOccupants !== 0) {
                for (var occupantName in room.occupants) {
                    room_html += this._getOccupantHtml(room.occupants[occupantName]);
                }
            }
            room_html += "</ul></div></div></li>";

            this.insert_room(room_id, $(room_html));
        }

        do_update_room_occupant(occupant) {
            var fullJid = occupant.fullJid;
            var roomJid = Strophe.getBareJidFromJid(fullJid);
            var roomOccupants_id = this.jid_to_id(roomJid) + "-occupants";
            var elem_id = this.occupantJid_to_id(fullJid);
            var roomOccupantsList = $('ul#' + roomOccupants_id);
            var occupant_html = this._getOccupantHtml(occupant);
            Strophe.debug("Update occupants: " + occupant.toString());
            var liElem = $("li#" + elem_id);
            if (liElem && liElem.length > 0) {
                liElem.replaceWith(occupant_html);
            } else {
                roomOccupantsList.append($(occupant_html));
            }
        }

        do_remove_room_occupant(fullJid) {
            var roomJid = Strophe.getBareJidFromJid(fullJid);
            var roomOccupants_id = this.jid_to_id(roomJid) + "-occupants";
            var elem_id = this.occupantJid_to_id(fullJid);
            var roomOccupantsList = $('ul#' + roomOccupants_id);
            Strophe.debug("Remove occupant: " + fullJid);
            var liElem = $("li#" + elem_id);
            if (liElem && liElem.length > 0) {
                liElem.remove();
            }
        }


        do_clear_room_occupants(room) {
            var roomOccupants_id = this.jid_to_id(room.jid) + "-occupants";
            var roomOccupantsList = $('ul#' + roomOccupants_id);
            roomOccupantsList.empty();
        }

        _getOccupantHtml(occupant) {
            var fullJid = occupant.fullJid;
            var elem_id = this.occupantJid_to_id(fullJid);
            var status_html = "";
            var status = occupant.getStatus();
            if (occupant.thisIsMe) {
                status_html = " *me*"
            } else if (status.length > 0) {
                status_html = " [" + status + "]";
            }
            return "<li id='" + elem_id + "'>" + occupant.nickname + status_html + "</li>";
        }

        do_confirm_action(actionData) {
            $('#confirmation_dialog').dialog('option', 'title', actionData.title);
            $('#confirmation_dialog').dialog('option', 'message', actionData.message);
            $('#confirmation_dialog').dialog('option', 'okHandler', actionData.onOk);
            $('#confirmation_dialog').dialog('option', 'cancelHandler', actionData.onCancel);
            $('#confirmation_dialog').dialog('option', 'hideReason', actionData.hideReason);
            $('#confirmation_dialog').dialog('option', 'userData', actionData.userData);
            $('#confirmation_dialog').dialog('open');
        }

        do_destroy_room(actionData) {
            $('#destroyRoom_dialog').dialog('option', 'title', actionData.title);
            $('#destroyRoom_dialog').dialog('option', 'message', actionData.message);
            $('#destroyRoom_dialog').dialog('option', 'okHandler', actionData.onOk);
            $('#destroyRoom_dialog').dialog('option', 'cancelHandler', actionData.onCancel);
            $('#destroyRoom_dialog').dialog('option', 'userData', actionData.userData);
            $('#destroyRoom_dialog').dialog('open');
        }

        do_create_room(data) {
            $('#form_dialog').dialog('option', 'title', "Configure Room [" + $(data.iq).attr('from') + "]");
            $('#form_dialog').dialog('option', 'formIQ', data.iq);
            $('#form_dialog').dialog('option', 'okHandler', data.onOk);
            $('#form_dialog').dialog('option', 'cancelHandler', data.onCancel);
            $('#form_dialog').dialog('open');
        }

        do_update_info(contact) {
            var jid = contact.jid;
            var jid_id = this.jid_to_id(jid);
            var contact_entry = '#' + jid_id;
            $(contact_entry + " #contact_info").text(contact.getInfo());
        }

        do_roster_changed(contacts: IContacts) {
            this.log("Got roster update:");
            var list = contacts.list;

            for (var jid in list) {
                var contact = list[jid];
                var sub = contact.subscription;
                var name = contact.name || Strophe.getNodeFromJid(contact.jid);
                var jid_id = this.jid_to_id(contact.jid);

                this.log("    jid: " + contact.jid + "[" + sub + "]");

                if (sub === 'remove') {
                    // contact is being removed
                    $('#roster-area li#' + jid_id).remove();
                } else {
                    // contact is being added or modified
                    var groups = contact.getGroups();
                    var show = "online";
                    if (contact.online()) {
                        for (var resource in contact.resources) {
                            show = contact.resources[resource].show || "online";
                            break;
                        }
                    } else {
                        show = "offline";
                    }
                    var contact_entry = '#' + jid_id;
                    var contact_html = "<li id='" + jid_id + "'>" +
                                            "<div class='roster-contact " + show + "'>" +
                                                "<div class='roster-name' style='display:inline-block;'>" + name + "</div>";

                    contact_html += "&nbsp;<img class='ui-icon ui-icon-info xmpp-contact-info' " +
                                                "style='display:inline-block; vertical-align:bottom;'/>" +
                                            "<div id='contact_info' class='tooltip'>" + contact.getInfo() + "</div>";

                    if (contact.subscription !== "both") {
                        contact_html += "&nbsp;<img class='ui-icon ui-icon-lightbulb xmpp-change-details' " +
                                                "style='display:inline-block; vertical-align:bottom;'/>" +
                                            "<div class='tooltip'>Subscription pending.</div>";
                    }
                    contact_html += "&nbsp;<img class='ui-icon ui-icon-pencil xmpp-change-details' " +
                                                "style='display:inline-block; vertical-align:bottom;'/>" +
                                            "<div class='tooltip'>Modify details.</div>" +
                                        "&nbsp;<img class='ui-icon ui-icon-close xmpp-remove-contact' " +
                                                "style='display:inline-block; vertical-align:bottom;'/>" +
                                            "<div class='tooltip'>Remove contact</div>" +
                                        "&nbsp;<img class='ui-icon ui-icon-play xmpp-chat-to' " +
                                                "style='display:inline-block; vertical-align:bottom;'/>" +
                                            "<div class='tooltip'>Start chat</div>" +
                                        "<div class='roster-jid'>" + contact.jid + "</div>" +
                                        "<div class'roster-groups'>Groups: " + groups + "</div>" +
                                    "</div>" +
                                    "</li>";

                    if ($(contact_entry).length > 0) {
                        $(contact_entry).replaceWith(contact_html);
                    } else {
                        this.insert_contact(jid_id, contact_html);
                    }
                    //TODO $(contact_entry).data('jid', jid);
                }
            };

            return true;
        }

        do_log_chat_event(ev, data) {

            var jid = data.jid;
            var msg;

            switch (ev) {
                case "join":
                    msg = data.name + " has joined.";
                    break;
                case "leave":
                    msg = data.name + " has left.";
                    break;
                case "subject":
                    msg = data.name + " has changed the topic to '" + data.topic + "'";
                    break;
                default:
                    msg = ev + " is unhandled.";
                    break;
            }
            this.on_chat_event(msg, jid, data.timestamp || new Date());
        }

        do_send_invite(data) {
            $('#sendInvite_dialog').dialog('option', 'room', data.room);
            $('#sendInvite_dialog').dialog('option', 'cancelHandler', null);
            $('#sendInvite_dialog').dialog('option', 'okHandler', data.okHandler);
            $('#sendInvite_dialog').dialog('open');
        }

        do_prompt_room_invite(data) {
            $("#roomInvitation_dialog").dialog('option', 'roomJid', data.roomJid);
            $("#roomInvitation_dialog").dialog('option', 'roomName', data.roomName);

            $("#roomInvitation_dialog").dialog('option', 'fromJid', data.fromJid);
            $("#roomInvitation_dialog").dialog('option', 'fromName', data.fromName);

            $("#roomInvitation_dialog").dialog('option', 'password', data.password);
            $("#roomInvitation_dialog").dialog('option', 'reason', data.reason);

            $("#roomInvitation_dialog").dialog('option', 'accept', data.accept);
            $("#roomInvitation_dialog").dialog('option', 'decline', data.decline);
            $("#roomInvitation_dialog").dialog('option', 'ignore', data.ignore);
            $("#roomInvitation_dialog").dialog('open');
        }

        updateRoomData(jid, affiliation, role) {
            var jid_id = this.jid_to_id(Strophe.getBareJidFromJid(jid));
            var chatTab = '#chat-' + jid_id;
            $('#chat-area ' + chatTab + ' #affil-value').text(affiliation);
            $('#chat-area ' + chatTab + ' #role-value').text(role);
            if (affiliation === 'none') {
                $('#chat-area ' + chatTab + ' #affil-img').addClass('hidden');
            } else {
                $('#chat-area ' + chatTab + ' #affil-img').removeClass('hidden');
                $('#chat-area ' + chatTab + ' #affil-tooltip').text(affiliation + " actions...");
            }
            if (role === 'none') {
                $('#chat-area ' + chatTab + ' #role-img').addClass('hidden');
            } else {
                $('#chat-area ' + chatTab + ' #role-img').removeClass('hidden');
                $('#chat-area ' + chatTab + ' #role-tooltip').text(role + " actions...");
            }
        }

        on_start_chat(jid: string, name: string, groupChat: bool, room: IRoom) {

            var jid_id = this.jid_to_id(jid);
            var chatid = 'chat-' + jid_id
            var chatTab = '#' + chatid;

            if (!name) {
                name = Strophe.getNodeFromJid(jid);
            }
            var bareJid = Strophe.getBareJidFromJid(jid);
            var resource = Strophe.getResourceFromJid(jid);

            var chatArea = $('#chat-area ' + chatTab)[0];
            if (!chatArea) {
                $('#chat-area').tabs('add', chatTab, name);
                $('#chat-area li[aria-controls="' + chatid + '"]').append("<span class='ui-icon ui-icon-close'>Remove Tab</span>");
                if (groupChat) {
                    var hdrHtml = "<div class='groupchat-header'>" +
                                        "<div><span id='topic-label'>Topic : <input type='text' class='chat-topic' /></span></div>" +
                                        "<div><span id='affil-label'>Affiliation : </span><span id='affil-value' class='capitalize'>" +
                                                        room.myAffiliation + "</span>" +
                                                "<span id='affil-img'>&nbsp;<img class='ui-icon ui-icon-play xmpp-affil-actions' " +
                                                           "style='display:inline-block; vertical-align:bottom;'/>" +
                                                    "<div id='affil-tooltip' class='tooltip capitalize'>Affiliation Actions.</div></span>" +
                                             "<span id='role-label'>  Role : </span><span id='role-value' class='capitalize'>" +
                                                        room.myRole + "</span>" +
                                                "<span id='role-img'>&nbsp;<img class='ui-icon ui-icon-play xmpp-role-actions' " +
                                                           "style='display:inline-block; vertical-align:bottom;'/>" +
                                                    "<div id='role-tooltip' class='tooltip capitalize'>Role Actions.</div></span>" +
                                             "<span id='invite-label'>Invite</span>" +
                                                "<span id='invite-img'>&nbsp;<img class='ui-icon ui-icon-play xmpp-invite-actions' " +
                                                           "style='display:inline-block; vertical-align:bottom;'/>" +
                                                    "<div id='invite-tooltip' class='tooltip capitalize'>Invite someone to join.</div></span>" +
                                        "</div>" +
                                  "</div>";
                    $(chatTab).append(hdrHtml);
                }
                $(chatTab).append("<div class='chat-messages' ></div>" + "<input type='text' class='chat-input'/>");
                $(chatTab).data('jid', jid);
                $(chatTab).data('name', name);
                $(chatTab).data('resource', resource);
                if (groupChat) {
                    $(chatTab).data('groupChat', groupChat);
                }
                $(chatTab + ' .chat-input').position({
                    of: chatTab,
                    my: 'left botton',
                    at: 'left bottom',
                    collision: 'none'
                });
            }
            $('#chat-area').tabs('select', chatTab);
            $(chatTab + ' input').focus();
            $('#client').trigger('resize');
        }

        on_join_room(jid, name, room? ) {
            this.on_start_chat(Strophe.getBareJidFromJid(jid), name, true, room);
        }

        on_chat_event(message, jid, timestamp) {
            var jid_id = this.jid_to_id(jid);
            var chatTab = '#chat-' + jid_id;
            this._add_message(chatTab, jid, message, "system", timestamp);
        }

        on_message(message, fromMe, messageTime) {
            var jid: string, full_jid, jid_id: string;
            var chatid, chatTab, name: string, resource: string, composing, body, span;
            var messageSender: string;
            var groupChat = false;
            var delay;
            var messageText: string;
            var timestamp: Date = messageTime || new Date();

            if (fromMe) {
                messageSender = this.Me.myJid();
                jid = Strophe.getBareJidFromJid($(message).attr('to'));
                this.log("Sending message to: " + jid);
                name = "Me";
            } else {
                full_jid = $(message).attr('from');
                jid = Strophe.getBareJidFromJid(full_jid);
                this.log("Got message from: " + jid);
            }

            jid_id = this.jid_to_id(jid);
            chatid = 'chat-' + jid_id;
            chatTab = '#' + chatid;
            groupChat = $(chatTab).data('groupChat') || false;
            if (!messageSender) {
                messageSender = (groupChat ? full_jid : jid);
            }

            if (!fromMe) {
                if (groupChat) {
                    name = Strophe.getResourceFromJid($(message).attr('from'));
                } else {
                    resource = $(chatTab).data('resource');
                    if (!resource) {
                        $(chatTab).data('resource', Strophe.getResourceFromJid(full_jid));
                    }
                    name = $(chatTab).data('name');
                }
            }
            /*
            delay = $(message).find('delay');
            if (delay.length === 0){
                delay = $(message).find('x');
            }
            if (delay.length !== 0){
                var stamp = delay.attr('stamp');
                timestamp = new Date(stamp);
            }
            */
            var topic = $(message).find('subject');
            if (topic.length > 0) {
                var topicText = topic.text();
                $(chatTab + ' .chat-topic').val(topicText);
                this.do_log_chat_event("subject", {
                    "jid": full_jid,
                    "name": name,
                    "topic": topicText,
                    "timestamp": messageTime
                })
            } else {

                if ($(chatTab).length === 0) {
                    $('#chat-area').tabs('add', chatTab, Strophe.getNodeFromJid(jid));
                    $('#chat-area li[aria-controls="' + chatid + '"]').append("<span class='ui-icon ui-icon-close'>Remove Tab</span>");
                    $(chatTab).append("<div class='chat-messages'></div>" + "<input type='text' class='chat-input'/>");
                }

                $('#chat-area').tabs('select', chatTab);
                $(chatTab + ' input').focus();

                composing = $(message).find('composing');
                if (composing.length > 0) {
                    $(chatTab + ' .chat-messages').append("<div class='chat-event'>" + name + " is typing...</div>");

                    this._scroll_chat(chatTab);
                }
                // TODO let's ignore HTML content for now
                body = $(message).find("html > body");

                if (body.length === 0) {
                    body = $(message).find('body');
                    if (body.length > 0) {
                        messageText = body.text()
                    } else {
                        messageText = null;
                    }
                } else {
                    messageText = body.text();
                    /*
                    body = body.contents();
        
                    span = $("<span></span>");
                    body.each(function() {
                        if (document.importNode) {
                            $(document.importNode(this, true)).appendTo(span);
                        } else {
                            // IE workaround
                            span.append(this.xml);
                        }
                    });
                    messageText = span;
                    */
                }

                if (messageText) {
                    // remove notifications since user is now active
                    $(chatTab + ' .chat-event').remove();
                    this._add_message(chatTab, messageSender, messageText, fromMe ? "me" : name, timestamp);
                }
            }
            return true;
        }

        _add_message(chatTab, messageSender, messageText, name, timestamp) {
            // add the new message
            var lastUl = $(chatTab + ' ul').last();
            var appendUl = true;

            if (lastUl.length > 0) {
                var lastUserId = $(chatTab + ' ul').last().data('sender');
                // if it's the same sender as the last message then don't repeat the name
                if (lastUserId === messageSender) {
                    appendUl = false;
                }
            }
            var timeString = Xmpp.Util.formatDate(timestamp, "{FullYear}-{Month:2}-{Date:2} {Hours:2}:{Minutes:2}");
            if (appendUl) {
                $(chatTab + ' .chat-messages').append("<ul class='chat-message" + (name === "me" || name === "system" ? " " + name + "'" : "'") + ">" +
                                                        "<span class='chat-message-group'><span class='chat-name capitalize'>" + name + "</span>:&nbsp;<span class='chat-time'>" + timeString +
                                                        "</span></span><span class='chat-text'></span></ul>");
                lastUl = $(chatTab + ' ul').last().data('sender', messageSender);
            }
            $(chatTab + ' .chat-message:last .chat-text').append("<li>" + messageText + "<div class='chat-tooltip'>Message time : " + timeString + "</div></li>");

            this._scroll_chat(chatTab);
        }

        _scroll_chat(chatTab) {
            var div = $(chatTab + ' .chat-messages').get(0);
            div.scrollTop = div.scrollHeight;
        }

        presence_value(elem) {
            if (elem.hasClass('online')) {
                return 2;
            } else if (elem.hasClass('away')) {
                return 1;
            }

            return 0;
        }

        insert_contact(jid, elem) {
            $('#roster-area ul').append(elem);
        }

        insert_room(room_id, elem) {
            var $room = $('#' + room_id);
            if ($room.length === 0) {
                $('#muc-area ul.room-details').append(elem);
            } else {
                $room.replaceWith(elem);
            }
        }

        //send_ping(to) {
        //    var ping = $iq({
        //        to: to,
        //        type: "get",
        //        id: "ping1"
        //    }).c("ping", {
        //        xmlns: "urn:xmpp:ping"
        //    });

        //    this.log("Sending ping to " + to + ".");

        //    this.startTime = (new Date()).getTime();
        //    this.connection.send(ping);
        //}

        //handle_pong(iq) {
        //    var iq_type = $(iq).attr('type');
        //    var elapsed = (new Date()).getTime() - this.startTime;

        //    if (iq_type === 'error') {
        //        this.log("Received error from server in " + elapsed + "ms.");
        //    } else {
        //        this.log("Received pong from server in " + elapsed + "ms.");
        //    }

        //    return false;
        //}

        show_incoming(body) {
            this.show_traffic(body, "incoming");
        }

        show_outgoing(body) {
            this.show_traffic(body, 'outgoing');
        }

        show_traffic(body, type) {
            if (body.childNodes.length > 0) {
                var console = $('#console').get(0);
                if (console) {
                    var at_bottom = console.scrollTop >= console.scrollHeight - console.clientHeight;

                    $.each(body.childNodes, (index, node) => {
                        try {
                            $('#console .log-messages').append("<div><span class='" + type + "'>" + this.pretty_xml(node, 0) + "</span></div>");
                        }
                        catch (ex) {
                            this.log(ex);
                        }
                    });

                    if (at_bottom) {
                        console.scrollTop = console.scrollHeight;
                    }
                }
            }
        }

        pretty_xml(xml, level) {
            var i, j;
            var result = [];
            if (!level) {
                level = 0;
            }

            result.push("<div class='xml_level" + level + "'>");
            result.push("<span class='xml_punc'>&lt;</span>");
            result.push("<span class='xml_tag'>");
            result.push(xml.tagName);
            result.push("</span>");

            // attributes
            var attrs = xml.attributes;
            var attr_lead = []
            for (i = 0; i < xml.tagName.length + 1; i++) {
                attr_lead.push("&nbsp;");
            }
            var attr_lead_str = attr_lead.join("");

            for (i = 0; i < attrs.length; i++) {
                result.push(" <span class='xml_aname'>");
                result.push(attrs[i].nodeName);
                result.push("</span><span class='xml_punc'>='</span>");
                result.push("<span class='xml_avalue'>");
                result.push(attrs[i].nodeValue);
                result.push("</span><span class='xml_punc'>'</span>");

                if (i !== attrs.length - 1) {
                    result.push("</div><div class='xml_level" + level + "'>");
                    result.push(attr_lead_str);
                }
            }

            if (xml.childNodes.length === 0) {
                result.push("<span class='xml_punc'>/&gt;</span></div>");
            } else {
                result.push("<span class='xml_punc'>&gt;</span></div>");

                // children
                $.each(xml.childNodes, (index, node) => {
                    if (node.nodeType === 1) {
                        result.push(this.pretty_xml(node, level + 1));
                    } else if (node.nodeType === 3) {
                        result.push("<div class='xml_text xml_level" + (level + 1) + "'><span>");
                        result.push(node.nodeValue);
                        result.push("</span></div>");
                    }
                });

                result.push("<div class='xml xml_level" + level + "'>");
                result.push("<span class='xml_punc'>&lt;/</span>");
                result.push("<span class='xml_tag'>");
                result.push(xml.tagName);
                result.push("</span>");
                result.push("<span class='xml_punc'>&gt;</span></div>");
            }

            return result.join("");
        }

        text_to_xml(text) {
            var doc = null;
            if (window['DOMParser']) {
                var parser = new DOMParser();
                doc = parser.parseFromString(text, 'text/xml');
            } else if (window['ActiveXObject']) {
                var doc = new ActiveXObject("MSXML2.DOMDocument");
                doc.async = false;
                doc.loadXML(text);
            } else {
                throw {
                    "type": 'XpressiveError',
                    "message": 'No DOMParser object found.'
                };
            }

            var elem = doc.documentElement;
            if ($(elem).filter('parsererror').length > 0) {
                return null;
            }
            return elem;
        }
    }
}

var Xpressive: IXpressive;
Xpressive = new Xmpp.Xpressive(Strophe);

$(document).ready(() => {

    $("#chat-area").tabs({//).scrollabletab({
        'animationSpeed': 50,
        'resizable': true, //Default false
        'resizeHandles': 'e,s,se', //Default 'e,s,se'
        'easing': 'easeInOutExpo', //Default 'swing'
    });

    var doResize = function () {
        var newH = $(this).height();
        $('.ui-resize').each((index, elem) => {
            $(elem).height(newH - 84);
        });

        $('.chat-messages').each((index, elem) =>{
            var groupChat = $(elem).parent().data('groupChat');
            $(elem).height(newH - 84 - (groupChat === true ? 118 : 70));
        });

        $('.log-messages').each((index, elem) =>{
            $(elem).height(newH - 84 - 45);
        });

        var newW = $('#chat-area').width();
        $('.chat-input').each((index, elem) =>{
            $(elem).width(newW - 10);
            $(elem).css({ top: '0px' });
        });

        $('.chat-topic').each((index, elem) =>{
            $(elem).width(newW - 80);
        });

        $('#muc-area ul.room-details').height(newH - 84 - 60);
        $('#roster-area ul.contact-details').height(newH - 84 - 60);
    };

    $('#client').resizable();

    $('#chat-area').tabs().find('.ui-tabs-nav').sortable({
        axis: 'x'
    });

    $('.ui-resizable').resize(doResize);

    $("#filter").val("Filter...").addClass("empty");

    // When you click on #filter
    $("#filter").focus(function () {

        // If the value is equal to "Filter..."
        if ($(this).val() === "Filter...") {
            // remove all the text and the class of .empty
            $(this).val("").removeClass("empty");
        }

    });

    // When the focus on #filter is lost
    $("#filter").blur(function () {

        // If the input field is empty
        if ($(this).val() === "") {
            // Add the text "Filter..." and a class of .empty
            $(this).val("Filter...").addClass("empty");
        }

    });

    Strophe.log = function (loglevel, message) {
        var level = "CUSTOM";
        switch (loglevel) {
            case 0:
                level = "DEBUG";
                break;
            case 1:
                level = "INFO";
                break;
            case 2:
                level = "WARN";
                break;
            case 3:
                level = "ERROR";
                break;
            case 4:
                level = "FATAL";
                break;
        };
        Xpressive.log(level + ": " + message);
    };

    if (Xpressive.getSettings()) {
        $('#login_dialog').dialog('open');
    }
});