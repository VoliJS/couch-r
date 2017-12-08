import { Record } from 'type-r';
export declare function promisifyAll(obj: object, ...names: string[]): void;
/**
 * Polymorphic record
 */
export declare class Document extends Record {
    _cas: any;
    /**
     * Type is written by collection and never used there.
     * Currently it's only reasonable usage is in mapReduce views
     */
    _type: string;
    static id: any;
}
export declare function base64(int32: any): string;
