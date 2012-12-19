/**
 *  document event bindings
 */

$(document).bind('connect', function (ev, data) {

    var port = data.port || "5280";
    var server = data.server;
    var resource = data.resource || "xmpp-httpbind";
    try {
        if ($('#console').length === 0) {
            $('#chat-area').tabs('remove').tabs('add', '#console', "Debug");
            $('#chat-area li[aria-controls="console"]').append("<span class='ui-icon ui-icon-trash'>Clear log messages</span>");
            $('#console').append("<div class='log-messages' ></div>");
        }
    } catch (ex) {
        console.log(ex);
    }

    Xpressive.log("Connect to : http://" + server + ":" + port + "/" + resource);

    var conn = new Strophe.Connection("http://" + server + ":" + port + "/" + resource);
    // used in TEST
    //var conn = new Strophe.Connection("http://bosh.metajack.im:5280/xmpp-httpbind");

    conn.xmlInput = Xpressive.show_incoming.bind(Xpressive);
    conn.xmlOutput = Xpressive.show_outgoing.bind(Xpressive);

    var jid = data.myjid + "/" + data.myresource || "xprclient";

    conn.reset();
    conn.connect(jid, data.password, function (status) {
        if (status === Strophe.Status.CONNECTED) {
            Xpressive.setSettings({ "myjid": data.myjid, "myresource": data.myresource });
            $(document).trigger('on_connected');
        } else if (status === Strophe.Status.DISCONNECTED) {
            $(document).trigger('on_disconnected');
        } else if (status === Strophe.Status.DISCONNECTING) {
            Xpressive.log('Connection disconnecting.');
        } else if (status === Strophe.Status.CONNFAIL) {
            Xpressive.log('Connection failed.');
        } else if (status === Strophe.Status.ERROR) {
            Xpressive.log('Connection errored.');
        } else if (status === Strophe.Status.AUTHFAIL) {
            Xpressive.log('Authorization failed.');
        }
    });
    Xpressive.connection = conn;
    try {
        $('#client').trigger('resize');
    } catch (ex) {
        console.log(ex);
    }
});

$(document).bind('on_connected', function () {
    // inform the user
    Xpressive.log("Connection established.");

    $('#disconnect').removeAttr('disabled');
    Xpressive.startSession();
});

$(document).bind('on_disconnected', function () {
    $('#disconnect').attr('disabled', 'disabled');
    Xpressive.log("Connection terminated.");

    // remove dead connection object
    Xpressive.connection = null;
    try {
        $('#roster-area ul').empty();
        $('#muc-area ul').empty();
        $('#chat-area ul').empty();
        $('#chat-area div').remove();

        $('#login_dialog').dialog('open');
    } catch (ex) {
        console.log(ex);
    }
});

$(document).bind('roster_changed', function (ev, data) {
    Xpressive.log("Roster Changed Event.");
    try {
        Xpressive.do_roster_changed(data);
    } catch (ex) { console.log(ex); }
});

$(document).bind('rooms_changed', function (ev, data) {
    Xpressive.log("Rooms Changed Event.");
    try {
        Xpressive.do_rooms_changed(data);
    } catch (ex) { console.log(ex); }

});

$(document).bind('room_changed', function (ev, data) {
    Xpressive.log("Room Changed Event.");
    try {
        Xpressive.do_room_changed(data);
    } catch (ex) { console.log(ex); }
});

$(document).bind('create_room_form', function (ev, data) {
    Xpressive.log("Create Room Event.");
    try {
        Xpressive.do_create_room(data);
    } catch (ex) { console.log(ex); }
});

$(document).bind('presence_changed', function (ev, data) {
    Xpressive.log("Presence Changed Event.");
    try {
        Xpressive.do_presence_changed(data);
        Xpressive.do_update_info(data);
    } catch (ex) { console.log(ex); }
});

$(document).bind('ask_subscription', function (ev, data) {
    Xpressive.log("Subscription Request Event.");
    try {
        Xpressive.do_ask_subscription(data);
    } catch (ex) { console.log(ex); }
});

$(document).bind('start_chatting', function (ev, chatSession) {
    try {
        Xpressive.on_start_chat(chatSession.chatWith.jid, chatSession.name, chatSession.isGroupChat);
    } catch (ex) { console.log(ex); }
});

