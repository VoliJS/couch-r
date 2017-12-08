"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("./query");
function select(...fields) {
    return new SelectQuery({ select: fields });
}
exports.select = select;
class SelectQuery extends query_1.Query {
    constructor(parts = {}) {
        super(Object.assign({ select: [], from: [], use_index: [], where: [], group_by: [], order_by: [] }, parts));
    }
    select(...args) {
        return this.append({ select: args });
    }
    from(...args) {
        const from = args.filter(x => typeof x === 'string'), update = { from }, objects = args
            .filter(x => typeof x === 'object')
            .forEach(x => x._from(update));
        return this.append(update);
    }
    hasCode(code) {
        return this.append({ code });
    }
    use_index(...args) {
        return this.append({ use_index: args });
    }
    where(...args) {
        return this.append({ where: args });
    }
    group_by(...args) {
        return this.append({ group_by: args });
    }
    order_by(...args) {
        return this.append({ order_by: args });
    }
    toString() {
        const { parts } = this, from = parts.from.slice(), where = parts.where.slice();
        if (parts.bucket) {
            from.push('`' + parts.bucket.id + '`');
        }
        if (parts.store) {
            where.push(parts.store._where(parts));
        }
        let query = `
                SELECT ${parts.select.join(',')}
                FROM ${from.join(',')}
            `;
        if (parts.use_index.length)
            query += `USE INDEX( ${parts.use_index.join(', ')} )\n`;
        if (where.length)
            query += `WHERE ${where.map(x => '(' + x + ')').join(' AND ')}\n`;
        if (parts.group_by.length)
            query += `GROUP BY ${parts.group_by.join(',')}\n`;
        if (parts.order_by.length)
            query += `ORDER BY ${parts.order_by.join(',')}\n`;
        return query;
    }
}
exports.SelectQuery = SelectQuery;
//# sourceMappingURL=select.js.map