"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const typeSeparator = '#', idSeparator = '~';
class DocumentKey {
    constructor({ type, code, counter }, collection) {
        this.collection = collection;
        this.type = type;
        this.code = code || null;
        this.counter = counter === void 0 || counter === true ? this.defaultCounter : counter;
    }
    defaultCounter(doc) {
        // By default there is the separate counter for each `type#code`
        return this.get(doc, true);
    }
    getCounterId(doc) {
        // All counter ids starts with typeSeparator. #...
        if (typeof this.counter === 'function') {
            const id = this.counter(doc);
            return typeSeparator + (id instanceof Array ? id.join(typeSeparator) : id);
        }
        else {
            return null;
        }
    }
    /**
     * counterValue( doc, code ) - take the next counter value
     */
    async getCounterValue(doc, next) {
        const counterId = this.getCounterId(doc);
        if (counterId) {
            const { value } = next > 0 ?
                await this.collection.api.counter(counterId, next, { initial: 0 }) :
                await this.collection.api.get(counterId) - next;
            return common_1.base64(value);
        }
        return null;
    }
    async make(doc) {
        return this.last(doc, 1);
    }
    // Return ID of the last document.
    async last(doc, takeNext = 0) {
        const { type } = this;
        // Return existing id...
        let { id } = doc;
        if (id)
            return this.fromShort(id);
        // Create id part before counter
        let key = this.get(doc, true);
        const counter = await this.getCounterValue(doc, takeNext);
        return counter ? key + (this.code ? idSeparator : '') + counter : key;
    }
    /**
     * Get document key for the document
     *
     * get( shortId )
     * get( { document code attributes } ) - if counter === false
     * get( existingDocument )
     * get( newDocument )
     */
    get(doc, ignoreErrors) {
        const { type } = this;
        // Convert to full id.
        if (typeof doc !== 'object')
            return this.fromShort(String(doc));
        if (doc instanceof Array)
            return this.fromShort(doc.join(idSeparator));
        // Return existing id, if it's present.
        const id = doc[this.collection.idAttribute];
        if (id)
            return this.fromShort(id);
        if (this.counter && !ignoreErrors) {
            throw new Error("Can't create full id for document with counter.");
        }
        return this.fromShort(this.code ? this.code(doc).join(idSeparator) : '');
    }
    toShort(fullId) {
        const edge = fullId.indexOf(typeSeparator);
        return edge >= 0 ? fullId.substr(edge + 1) : fullId;
    }
    fromShort(a_shortId) {
        const shortId = String(a_shortId);
        return shortId.indexOf(typeSeparator) >= 0 ?
            shortId :
            `${this.type}${typeSeparator}${shortId}`;
    }
}
exports.DocumentKey = DocumentKey;
//# sourceMappingURL=key.js.map