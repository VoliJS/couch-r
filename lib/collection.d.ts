import { Document } from './common';
import { QueryParts } from './queries';
import { DocumentKey, DocumentId } from './key';
import { DocumentExtent } from './extent';
export declare class DocumentsCollection<D extends Document = Document> extends DocumentExtent {
    static Document: typeof Document;
    Document: typeof Document;
    static key: DocumentId<Document>;
    static instance: DocumentsCollection<Document>;
    key: DocumentKey<D>;
    readonly asProp: (proto: object, name: string) => void;
    readonly id: string;
    getDesignDocKey(): string;
    bucket: any;
    constructor();
    _from(queryParts: QueryParts): void;
    _where(parts: QueryParts): string;
    connect(bucket: any, existingIndexes: any): Promise<void>;
    protected log(level: any, text: any): void;
    readonly idAttribute: string;
    readonly api: any;
    readonly manager: any;
    /**
     * get( shortId | longId ) - read document by its id.
     * get({ props }) when !idCounter - read document by composite key
     * get( document ) - fetch the document
     */
    _get(id: Partial<D> | string, method: (key: string) => Promise<any>): Promise<Document>;
    get(id: any, options?: {}): Promise<D>;
    getAndLock(id: any, options?: {}): Promise<Document>;
    /**
     * unlock( document ) - unlock the previously locked document.
     */
    unlock(doc: any, options?: {}): Promise<any>;
    getAndTouch(id: any, expiry: any, options?: {}): Promise<Document>;
    /**
     * touch( doc, exp ) - touches the document.
     * touch( doc.id, exp ) - touches the document by its it.
     * touch({ attr1 : value, ... }) - touch the doc with a compund key.
     */
    touch(doc: any, expiry: any, options?: {}): Promise<any>;
    getMulti(): Promise<void>;
    upsert(a_doc: Partial<D>, options?: {}): Promise<D>;
    insert(a_doc: Partial<D>, options?: {}): Promise<D>;
    replace(a_doc: Partial<D>, options?: {}): Promise<D>;
    _insert(a_doc: Partial<D>, method: any, options: any): Promise<D>;
    /**
     * remove( doc ) will check the cas.
     * remove( doc.id ) will ignore cas.
     * remove({ field : 'a', ... }) will delete doc with compond key.
     */
    remove(document: Partial<D> | string, a_options?: {}): Promise<void>;
}
