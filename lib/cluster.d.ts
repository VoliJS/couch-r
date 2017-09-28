import { Messenger } from 'type-r';
import * as couchbase from 'couchbase';
import { Bucket } from './bucket';
export declare class Cluster extends Messenger {
    _buckets: {
        [name: string]: Bucket;
    };
    static onDefine({buckets, ...spec}: {
        [x: string]: any;
        buckets: any;
    }, BaseClass: any): void;
    constructor();
    api: any;
    connection: string;
    options: couchbase.ClusterConstructorOptions;
    connect(options?: {
        initialize: boolean;
    }): Promise<void>;
    log(level: any, message: any, object?: any): void;
    start(init?: any, options?: any): Promise<any>;
}
