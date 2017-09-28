"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const couchbase = require("couchbase");
const type_r_1 = require("type-r");
class Query {
    constructor(parts) {
        this.parts = parts;
    }
    append(parts) {
        const query = new this.constructor(this.parts);
        for (let name in parts) {
            const append = parts[name];
            query.parts[name] = Array.isArray(append) ? query.parts[name].concat(append) : append;
        }
        return query;
    }
    // Decorator's factory. Populate 'queries' definition.
    get asProp() {
        return type_r_1.definitionDecorator('queries', this);
    }
    // Bind to the bucket or document collection 
    bind(object, name) {
        const update = { name };
        object._from(update);
        return this.append(update);
    }
    create() {
        return couchbase.N1qlQuery.fromString(this.toString());
    }
    compile() {
        const query = this.create(), { bucket } = this.parts;
        return async function (params) {
            return params ? bucket.api.query(query, params) : bucket.api.query(query);
        };
    }
    async execute() {
        return this.parts.bucket.api.query(this.create());
    }
}
exports.Query = Query;
//# sourceMappingURL=query.js.map