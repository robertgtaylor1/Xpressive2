/// <reference path="Scripts/ts/jquery-1.8.d.ts" />

// Interface
interface ICapabilities {
    ver(): string;
    node(): string;
}

// Module
module Xmpp {
    // Class
    export class Capabilities implements ICapabilities {
        private c: any;

        constructor (caps) {
            this.c = $(caps);
        }

        ver(): string {
            return this.c.attr('ver');
        }

        node(): string {
            return this.c.attr('node');
        }
    }
}