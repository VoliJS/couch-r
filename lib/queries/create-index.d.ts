import { Query } from './query';
export declare class CreateIndexQuery extends Query {
    constructor(parts?: {});
    notEqual(index: any): boolean;
    bind(extent: any, name: string): this;
    fields(...args: string[]): this;
    where(...args: any[]): this;
    isEqual(existing: any): boolean;
    toString(): string;
}
export declare function index(...fields: string[]): CreateIndexQuery;
