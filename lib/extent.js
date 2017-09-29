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
const type_r_1 = require("type-r");
let DocumentExtent = class DocumentExtent extends type_r_1.Messenger {
    constructor() {
        super(...arguments);
        this._designDocs = {};
        this._indexes = [];
    }
    static onDefine(_a, BaseClass) {
        var { queries } = _a, spec = __rest(_a, ["queries"]);
        this.prototype.queries = queries;
        this._instance = null;
        type_r_1.Messenger.onDefine.call(this, spec, BaseClass);
    }
    static get instance() {
        return this._instance || (this._instance = new this());
    }
    appendView(view, name) {
        const key = this.getDesignDocKey(name), designDoc = this._designDocs[key] || (this._designDocs[key] = new DesignDocument(key));
        designDoc.append(view, name);
        return key;
    }
    appendIndex(index, name) {
        this._indexes.push(name);
    }
    async onConnect(existingIndexes) {
        for (let name in this.queries) {
            // Connect query to the extent.
            const query = this.queries[name] = this.queries[name].bind(this, name);
            // Create the corresponding Couchbase query object.
            this[name] = query.create();
        }
        if (existingIndexes) {
            // Initialize design documents...
            await this.initViews();
            // Initialize indexes...
            return await this.initIndexes(existingIndexes);
        }
    }
    query(theQuery, options = {}) {
        return this.api.query(theQuery, options);
    }
    async initViews() {
        return Promise.all(Object.keys(this._designDocs)
            .map(name => this._designDocs[name].update(this)));
    }
    async initIndexes(existingIndexes) {
        const toBuild = [];
        for (let name of this._indexes) {
            let existing = existingIndexes[name];
            const local = this.queries[name];
            if (existing && local.notEqual(existing)) {
                this.log('info', `dropping index ${name}...`);
                await this.manager.dropIndex(name, { ignoreIfNotExists: true });
                existing = null;
            }
            if (!existing) {
                this.log('info', `creating index ${name}...`);
                await this.query(this[name].consistency(3));
                toBuild.push(name);
            }
        }
        return toBuild;
    }
};
DocumentExtent = __decorate([
    type_r_1.define,
    type_r_1.definitions({
        queries: type_r_1.mixinRules.merge
    })
], DocumentExtent);
exports.DocumentExtent = DocumentExtent;
class DesignDocument {
    constructor(id) {
        this.id = id;
        this.views = {};
    }
    // Append view to the document
    append(view, name) {
        this.views[name] = view.toJSON();
    }
    // Updates view definition in the given bucket
    async update(bucket) {
        const { id, views } = this, { manager } = bucket;
        return manager
            .getDesignDocument(id)
            .then(doc => {
            if (type_r_1.tools.notEqual(views, doc.views)) {
                console.log(`[Couch-R] Updating design document "${id}"...`);
                return manager.upsertDesignDocument(id, { views });
            }
        })
            .catch(e => {
            console.log(`[Couch-R] Creating design document "${id}"...`);
            return manager.upsertDesignDocument(id, { views });
        });
    }
}
exports.DesignDocument = DesignDocument;
//# sourceMappingURL=extent.js.map