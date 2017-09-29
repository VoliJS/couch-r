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
const couchbase = require("couchbase");
const type_r_1 = require("type-r");
const extent_1 = require("./extent");
let Bucket = class Bucket extends extent_1.DocumentExtent {
    constructor() {
        super(...arguments);
        this.cluster = null;
        this.api = null;
    }
    // For the bucket-level views, we have one design doc per view.
    getDesignDocKey(viewName) {
        return viewName;
    }
    log(level, message, props = {}) {
        type_r_1.tools.log(level, `[Couch-R] Bucket ${this.id} : ${message}`, props);
    }
    static onDefine(_a) {
        var { collections } = _a, spec = __rest(_a, ["collections"]);
        const { prototype } = this;
        prototype._collections = processSpec(prototype, collections);
        extent_1.DocumentExtent.onDefine.call(this, spec);
    }
    static get asProp() {
        return type_r_1.definitionDecorator('buckets', this);
    }
    get manager() {
        if (!this._manager) {
            this._manager = this.api.manager();
            common_1.promisifyAll(this._manager, 'getDesignDocument', 'upsertDesignDocument', 'createPrimaryIndex', 'getIndexes', 'dropIndex');
        }
        return this._manager;
    }
    _from(queryParts) {
        queryParts.bucket = this;
    }
    async connect(cluster, initialize) {
        this.cluster = cluster;
        this.log('info', `connecting...`);
        this.api = await this.cluster.api.openBucket(this.id, this.password);
        // Promisify bucket api...
        common_1.promisifyAll(this.api, 'append', 'counter', 'get', 'getAndLock', 'getAndTouch', 'getMulti', 'getReplica', 'insert', 'prepend', 'query', 'upsert', 'remove', 'replace');
        let indexes;
        if (initialize) {
            this.log('info', 'initialize primary index...');
            await this.manager.createPrimaryIndex({ ignoreIfExists: true });
            indexes = await this._getIndexes();
            this.log('debug', 'existing indexes:', indexes);
        }
        let toBuild = (await super.onConnect(indexes)) || [];
        this.log('info', 'connect document collections...');
        for (let collection of this._collections) {
            const cIndexes = await collection.connect(this, indexes);
            if (cIndexes) {
                toBuild = toBuild.concat(cIndexes);
            }
        }
        if (toBuild.length) {
            this.log('info', 'Build indexes...');
            const buildIndexes = couchbase.N1qlQuery.fromString(`
                BUILD INDEX ON ${this.id}(${toBuild.join(',')}) USING GSI;
            `);
            this.query(buildIndexes.consistency(3));
        }
    }
    async _getIndexes() {
        const asArray = await this.manager.getIndexes(), indexes = {};
        asArray.forEach(({ name, condition, is_primary, index_key }) => {
            if (!is_primary) {
                indexes[name] = {
                    fields: index_key,
                    where: condition || ""
                };
            }
        });
        return indexes;
    }
};
Bucket = __decorate([
    type_r_1.define,
    type_r_1.definitions({
        id: type_r_1.mixinRules.protoValue,
        password: type_r_1.mixinRules.protoValue,
        collections: type_r_1.mixinRules.merge
    })
], Bucket);
exports.Bucket = Bucket;
function processSpec(self, objects) {
    return objects ? Object.keys(objects).map(name => (self[name] = objects[name].instance)) : [];
}
//# sourceMappingURL=bucket.js.map