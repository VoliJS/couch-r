import { promisifyAll } from './common'
import { tools, define, definitions, mixinRules, Messenger } from 'type-r'
import * as couchbase from 'couchbase'
import { Bucket } from './bucket'
import { exit } from 'process'

@define
@definitions({
    buckets : mixinRules.merge,
    connection : mixinRules.protoValue,
    options : mixinRules.protoValue
})
export class Cluster extends Messenger {
    _buckets : { [ name : string ] : typeof Bucket }

    static onDefine({ buckets, ...spec }, BaseClass ){
        this.prototype._buckets = buckets;
        Messenger.onDefine.call( this, spec );
    }

    static _instance : Cluster

    static get instance() : Cluster {
        return this._instance || ( this._instance = new (this as any)() );
    }

    constructor(){
        super();
        tools.transform( this as any, this._buckets, Ctor => Ctor.instance );
    }

    api : any

    connection : string
    options : couchbase.ClusterConstructorOptions

    async connect( options = { initialize : false } ){
        // Create cluster...
        this.api = new couchbase.Cluster( this.connection );
        
        // Wrap API to promises...
        promisifyAll( this.api, 'query' );

        // Crappy couchbase API for openBucket forces us to make custom promise wrapper...
        const openBucket = this.api.openBucket.bind( this.api );

        this.api.openBucket = ( name, password? ) => {
            return new Promise( ( resolve, reject ) => {
                const bucket = password ? openBucket( name, password, whenDone ) : openBucket( name, whenDone );
                
                function whenDone( err ){
                    err ? reject( err ) : resolve( bucket );
                }
            } );
        }

        this.log( 'info', 'connecting...' );

        for( let name in this._buckets ){
            await this[ name ].connect( this, options.initialize );
        }
    }

    log( level, message, object? ){
        tools.log( level, `[Couch-R] Cluster: ${ message }`, object);
    }

    async start( init? : ( cluster : this ) => Promise<any>, options? ){
        return this
            .connect( options )
            .then( () => {
                this.log( 'info', 'starting application...' );
                return init ? init( this ) : void 0;
            })
            .catch( error => {
                this.log( 'error', 'stopped due to unhandled exception' );
                console.log( error );
                exit( 1 );
            });
    }
}