$(document).bind('join_room', function (ev, room) {
    try {
        Xpressive.on_join_room(room.jid, room.roomName, room);
    } catch (ex) { console.log(ex); }
});

$(document).bind('new_chat_message', function (ev, data) {
    try {
        var message = data.message;
        var fromMe = data.fromMe;
        var timestamp = data.timestamp;
        Xpressive.on_message(message, fromMe, timestamp);
    } catch (ex) { console.log(ex); }
});

$(document).bind('remove_contact', function (ev, contact) {
    try {
        $('#contact_dialog').dialog({
            'title': "Confirm Remove Contact",
            'jid': contact.jid,
            'name': contact.name,
            'groups': contact.getGroups(),
            'type': 'remove'
        });
        $('#contact_dialog').dialog('open');
    } catch (ex) { console.log(ex); }
});

$(document).bind('urgent_message', function (ev, details) {
    try {
        $('#message_dialog').dialog({
            'from': details.from,
            'subject': details.subject,
            'messageText': details.messageText
        });
        $('#message_dialog').dialog('open');
    } catch (ex) { console.log(ex); }
});

$(document).bind('modify_contact_details', function (ev, contact) {
    try {
        $('#contact_dialog').dialog({
            'title': "Modify Contact Details",
            'jid': contact.jid,
            'name': contact.name,
            'groups': contact.getGroups(),
            'type': 'update'
        });
        $('#contact_dialog').dialog('open');
    } catch (ex) { console.log(ex); }
});

$(document).bind('my_status_changed', function (ev, details) {
    try {
        if (details.jid.length > 0)
            $('#my-jid').text("[" + Strophe.getBareJidFromJid(details.jid) + "]");
        $('#my-status').removeClass().addClass(details.status + " my-status");
        $('#my-status .tooltip').text(details.extendedStatusToString());
        $('#my-nickname').text(details.getNickname());
    } catch (ex) { console.log(ex); }
});

$(document).bind('save_settings', function (ev, newSettings) {
    try {
        Xpressive.setSettings(newSettings);
    } catch (ex) { console.log(ex); }
});

$(document).bind('roomname_changed', function (ev, room) {
    try {
        Xpressive.updateRoomName(room.jid, room.roomName);
    } catch (ex) { console.log(ex); }
});

$(document).bind('contactname_changed', function (ev, contact) {
    try {
        Xpressive.updateContactName(contact.jid, contact.name);
    } catch (ex) { console.log(ex); }
});

$(document).bind('destroy_room', function (ev, data) {
    try {
        Xpressive.do_destroy_room(data);
    } catch (ex) { console.log(ex); }
});

$(document).bind('remove_room_from_list', function (ev, jid) {
    try {
        var jid_id = Xpressive.jid_to_id(jid);
        $('#muc-area li#' + jid_id).remove();
    } catch (ex) { console.log(ex); }
});

$(document).bind('confirm_action', function (ev, data) {
    try {
        Xpressive.do_confirm_action(data);
    } catch (ex) { console.log(ex); }
});

$(document).bind('update_room_occupants', function (ev, occupant) {
    try {
        Xpressive.do_update_room_occupant(occupant);
    } catch (ex) { console.log(ex); }
});

$(document).bind('set_focus_on_tab', function (ev, jid) {
    try {
        var jid_id = Xpressive.jid_to_id(jid);
        // find the tab and 'click' it
        $('#chat-area li a[href="#chat-' + jid_id + '"]').trigger('click');
    } catch (ex) { console.log(ex); }
});

$(document).bind('I_have_left_room', function (ev, room) {
    try {
        Xpressive.do_clear_room_occupants(room);
    } catch (ex) { console.log(ex); }
});

$(document).bind('someone_has_left_room', function (ev, occupant) {
    try {
        Xpressive.do_remove_room_occupant(occupant.fullJid);
        Xpressive.do_log_chat_event("leave", {
            jid: Strophe.getBareJidFromJid(occupant.fullJid),
            name: occupant.nickname()
        });
    } catch (ex) { console.log(ex); }
});

$(document).bind('someone_has_joined_room', function (ev, occupant) {
    try {
        Xpressive.do_log_chat_event("join", {
            jid: Strophe.getBareJidFromJid(occupant.fullJid),
            name: occupant.nickname()
        });
    } catch (ex) { console.log(ex); }
});
