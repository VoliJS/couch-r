import { promisifyAll } from './common'
import { tools, define, definitions, mixinRules, Messenger } from 'type-r'
import * as couchbase from 'couchbase'
import { Bucket } from './bucket'
import * as process from 'process'

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

@define
export class Cluster extends Messenger {
    constructor( private config : ClusterOptions ){
        super();

        tools.transform( this as any, config.buckets, ( bucket, id ) => {
            bucket.id = id;
            return bucket;
        });
    }

    public api : any

    async connect( options = { initialize : false } ){
        const { config } = this,
            api = this.api = new couchbase.Cluster( config.connection );

        const { username, password } = config.authenticate;
        api.authenticate( username, password );

        // Wrap API to promises...
        promisifyAll( api, 'query' );

        // Non-standard couchbase API for openBucket forces us to make custom promise wrapper...
        const openBucket = api.openBucket.bind( api );

        api.openBucket = ( name, password? ) => {
            return new Promise( ( resolve, reject ) => {
                const bucket = password ? openBucket( name, password, whenDone ) : openBucket( name, whenDone );

                function whenDone( err ){
                    err ? reject( err ) : resolve( bucket );
                }
            } );
        }

        this.log( 'info', `connecting bucket(s) ${ Object.keys( this.config.buckets ).join( ' ,' ) }...` );

        // Connect buckets one by one...
        for( let name in config.buckets ){
            await this[ name ].connect( this, options.initialize );
        }

        this.log( 'info', 'buckets are connected.' );

        process.on( 'SIGINT', this.stop );
    }

    log( level, message, object? ){
        tools.log( level, `[Couch-R] Cluster: ${ message }`, object);
    }

    async start( init? : ( cluster : this ) => Promise<any>, options? ){
        return this
            .connect( options )
            .then( () => {
                this.log( 'info', 'starting application...' );
                const res = init ? init( this ) : void 0;
                process.send && process.send('ready');
                return res;
            })
            .catch( error => {
                this.log( 'error', 'stopped due to unhandled exception' );
                console.log( error );
                process.exit( 1 );
            });
    }

    stop = () =>{
        // TODO: gracefully close DB connection and pending queries.
        process.exit( 0 );
    }
}

/**
 *  @define
    export const database = cluster({
        connection : config.couchbase.connection,
        authenticate : config.couchbase.authenticate,
        options : config.couchbase.options || {},

        buckets : { omnia, omnia_assets, omnia_history }
    });

    export default new Database();
 */

interface ClusterOptions {
    connection : string
    authenticate : { username : string, password : string }
    options : any
    buckets : { [ name : string ] : Bucket }
}

export function cluster<T extends ClusterOptions>( options : T ) : Cluster & { [ name in keyof T[ 'buckets' ]] : T[ 'buckets' ][ name ] }{
    return new Cluster( options ) as any;
}