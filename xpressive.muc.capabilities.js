var Xmpp;
(function (Xmpp) {
    var Capabilities = (function () {
        function Capabilities(caps) {
            this.c = $(caps);
        }
        Capabilities.prototype.ver = function () {
            return this.c.attr('ver');
        };
        Capabilities.prototype.node = function () {
            return this.c.attr('node');
        };
        return Capabilities;
    })();
    Xmpp.Capabilities = Capabilities;    
})(Xmpp || (Xmpp = {}));
