"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const couchbase = require("couchbase");
const query_1 = require("./query");
class MapReduceQuery extends query_1.Query {
    constructor(mapReduce) {
        super({});
        this.mapReduce = mapReduce;
    }
    bind(object, name) {
        this._designDoc = object.appendView(this, name);
        this._name = name;
        return this;
    }
    toJSON() {
        return this.mapReduce;
    }
    create() {
        return couchbase.ViewQuery.from(this._designDoc, this._name);
    }
}
exports.MapReduceQuery = MapReduceQuery;
function mapReduce(map, reduce) {
    const mapReduce = { map: stringify(map((key, value) => void 0)) };
    if (reduce) {
        mapReduce.reduce = stringify(reduce);
    }
    return new MapReduceQuery(mapReduce);
}
exports.mapReduce = mapReduce;
function stringify(method) {
    return method.toString()
        .replace(/^\s*emit\s*=>\s*/, '')
        .replace(/^\w*\((.*?)\)\s*=>\s*/, 'function($1)');
}
//# sourceMappingURL=map-reduce.js.map