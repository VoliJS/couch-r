import * as couchbase from 'couchbase';
import { Query } from './query';
export declare type MapReduceView = {
    map: string;
    reduce?: string;
};
export declare class MapReduceQuery extends Query {
    mapReduce: MapReduceView;
    _name: string;
    _designDoc: string;
    constructor(mapReduce: MapReduceView);
    bind(object: any, name: string): this;
    toJSON(): MapReduceView;
    create(): couchbase.ViewQuery;
}
export declare function mapReduce<K, V>(map: (emit: (key: K, value: V) => void) => (doc, meta: {
    id: string;
}) => void, reduce?: (key: K, values: V[], rereduce: boolean) => V): MapReduceQuery;
