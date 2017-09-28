import { Record } from 'type-r';
export declare function promisifyAll(obj: object, ...names: string[]): void;
/**
 * Polymorphic record
 */
export declare class Document extends Record {
    cas: string;
    static id: any;
}
export declare function base64(int32: any): string;
