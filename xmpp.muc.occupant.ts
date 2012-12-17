/// <reference path="xpressive.ts" />
/// <reference path="xmpp.muc.capabilities.ts" />

// Interface
interface IOccupant {
    nickname: string;
    getStatus(): string;
    affiliation: string;
    role: string;
    realJid: string;
    isThisMe(): bool;
    startChat(jid: string): void;
    presenceUpdate(pres: any): void;
    capabilitiesUpdate(caps: any): void;
    toString(): string;
}

// Module
module Xmpp {

    // Class
    export class Occupant implements IOccupant {
        private item: any = {};
        private fullJid: string = jid;
        private capabilities: ICapabilities;
        private show: string = "";
        private status: string = "";
        private thisIsMe: bool = false;


        // Constructor
        constructor (public jid: string) {
            this.item = {};
            this.fullJid = jid;
            this.capabilities = null;
            this.show = "";
            this.status = "";
            this.thisIsMe = false;
        }

        get nickname() : string {
            return Strophe.getResourceFromJid(this.fullJid);
        }

        getStatus() {
            if (this.role === 'none')
                return 'unavailable';
            return this.status;
        }

        get affiliation() {
            var _affiliation = "none";

            if (this.item) {
                _affiliation = this.item.attr('affiliation') || "none";
            }
            return _affiliation;
        }

        get role() {
            var _role = "none";

            if (this.item) {
                _role = this.item.attr('role') || "none";
            }
            return _role;
        }

        get realJid(): string {
            return this.item ? this.item.attr('jid') || null : null;
        }

        isThisMe() {
            return this.thisIsMe;
        }

        startChat(jid) {
            var myName = Strophe.getResourceFromJid(jid);
            //TODO: add support
        }

        presenceUpdate(pres) {
            this.item = pres.find('item');
            var capsElem = pres.find('c');
            if (capsElem && capsElem.length > 0) {
                this.capabilitiesUpdate(capsElem);
            }
            var statusElem = $(pres).find('status');
            if (statusElem && statusElem.length > 0) {
                this.status = statusElem.text();
            }
            var showElem = $(pres).find('show');
            if (showElem && showElem.length > 0) {
                this.show = showElem.text();
            }
            var xElem = $(pres).find("x status[code='110']");
            if (xElem && xElem.length > 0) {
                this.thisIsMe = true;
            }
            if (this.thisIsMe) {
                $(document).trigger("update_my_room_info", {
                    "jid": this.fullJid,
                    "affiliation": this.affiliation,
                    "role": this.role
                }
                    );
            }
        }

        capabilitiesUpdate(caps) {
            this.capabilities = new Xmpp.Capabilities(caps);
        }

        toString() {
            return "Occupant: Nickname=" + this.nickname + ", " +
                             "RealJid=" + this.realJid + ", " +
                             "isThisMe=" + this.isThisMe() + ", " +
                             "affiliation=" + this.affiliation + ", " +
                             "role=" + this.role + ", " +
                             "status=" + this.getStatus() + ", " +
                             "show=" + this.show + ". ";
        }
    }
}
