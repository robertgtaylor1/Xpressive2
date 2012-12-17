
// Module
module Xmpp {

    // Class
    export class Util {
        // Constructor
        static formatDate(d: Date, f: string) {
            return f.replace( // Replace all tokens
                /{(.+?)(?::(.*?))?}/g, // {<part>:<padding>}
                function (
                    v, // Matched string (ignored, used as local var)
                    c, // Date component name
                    p // Padding amount
                ) {
                    for (v = d["get" + c]() // Execute date component getter
                        + /h/.test(c) // Increment Month components by 1
                        + ""; // Cast to String
                        v.length < p; // While padding needed, 
                        v = 0 + v); // pad with zeros
                    return v // Return padded result
                })
        }
    }
}
