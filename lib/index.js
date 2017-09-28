"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./bucket"));
__export(require("./cluster"));
__export(require("./collection"));
__export(require("./common"));
__export(require("./queries"));
__export(require("type-r"));
var couchbase_1 = require("couchbase");
exports.N1qlQuery = couchbase_1.N1qlQuery;
exports.ViewQuery = couchbase_1.ViewQuery;
//# sourceMappingURL=index.js.map