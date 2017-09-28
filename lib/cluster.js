"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const type_r_1 = require("type-r");
const couchbase = require("couchbase");
const process_1 = require("process");
let Cluster = class Cluster extends type_r_1.Messenger {
    constructor() {
        super();
        type_r_1.tools.assign(this, this._buckets);
    }
    static onDefine(_a, BaseClass) {
        var { buckets } = _a, spec = __rest(_a, ["buckets"]);
        this.prototype._buckets = buckets;
        type_r_1.Messenger.onDefine.call(this, spec);
    }
    async connect(options = { initialize: false }) {
        // Create cluster...
        this.api = new couchbase.Cluster(this.connection);
        // Wrap API to promises...
        common_1.promisifyAll(this.api, 'query');
        // Crappy couchbase API for openBucket forces us to make custom promise wrapper...
        const openBucket = this.api.openBucket.bind(this.api);
        this.api.openBucket = (name, password) => {
            return new Promise((resolve, reject) => {
                const bucket = password ? openBucket(name, password, whenDone) : openBucket(name, whenDone);
                function whenDone(err) {
                    err ? reject(err) : resolve(bucket);
                }
            });
        };
        this.log('info', 'connecting...');
        for (let name in this._buckets) {
            await this[name].connect(this, options.initialize);
        }
    }
    log(level, message, object) {
        type_r_1.tools.log(level, `[Couch-R] Cluster: ${message}`, object);
    }
    async start(init, options) {
        return this
            .connect(options)
            .then(() => {
            this.log('info', 'starting application...');
            return init ? init(this) : void 0;
        })
            .catch(error => {
            this.log('error', 'stopped due to unhandled exception');
            console.log(error);
            process_1.exit(1);
        });
    }
};
Cluster = __decorate([
    type_r_1.define,
    type_r_1.definitions({
        buckets: type_r_1.mixinRules.merge,
        connection: type_r_1.mixinRules.protoValue,
        options: type_r_1.mixinRules.protoValue
    })
], Cluster);
exports.Cluster = Cluster;
//# sourceMappingURL=cluster.js.map