"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const { promisify } = require('util');
const type_r_1 = require("type-r");
function promisifyAll(obj, ...names) {
    for (let name of names) {
        obj[name] = promisify(obj[name]);
    }
}
exports.promisifyAll = promisifyAll;
/**
 * Polymorphic record
 */
let Document = class Document extends type_r_1.Record {
};
Document.id = String.value(null);
__decorate([
    type_r_1.attr(String.value(void 0))
], Document.prototype, "cas", void 0);
Document = __decorate([
    type_r_1.define
], Document);
exports.Document = Document;
var digitsStr = 
//   0       8       16      24      32      40      48      56     63
//   v       v       v       v       v       v       v       v      v
"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
var digits = digitsStr.split('');
function base64(int32) {
    let code = "";
    do {
        code = digits[int32 & 0x3f] + code;
        int32 >>>= 6;
    } while (int32);
    return code;
}
exports.base64 = base64;
//# sourceMappingURL=common.js.map