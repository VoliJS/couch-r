import * as couchbase from 'couchbase';
export interface QueryParts {
    bucket?: any;
    index?: string;
    [name: string]: string[] | string | any;
}
export declare class Query {
    parts: QueryParts;
    constructor(parts: QueryParts);
    append(parts: QueryParts): this;
    readonly asProp: (proto: object, name: string) => void;
    bind(object: any, name: string): this;
    create(): couchbase.N1qlQuery | couchbase.ViewQuery;
    compile(): (params?: object) => Promise<any>;
    execute(): Promise<any>;
}
