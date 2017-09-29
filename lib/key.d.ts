import { Document } from './common';
export declare type KeyCode<D> = (doc: Partial<D>) => string[];
export declare type KeyCounter<D> = (doc: Partial<D>) => string | string[];
export interface DocumentId<D> {
    type: string;
    code?: KeyCode<D>;
    counter?: boolean | KeyCounter<D>;
}
export declare class DocumentKey<D extends Document> implements DocumentId<D> {
    collection: any;
    type: string;
    code: KeyCode<D>;
    counter: boolean | KeyCounter<D>;
    constructor({type, code, counter}: DocumentId<D>, collection: any);
    defaultCounter(doc: Partial<D>): string;
    getCounterId(doc: Partial<D>): string;
    /**
     * counterValue( doc, code ) - take the next counter value
     */
    private getCounterValue(doc, next);
    make(doc: Partial<D>): Promise<string>;
    last(doc: Partial<D>, takeNext?: number): Promise<string>;
    /**
     * Get document key for the document
     *
     * get( shortId )
     * get( { document code attributes } ) - if counter === false
     * get( existingDocument )
     * get( newDocument )
     */
    get(doc: string | number | Partial<D> | string[], ignoreErrors?: true): string;
    toShort(fullId: string): string;
    fromShort(a_shortId: string | number): string;
}
