/**
 * @author Robert Taylor
 */

$(document).ready(function () {
    /**
     * TODO: DIALOGS 
     */
    $('#message_dialog').dialog({
        autoOpen: false,
        dragable: false,
        resizable: false,
        modal: true,
        title: 'Urgent Message',
        open: function () {
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                } else if (e.keyCode === $.ui.keyCode.ESCAPE) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
            var _buttons = {};
            _buttons.Ok = function () {
                $(this).dialog('close');
            };
            if ($(this).dialog('option', 'replyHandler')) {
                _buttons.Reply = function () {
                    $('#message-reply-div').removeClass('hidden');
                    $(this).dialog('option', 'buttons', {
                        "Cancel": function () {
                            $(this).dialog('close');
                        },
                        "Send": function () {
                            var replyHandler = $(this).dialog('opton', 'replyHandler');
                            if (replyHandler) {
                                replyHandler($(this).dialog('option', 'jid'),
                                             $(this).dialog('option', 'subject'),
                                             $('#message-reply').val());
                            }
                            $(this).dialog('close');
                        }
                    });
                    $(this).keypress(function (e) {
                        if (e.keyCode === $.ui.keyCode.ENTER) {
                            $(this).parent().find("button:eq(1)").trigger("click");
                        } else if (e.keyCode === $.ui.keyCode.ESCAPE) {
                            $(this).parent().find("button:eq(0)").trigger("click");
                        }
                    });
                }
            }
            $(this).dialog('option', 'buttons', _buttons);

            $('#message-from').text($(this).dialog('option', 'from'));
            $('#message-subject').text($(this).dialog('option', 'subject'));
            $('#message-text').text($(this).dialog('option', 'messageText'));
        }
    });

    $('#settings_dialog').dialog({
        autoOpen: false,
        dragable: false,
        resizable: false,
        modal: true,
        title: 'Settings',
        buttons: {
            "Save": function () {
                var _server = $('#settings-server').val().trim();
                if (_server.length === 0)
                    return;
                var _port = $('#settings-port').val().trim();
                var _nickname = $('#settings-nickname').val().trim();
                var _resource = $('#settings-resource').val().trim();

                $(this).dialog('option', 'server', _server);
                $(this).dialog('option', 'port', _port);
                $(this).dialog('option', 'resource', _resource);
                $(this).dialog('option', 'nickname', _nickname);

                $(document).trigger('save_settings', {
                    'server': _server,
                    'port': _port,
                    'resource': _resource,
                    'nickname': _nickname
                });

                $(this).dialog('close');
            }
        },
        open: function () {
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
            $('#settings-server').val($(this).dialog('option', 'server'));
            $('#settings-port').val($(this).dialog('option', 'port'));
            $('#settings-resource').val($(this).dialog('option', 'resource'));
            $('#settings-nickname').val($(this).dialog('option', 'nickname'));
        }
    });

    $('#confirmation_dialog').dialog({
        autoOpen: false,
        dragable: false,
        resizable: false,
        modal: true,
        title: 'Confirm',
        buttons: {
            "Cancel": function () {
                var cancelHandler = $(this).dialog('option', 'cancelHandler');
                if (cancelHandler) {
                    cancelHandler($(this).dialog('option', 'userData'));
                }

                $(this).dialog('close');
            },
            "Ok": function () {
                var okHandler = $(this).dialog('option', 'okHandler');
                if (okHandler) {
                    var reason = $('#confirmation-reason').val().trim();
                    okHandler(reason, $(this).dialog('option', 'userData'));
                }

                $(this).dialog('close');
            }
        },
        open: function () {
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(1)").trigger("click");
                } else if (e.keyCode === $.ui.keyCode.ESCAPE) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
            $('#confirmation-message').val($(this).dialog('option', 'message'));
            var hideReason = $(this).dialog('option', 'hideReason');
            if (hideReason) {
                $('#confirmation-reason-div').addClass('hidden');
            } else {
                $('#confirmation-reason-div').removeClass();
            }
        }
    });

    $('#destroyRoom_dialog').dialog({
        autoOpen: false,
        dragable: false,
        resizable: false,
        modal: true,
        title: 'Destroy Room',
        buttons: {
            "Cancel": function () {
                var cancelHandler = $(this).dialog('option', 'cancelHandler');
                if (cancelHandler) {
                    cancelHandler($(this).dialog('option', 'userData'));
                }

                $(this).dialog('close');
            },
            "Ok": function () {
                var okHandler = $(this).dialog('option', 'okHandler');
                if (okHandler) {
                    var reason = $('#destroyRoom-reason').val().trim();
                    var altJid = $('#destroyRoom-altJid').val().trim().toLowerCase();
                    var password = $('#destroyRoom-password').val().trim();

                    okHandler(reason, altJid, password, $(this).dialog('option', 'userData'));
                }

                $(this).dialog('close');
            }
        },
        open: function () {
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(1)").trigger("click");
                } else if (e.keyCode === $.ui.keyCode.ESCAPE) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
            $('#destroyRoom-message').html($(this).dialog('option', 'message'));
        }
    });

    $('#status_dialog').dialog({
        autoOpen: false,
        dragable: false,
        resizable: false,
        modal: true,
        title: 'Change Status',
        buttons: {
            "Update": function () {
                var newStatus = $('input[name=status]:checked', '#status_dialog').val();
                var info = $('#status_info').val();
                info.trim();
                // update my status
                Xpressive.changeStatus(newStatus, info);

                $(this).dialog('close');
            }
        },
        open: function () {
            var x = "input[value='" + $(this).dialog('option', 'currentStatus') + "']";
            $(x, '#status_dialog').attr('checked', true);
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
        }
    });

    $('#login_dialog').dialog({
        autoOpen: false,
        dragable: false,
        resizable: false,
        modal: true,
        title: 'Sign In',
        buttons: {
            "Connect": function () {
                var password = $('#login-password').val().trim();
                if (password.length === 0)
                    return;

                var settings = Xpressive.getSettings();

                $(document).trigger('connect', {
                    'myjid': $('#login-jid').val().trim(),
                    'password': password,
                    'myresource': $('#login-resource').val().trim(),
                    'server': settings.server,
                    'port': settings.port,
                    'resource': settings.resource
                });

                // TODO: FOR TESTING ONLY
                //$('#login-password').val('');
                $(this).dialog('close');
            }
        },
        open: function () {
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
            $('#login-resource').val(Xpressive.getSetting("myresource"));
            $('#login-jid').val(Xpressive.getSetting("myjid"));
            // TODO: FOR TESTING ONLY
            $('#login-password').val("password");
        }
    });

    $('#contact_dialog').dialog({
        autoOpen: false,
        dragable: false,
        resizable: false,
        modal: true,
        open: function () {
            var _buttons = {};
            var _oper = $(this).dialog('option', 'type');
            var jid = $(this).dialog('option', 'jid');

            $('#contact-jid').val(jid).removeAttr('disabled');
            $('#contact-groups, #group-label').removeClass('hidden');

            if (_oper === "add") {
                $('#contact-jid').focus();
                $('#contact-name, #contact-groups').removeAttr('disabled');
                _buttons.Add = function () {
                    var jid = $('#contact-jid').val();
                    if (jid.length > 0) {
                        Xpressive.addContact(jid, $('#contact-name').val(), $('#contact-groups').val());

                        $('#contact-jid').val('');
                        $('#contact-name').val('');
                        $('#contact-groups').val('');

                        $(this).dialog('close');
                    }
                };
            } else if (_oper === "update") {
                $('#contact-jid').attr('disabled', 'true');
                $('#contact-groups').removeAttr('disabled');
                $('#contact-name').val($(this).dialog('option', 'name'))
                                    .removeAttr('disabled')
                                    .focus();
                var groups = $(this).dialog('option', 'groups');
                $('#contact-groups').val((groups === "none" ? "" : groups));

                _buttons.Modify = function () {
                    var _groups = $('#contact-groups').val().split(/[ ,]+/);
                    var newGroups = _groups.join(" ");

                    Xpressive.modifyContact(jid, $('#contact-name').val(), newGroups);
                    $(this).dialog('close');
                };
            } else if (_oper === "remove") {
                $('#contact-jid').attr('disabled', 'true');
                $('#contact-name').val($(this).dialog('option', 'name'))
                                    .attr('disabled', 'true');
                $('#contact-groups, #group-label').addClass('hidden');

                _buttons.Remove = function () {
                    Xpressive.deleteContact(jid);
                    $(this).dialog('close');
                };
            }
            $(this).dialog('option', 'buttons', _buttons);

            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
        }
    });

    $('#approve_dialog').dialog({
        autoOpen: false,
        dragable: false,
        resizable: false,
        modal: true,
        title: 'Subscription Request',
        buttons: {
            "Approve": function () {
                Xpressive.connection.send($pres({
                    to: $(this).dialog('option', 'jid'),
                    "type": "subscribed"
                }).tree());

                // This contact is not on my roster so request subscription				  
                Xpressive.connection.send($pres({
                    to: $(this).dialog('option', 'jid'),
                    "type": "subscribe"
                }).tree());

                $(this).dialog('close');
            },

            "Deny": function () {
                Xpressive.connection.send($pres({
                    to: $(this).dialog('option', 'jid'),
                    "type": "unsubscribed"
                }).tree());

                $(this).dialog('close');
            },
        },
        open: function () {
            $("#approve-jid").text($(this).dialog('option', 'jid'));
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                } else if (e.keyCode === $.ui.keyCode.ESCAPE) {
                    $(this).parent().find("button:eq(1)").trigger("click");
                }
            });
        }
    });

    $('#chat_dialog').dialog({
        autoOpen: false,
        draggable: false,
        resizable: false,
        modal: true,
        title: 'Start a Chat',
        buttons: {
            "Start": function () {
                var jid = $('#chat-jid').val();

                Xpressive.chatToDirect(jid);

                $('#chat-jid').val('');
                $(this).dialog('close');
            }
        },
        open: function () {
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
        }
    });

    $('#form_dialog').dialog({
        autoOpen: false,
        draggable: true,
        resizable: false,
        modal: true,
        width: 'auto',
        title: '??',
        buttons: {
            "Cancel": function () {
                var cancelHandler = $(this).dialog('option', 'cancelHandler');
                if (cancelHandler) {
                    cancelHandler($(this).dialog('option', 'formIQ'));
                }
                $(this).dialog('close');
            },
            "Ok": function () {
                var okHandler = $(this).dialog('option', 'okHandler');
                if (okHandler) {
                    okHandler($(this).dialog('option', 'formIQ'), $('form', this));
                }
                $(this).dialog('close');
            }
        },
        open: function () {
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(1)").trigger("click");
                } else if (e.keyCode === $.ui.keyCode.ESCAPE) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
            var iq = $(this).dialog('option', 'formIQ');
            var xData = $(iq).find('x');
            var form = Xmpp.Form.fromXML(xData);
            $(this).html(form.toHTML());
        },
        close: function () {
            //TODO do something
        },
    });

    $('#roomDetails_dialog').dialog({
        autoOpen: false,
        draggable: false,
        resizable: false,
        modal: true,
        width: 'auto',
        title: 'Room : ?',
        buttons: {
            "Ok": function () {
                $(this).dialog('close');
            }
        },
        open: function () {
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });

            var jid = $(this).dialog('option', 'roomJid');
            var room = Xpressive.Muc.getRoom(jid);
            var roomName = room.roomName;
            $(this).dialog('option', 'title', "Room : " + roomName);
            var html = room.form.toHTML();
            $(this).html(html);
            $(this).find('form input').attr('readonly', true);
        },
        close: function () {
            //TODO do something
        },
    });

    $('#roomDetails_dialog').bind('submit', function () {
        $(this).dialog('close');
    });

    $('#createRoom_dialog').dialog({
        autoOpen: false,
        draggable: false,
        resizable: false,
        modal: true,
        title: 'Create a Room',
        buttons: {
            "Create": function () {
                var nick = $('#newroom-nickname').val().trim();
                var name = $('#newroom-name').val().trim().toLowerCase();

                if (nick.length === 0 || name.length === 0) {
                    return;
                }
                Xpressive.Muc.createRoom(name, nick);

                $(this).dialog('close');
            }
        },
        open: function () {
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
            $('#newroom-nickname').val($(this).dialog('option', 'nickname'));
        }
    });

    $('#joinRoom_dialog').dialog({
        autoOpen: false,
        draggable: false,
        resizable: false,
        modal: true,
        title: 'Join a Room',
        passwordRequired: false,
        buttons: {
            "Join": function () {
                var jid = $(this).dialog('option', 'jid');
                var nick = $('#room-nickname').val().trim();
                var password = $('#room-password').val().trim();

                if (nick.length === 0 || (this.passwordRequired && password.length === 0)) {
                    return;
                }
                Xpressive.Muc.join(jid, nick, password);

                $(this).dialog('close');
            }
        },
        open: function () {
            $('#room-nickname').val(Xpressive.Me.myNickname);
            this.passwordRequired = $(this).dialog('option', 'secure');
            if (this.passwordRequired) {
                $('#room-password-div').removeClass('hidden');
            } else {
                $('#room-password-div').addClass('hidden');
            }
            $(this).keypress(function (e) {
                if (e.keyCode === $.ui.keyCode.ENTER) {
                    $(this).parent().find("button:eq(0)").trigger("click");
                }
            });
        }
    });
});