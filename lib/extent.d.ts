import { Messenger, MessengerDefinition } from 'type-r';
import { Query, MapReduceQuery, MapReduceView } from './queries';
import { N1qlQuery, N1qlStringQuery, ViewQuery } from 'couchbase';
export declare type CouchbaseQuery = N1qlQuery | N1qlStringQuery | ViewQuery;
export interface ExtentDefinition extends MessengerDefinition {
    queries: {
        [name: string]: Query;
    };
}
export declare abstract class DocumentExtent extends Messenger {
    static onDefine({queries, ...spec}: ExtentDefinition, BaseClass: any): void;
    static _instance: DocumentExtent;
    static readonly instance: DocumentExtent;
    queries: {
        [name: string]: Query;
    };
    _designDocs: {
        [name: string]: DesignDocument;
    };
    abstract manager: any;
    appendView(view: any, name: any): any;
    _indexes: string[];
    appendIndex(index: any, name: any): void;
    abstract getDesignDocKey(viewName: string): any;
    onConnect(exitsingIndexes: any): Promise<void>;
    abstract api: any;
    query(theQuery: CouchbaseQuery, options?: {}): any;
    protected abstract log(level: any, message: any): any;
    private initViews();
    private initIndexes(existingIndexes);
}
export declare class DesignDocument {
    id: string;
    views: {
        [name: string]: MapReduceView;
    };
    constructor(id: string);
    append(view: MapReduceQuery, name: string): void;
    update(bucket: any): Promise<any>;
}
