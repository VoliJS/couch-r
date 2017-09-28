"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const type_r_1 = require("type-r");
const key_1 = require("./key");
const extent_1 = require("./extent");
const couchbaseErrors = require('couchbase/lib/errors');
let DocumentsCollection = class DocumentsCollection extends extent_1.DocumentExtent {
    constructor() {
        super();
        this.bucket = null;
        this.key = new key_1.DocumentKey(this.key, this);
    }
    get asProp() {
        return type_r_1.definitionDecorator('collections', this);
    }
    // Document collections are uniquely identified with it's document key type.
    get id() {
        return this.key.type;
    }
    // For the document collections, there's one design doc for the collection.
    getDesignDocKey() {
        return this.id;
    }
    _from(queryParts) {
        this.bucket._from(queryParts);
        queryParts.store = this;
    }
    _where(parts) {
        let pattern = [parts.store.key.type + '#'], code = '';
        if (parts.code) {
            if (parts.code[0] === '$') {
                pattern.push(parts.code);
            }
            else {
                pattern[0] += parts.code;
            }
        }
        if (pattern.length > 1) {
            pattern.push("%");
        }
        else {
            pattern[0] += "%";
        }
        return `(meta(self).\`id\`) like ${pattern.map(x => `"${x}"`).join(' || ')}`;
    }
    async connect(bucket, existingIndexes) {
        this.bucket = bucket;
        this.log('info', 'initializing...');
        await super.onConnect(existingIndexes);
    }
    log(level, text) {
        type_r_1.tools.log(level, `[Couch-R] Collection ${this.key.type}: ${text}`);
    }
    get idAttribute() {
        return this.Document.prototype.idAttribute;
    }
    get api() {
        return this.bucket.api;
    }
    get manager() {
        return this.bucket.manager;
    }
    /**
     * get( shortId | longId ) - read document by its id.
     * get({ props }) when !idCounter - read document by composite key
     * get( document ) - fetch the document
     */
    async _get(id, method) {
        if (!id)
            return null;
        const doc = id instanceof this.Document ? id : null;
        const key = this.key.get(id);
        try {
            const { value, cas } = await method(key);
            value[this.idAttribute] = this.key.toShort(key);
            value.cas = cas;
            return doc ? doc.set(value, { parse: true }) :
                new this.Document(value, { parse: true });
        }
        catch (e) {
            if (e.code === couchbaseErrors.keyNotFound) {
                return null;
            }
            else {
                throw e;
            }
        }
    }
    async get(id, options = {}) {
        return this._get(id, key => this.api.get(key, options));
    }
    async getAndLock(id, options = {}) {
        return this._get(id, key => this.api.getAndLock(key, options));
    }
    /**
     * unlock( document ) - unlock the previously locked document.
     */
    async unlock(doc, options = {}) {
        return this.api.unlock(this.key.get(doc), doc.cas);
    }
    async getAndTouch(id, expiry, options = {}) {
        return this._get(id, key => this.api.getAndTouch(key, expiry, options));
    }
    /**
     * touch( doc, exp ) - touches the document.
     * touch( doc.id, exp ) - touches the document by its it.
     * touch({ attr1 : value, ... }) - touch the doc with a compund key.
     */
    async touch(doc, expiry, options = {}) {
        return this.api.touch(this.key.get(doc), expiry, options);
    }
    async getMulti() {
        // TODO: create/update collection.
    }
    async upsert(a_doc, options = {}) {
        return this._insert(a_doc, 'upsert', options);
    }
    async insert(a_doc, options = {}) {
        return this._insert(a_doc, 'insert', options);
    }
    async replace(a_doc, options = {}) {
        return this._insert(a_doc, 'replace', options);
    }
    async _insert(a_doc, method, options) {
        const doc = (a_doc instanceof this.Document ? a_doc : new this.Document(a_doc)), key = await this.key.make(doc);
        // TODO: handle idAttribute
        const json = doc.toJSON(), { cas } = json;
        delete json.cas;
        delete json[this.idAttribute];
        await this.api[method](key, json, cas ? Object.assign({ cas }, options) : options);
        // Update document id.
        doc.id = this.key.toShort(key);
        this.trigger('write', doc, key, this);
        this.bucket.trigger('write', doc, key, this);
        return doc;
    }
    /**
     * remove( doc ) will check the cas.
     * remove( doc.id ) will ignore cas.
     * remove({ field : 'a', ... }) will delete doc with compond key.
     */
    async remove(document, a_options = {}) {
        const key = this.key.get(document), cas = typeof document === 'string' ? null : document.cas, doc = cas ? document : null;
        const options = cas ? Object.assign({ cas }, a_options) : a_options;
        await this.api.remove(key, cas, options);
        this.trigger('remove', doc, key, this);
        this.bucket.trigger('remove', doc, key, this);
    }
};
DocumentsCollection = __decorate([
    type_r_1.define,
    type_r_1.definitions({
        Document: type_r_1.mixinRules.protoValue,
        key: type_r_1.mixinRules.protoValue
    })
], DocumentsCollection);
exports.DocumentsCollection = DocumentsCollection;
//# sourceMappingURL=collection.js.map