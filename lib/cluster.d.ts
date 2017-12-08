import { Messenger } from 'type-r';
import * as couchbase from 'couchbase';
import { Bucket } from './bucket';
export declare class Cluster extends Messenger {
    _buckets: {
        [name: string]: typeof Bucket;
    };
    static onDefine({buckets, ...spec}: {
        [x: string]: any;
        buckets: any;
    }, BaseClass: any): void;
    static _instance: Cluster;
    static readonly instance: Cluster;
    constructor();
    api: any;
    connection: string;
    options: couchbase.ClusterConstructorOptions;
    authenticate: {
        username: string;
        password: string;
    };
    connect(options?: {
        initialize: boolean;
    }): Promise<void>;
    log(level: any, message: any, object?: any): void;
    start(init?: (cluster: this) => Promise<any>, options?: any): Promise<any>;
}
