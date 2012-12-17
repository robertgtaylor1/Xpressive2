var Xmpp;
(function (Xmpp) {
    var Util = (function () {
        function Util() { }
        Util.formatDate = function formatDate(d, f) {
            return f.replace(/{(.+?)(?::(.*?))?}/g, function (v, c, p) {
                for(v = d["get" + c]() + /h/.test(c) + ""; v.length < p; v = 0 + v) {
                    ; ;
                }
                return v;
            });
        }
        return Util;
    })();
    Xmpp.Util = Util;    
})(Xmpp || (Xmpp = {}));
//@ sourceMappingURL=xmpp.util.js.map
