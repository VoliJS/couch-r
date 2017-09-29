import { QueryParts } from './queries';
import { DocumentExtent, ExtentDefinition } from './extent';
import { DocumentsCollection } from './collection';
export interface BucketDefinition extends ExtentDefinition {
    collections?: {
        [name: string]: typeof DocumentsCollection;
    };
}
export declare class Bucket extends DocumentExtent {
    id: string;
    password: string;
    getDesignDocKey(viewName: string): string;
    log(level: any, message: any, props?: {}): void;
    cluster: any;
    api: any;
    _collections: DocumentsCollection[];
    static onDefine({collections, ...spec}: BucketDefinition): void;
    static readonly asProp: (proto: object, name: string) => void;
    private _manager;
    readonly manager: any;
    _from(queryParts: QueryParts): void;
    connect(cluster: any, initialize: boolean): Promise<void>;
    private _getIndexes();
}
