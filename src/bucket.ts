import { promisifyAll } from './common'
import { Query, QueryParts, index } from './queries'
import { N1qlQuery } from 'couchbase'
import { define, definitions, definitionDecorator, tools, mixinRules, MessengerDefinition, Messenger } from 'type-r'
import { DocumentExtent, ExtentDefinition } from './extent'
import { DocumentsCollection } from './collection'

const couchbaseErrors = require('couchbase/lib/errors');

export interface BucketDefinition extends ExtentDefinition {
    collections? : { [ name : string ] : typeof DocumentsCollection }
}

@define
@definitions({
    id : mixinRules.protoValue,
    password : mixinRules.protoValue,
    collections : mixinRules.merge
})
export class Bucket extends DocumentExtent {
    id : string
    password : string

    // For the bucket-level views, we have one design doc per view.
    getDesignDocKey( viewName : string ) : string {
        return viewName;
    }

    log( level, message, props = {} ){
        tools.log( level, `[Couch-R] Bucket ${ this.id } : ${ message }`, props );
    }

    cluster : any = null
    api : any = null

    _collections : DocumentsCollection[]

    static onDefine({ collections, ...spec } : BucketDefinition ){
        const { prototype } = this;
        prototype._collections = processSpec( prototype, collections );
        DocumentExtent.onDefine.call( this, spec );
    }

    static get asProp(){
        return definitionDecorator( 'buckets', this );
    }

    @index( '_type' ).asProp
    ix_collection_type : N1qlQuery

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
        const authVersion = cluster.options ? cluster.options.version : 5;

        if ( authVersion === 4 ) {
            this.api = await this.cluster.api.openBucket( this.id, this.cluster.authenticate.password );
        } else {
            this.api = await this.cluster.api.openBucket( this.id );
        }

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

        for( let collection of this._collections ){
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

function processSpec( self : Bucket, objects : { [ name : string ] : typeof DocumentsCollection } ) : DocumentsCollection[] {
    return objects ? Object.keys( objects ).map( name => (
        self[ name ] = objects[ name ].instance
    ) ) : [];
}

export interface IndexesSchema {
    [ name : string ] : string
}