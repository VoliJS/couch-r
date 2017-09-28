import { promisifyAll } from './common'
import { Query, QueryParts } from './queries'
import * as couchbase from 'couchbase'
import { define, definitions, definitionDecorator, tools, mixinRules, MessengerDefinition, Messenger } from 'type-r'
import { DocumentExtent, ExtentDefinition } from './extent'
import { DocumentsCollection } from './collection'

export interface BucketDefinition extends ExtentDefinition {
    collections? : { [ name : string ] : DocumentsCollection<any> }
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

    _collections : DocumentsCollection<any>[]

    static onDefine({ collections, ...spec } : BucketDefinition ){
        const { prototype } = this;
        prototype._collections = processSpec( prototype, collections );
        DocumentExtent.onDefine.call( this, spec );
    }

    get asProp(){
        return definitionDecorator( 'buckets', this );
    }

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
        this.api = await this.cluster.api.openBucket( this.id, this.password );

        // Promisify bucket api...
        promisifyAll( this.api, 'append', 'counter', 'get', 'getAndLock',
            'getAndTouch', 'getMulti', 'getReplica', 'insert', 'prepend', 'query', 'upsert', 'remove', 'replace' );

        let indexes;

        if( initialize ){
            this.log( 'info', 'initialize primary index...');
            await this.manager.createPrimaryIndex({ ignoreIfExists : true });

            indexes = await this._getIndexes();
            this.log( 'debug', 'existing indexes:', indexes );
        }

        await super.onConnect( indexes );

        this.log( 'info', 'connect document collections...');
        await Promise.all( this._collections.map( collection => collection.connect( this, indexes ) ) );
    }

    private async _getIndexes(){
        const asArray : any[] = await this.manager.getIndexes(),
            indexes : { [ name : string ] : { fields : string[], where : string } } = {};

        asArray.forEach( ({ name, condition, is_primary, index_key }) => {
            if( !is_primary ){
                indexes[ name ] = {
                    fields : index_key,
                    where : condition || ""
                };
            }
        });

        return indexes;
    }
}

function processSpec< T >( self : Bucket, objects : { [ name : string ] : T } ) : T[] {
    return objects ? Object.keys( objects ).map( name => (
        self[ name ] = objects[ name ]
    ) ) : [];
}