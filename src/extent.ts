import { Messenger, MessengerDefinition, mixinRules, tools, define, definitions } from 'type-r'
import { Query, MapReduceQuery, MapReduceView } from './queries'
import { N1qlQuery, N1qlStringQuery, ViewQuery } from 'couchbase'

export type CouchbaseQuery = N1qlQuery | N1qlStringQuery | ViewQuery;

export interface ExtentDefinition extends MessengerDefinition {
    queries : {
        [ name : string ] : Query
    }
}

@define
@definitions({
    queries : mixinRules.merge
})
export abstract class DocumentExtent extends Messenger {
    static onDefine({ queries, ...spec } : ExtentDefinition, BaseClass ){
        this.prototype.queries = queries;
        this._instance = null;
        Messenger.onDefine.call( this, spec, BaseClass );
    }

    static _instance : DocumentExtent

    static get instance() : DocumentExtent {
        return this._instance || ( this._instance = new ( this as any )() );
    }

    queries : {
        [ name : string ] : Query
    }

    _designDocs : {
        [ name : string ] : DesignDocument
    } = {}

    abstract manager : any

    appendView( view, name ){
        const key = this.getDesignDocKey( name ),
            designDoc = this._designDocs[ key ] || ( this._designDocs[ key ] = new DesignDocument( key ) );

        designDoc.append( view, name );

        return key;
    }

    _indexes : string[] = []; 

    appendIndex( index, name ){
        this._indexes.push( name );
    }

    abstract getDesignDocKey( viewName : string )

    async onConnect( existingIndexes ){
        for( let name in this.queries ){
            // Connect query to the extent.
            const query = this.queries[ name ] = this.queries[ name ].bind( this, name );

            // Create the corresponding Couchbase query object.
            this[ name ] = query.create();
        }

        if( existingIndexes ){
            // Initialize design documents...
            await this.initViews();

            // Initialize indexes...
            return await this.initIndexes( existingIndexes );
        }
    }

    abstract api : any

    query( theQuery : CouchbaseQuery, options = {} ){
        return this.api.query( theQuery, options );
    }

    protected abstract log( level, message );

    private async initViews(){
        return Promise.all(
            Object.keys( this._designDocs )
                .map( name => this._designDocs[ name ].update( this ) )
        );
    }

    private async initIndexes( existingIndexes ) : Promise<string[]> {
        const toBuild : string[] = [];

        for( let name of this._indexes ){
            let existing = existingIndexes[ name ];
            const local : any = this.queries[ name ];

            if( existing && local.notEqual( existing ) ){
                this.log( 'info', `dropping index ${name}...` );
                await this.manager.dropIndex( name, { ignoreIfNotExists : true } );
                existing = null;
            }
            
            if( !existing ){
                this.log( 'info', `creating index ${name}...`);
                await this.query( this[ name ].consistency( 3 ) );
                toBuild.push( name );
            }
        }

        return toBuild;
    }
}

export class DesignDocument {
    views : { [ name : string ] : MapReduceView } = {}

    constructor( public id : string ){
    }
    // Append view to the document
    append( view : MapReduceQuery, name : string ){
        this.views[ name ] = view.toJSON();
    }

    // Updates view definition in the given bucket
    async update( bucket ){
        const { id, views } = this,
            { manager } = bucket;

        return manager
            .getDesignDocument( id )
            .then( doc => {
                if( tools.notEqual( views, doc.views ) ){
                    console.log( `[Couch-R] Updating design document "${ id }"...` );
                    return manager.upsertDesignDocument( id, { views });
                }
            })
            .catch( e => {
                console.log( `[Couch-R] Creating design document "${ id }"...` );
                return manager.upsertDesignDocument( id, { views });                
            });
    }
}

