import { Messenger, MessengerDefinition, mixinRules, tools, define, definitions } from 'type-r'
import { Query, MapReduceQuery, MapReduceView, SelectQuery } from './queries'
import { N1qlQuery, N1qlStringQuery, ViewQuery } from 'couchbase'

export interface IndexesSchema {
    [ name : string ] : string
}

export type CouchbaseQuery = N1qlQuery | N1qlStringQuery | ViewQuery;

export interface ExtentDefinition {
    queries? : Queries
}

interface Queries {
    [ name : string ] : Query
}

@define
export abstract class DocumentExtent extends Messenger {
    constructor( { queries } : ExtentDefinition ){
        super();
        this.queries = queries;
    }

    queries : Queries

    abstract manager : any

    _indexes : string[] = []; 

    appendIndex( index, name ){
        this._indexes.push( name );
    }

    _designDocs : {
        [ name : string ] : DesignDocument
    } = {}

    appendView( view, name ){
        const key = this.getDesignDocKey( name ),
            designDoc = this._designDocs[ key ] || ( this._designDocs[ key ] = new DesignDocument( key ) );

        designDoc.append( view, name );

        return key;
    }

    abstract getDesignDocKey( viewName : string )

    async onConnect( initialize: boolean ) {
        for( let name in this.queries ){
            const q = this.queries[ name ];

            // Connect query to the extent.
            const query = this.queries[ name ] = q.bind( this, name );

            // Create the corresponding Couchbase query object.
            this[ name ] = q instanceof SelectQuery ? ( query.create() as N1qlStringQuery ).adhoc( false ) : query.create();
        }

        if( initialize ){
            // Initialize design documents...
            await this.updateViews();
        }
    }

    abstract api : any

    query( theQuery : CouchbaseQuery, options = {} ){
        return this.api.query( theQuery, options );
    }

    protected abstract log( level, message );

    private async updateViews(){
        return Promise.all(
            Object.keys( this._designDocs )
                .map( name => this._designDocs[ name ].update( this ) )
        );
    }

    async updateIndexes( existingIndexes : IndexesSchema ) : Promise<string[]> {
        const toBuild : string[] = [];

        for( let name of this._indexes ){
            let existing = existingIndexes[ name ];
            const local : any = this.queries[ name ];

            if( existing && local.toString() !== existing ){
                this.log( 'info', `dropping index ${name}...` );
                await this.manager.dropIndex( name, { ignoreIfNotExists : true } );
                existing = null;
            }
            
            if( !existing ){
                this.log( 'info', `creating index ${name}...`);
                try{
                    await this.query( this[ name ].consistency( N1qlQuery.Consistency.STATEMENT_PLUS ) );
                }
                catch( e ){
                    // Workaround for the first run on the existing database...
                    await this.manager.dropIndex( name, { ignoreIfNotExists : true } );
                    await this.query( this[ name ].consistency( N1qlQuery.Consistency.STATEMENT_PLUS ) );
                }

                toBuild.push( name );
                existingIndexes[ name ] = local.toString();
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