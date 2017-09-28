"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("./query");
const type_r_1 = require("type-r");
class CreateIndexQuery extends query_1.Query {
    constructor(parts = {}) {
        super(Object.assign({ where: [], name: '', fields: [] }, parts));
    }
    notEqual(index) {
        const { where } = index, fields = index.fields.map(x => x.replace(/`/g, ''));
        return type_r_1.tools.notEqual(fields, this.parts.fields) || this.parts.where.map(x => '(' + x + ')').join(' AND ') !== where;
    }
    bind(extent, name) {
        const parts = { name };
        extent._from(parts);
        const where = extent._where && extent._where(parts);
        if (where) {
            parts.where = [where];
        }
        extent.appendIndex(this, name);
        return this.append(parts);
    }
    fields(...args) {
        return this.append({ fields: args });
    }
    where(...args) {
        return this.append({ where: args });
    }
    isEqual(existing) {
        return existing && existing.where === this.parts.where &&
            !type_r_1.tools.notEqual(existing.fields, this.parts.fields);
    }
    toString() {
        const { parts } = this, fields = parts.fields.map(x => "`" + x + "`").join(',');
        let query = `CREATE INDEX \`${parts.name}\` ON \`${parts.bucket.id}\`(${fields})\n`;
        if (parts.where.length)
            query += `WHERE ${parts.where.join(' AND ')}\n`;
        return query;
    }
}
exports.CreateIndexQuery = CreateIndexQuery;
function index(...fields) {
    return new CreateIndexQuery({ fields });
}
exports.index = index;
//# sourceMappingURL=create-index.js.map