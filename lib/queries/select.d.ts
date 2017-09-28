import { Query, QueryParts } from './query';
export declare function select(...fields: string[]): SelectQuery;
export declare class SelectQuery extends Query {
    constructor(parts?: {});
    select(...args: string[]): this;
    from(...args: ({
        _from(parts: QueryParts): void;
    } | string)[]): this;
    hasCode(code: string): this;
    use_index(...args: string[]): this;
    where(...args: string[]): this;
    group_by(...args: string[]): this;
    order_by(...args: string[]): this;
    toString(): string;
}
