import { promisifyAll } from './common'
import { Query, QueryParts, index } from './queries'
import { N1qlQuery } from 'couchbase'
import { define, definitions, definitionDecorator, tools, mixinRules, MessengerDefinition, Messenger, IOEndpoint } from 'type-r'
import { DocumentExtent, ExtentDefinition, IndexesSchema } from './extent'
import { DocumentEndpoint, Document } from './document'

const couchbaseErrors = require('couchbase/lib/errors');

export interface BucketDefinition extends ExtentDefinition {
    documents : { [ name : string ] : typeof Document }
}

@define
export class Bucket extends DocumentExtent {
    private endpoints : DocumentEndpoint[]

    constructor( options : BucketDefinition ){
        super( options );
        this.queries.ix_collection_type = index( '_type' );
        this.endpoints = Object.keys( options.documents ).map( x => options.documents[ x ].endpoint );
    }

    id : string

    // For the bucket-level views, we have one design doc per view.
    getDesignDocKey( viewName : string ) : string {
        return viewName;
    }

    log( level, message, props = {} ){
        tools.log( level, `[Couch-R] Bucket ${ this.id } : ${ message }`, props );
    }

    cluster : any = null
    api : any = null

    documents : { [ name : string ] : typeof Document }

    private _manager : any
    get manager(){
        if( !this._manager ){
            this._manager = this.api.manager();
            promisifyAll( this._manager, 'getDesignDocument', 'upsertDesignDocument', 'createPrimaryIndex', 'getIndexes', 'dropIndex' );
        }
        
        return this._manager;
    }

    _from( queryParts : QueryParts ){
        queryParts.bucket = this;
    }
    
    async connect( cluster : any, initialize : boolean ){
        this.cluster = cluster;

        this.log( 'info', `connecting...` );

        this.api = await this.cluster.api.openBucket( this.id );

        // Promisify bucket api...
        promisifyAll( this.api, 'append', 'counter', 'get', 'getAndLock',
            'getAndTouch', 'touch', 'getMulti', 'getReplica', 'insert', 'prepend', 'query', 'upsert', 'remove', 'replace', 'unlock' );

        await super.onConnect( initialize );

        if( initialize ){
            this.log( 'info', 'initialize primary index...');
            await this.manager.createPrimaryIndex( {name: 'ix_primary', ignoreIfExists: true},  );
        }

        let indexes : IndexesSchema, toBuild;
        
        if ( initialize ) {
            indexes = await this._getIndexes();
            this.log( 'info', 'existing indexes:', indexes );

            toBuild = await this.updateIndexes(indexes)
        } else {
            toBuild = []
        }

        this.log( 'info', 'connect document collections...');

        for( let collection of this.endpoints ){
            await collection.connect( this, initialize );
            if ( initialize ) {
                const cIndexes : string[] = await collection.updateIndexes(indexes);
                toBuild = toBuild.concat( cIndexes );
            }
        }

        if( toBuild.length ){
            const buildIndexes = N1qlQuery.fromString( `
                BUILD INDEX ON \`${this.id}\`(${ toBuild.join( ',' )}) USING GSI;
            `);
            await this.query( buildIndexes.consistency( N1qlQuery.Consistency.STATEMENT_PLUS ) );

            await this.api.upsert( "##schema", { indexes } );
        }
    }

    private async _getIndexes() : Promise<IndexesSchema> {
        let schema;
    
        try {
            const { value } = await this.api.get( '##schema' );
            schema = value;
        }
        catch( e ){
            if ( e.code === couchbaseErrors.keyNotFound ) {
                schema = {
                    indexes : {}
                };
            }
            else throw e;
        }
        
        return schema.indexes;
    }
}

export function bucket<T extends BucketDefinition>( options : T ) : Bucket & T {
    return new Bucket( options ) as any;
}