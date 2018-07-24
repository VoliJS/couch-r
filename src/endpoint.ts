import { define, IOEndpoint, definitionDecorator, mixinRules, Record, Collection, tools } from 'type-r'
import { DocumentsCollection } from './collection'
import { N1qlStringQuery, N1qlQuery} from 'couchbase'
import { select, selectDocs, Query } from './queries'

import { DocumentId, DocumentKey } from './key'
import { Document } from './common'
import { Messenger } from 'type-r';
import { DocumentExtent } from './extent';

const couchbaseErrors = require('couchbase/lib/errors');

const defaultRecord = { idAttribute : 'id' };

//type DocumentKey = string | number | object /* doc fields to construct the key */;

interface ReadOptions {
    lock? : boolean
    touch? : boolean
    expiry? : number
    ioUpdate? : boolean
}

interface WriteOptions {
    method? : 'upsert' | 'insert' | 'update',
    attributes? : string
    expiry? : number
    persist_to? : number
    replicate_to? : number
    ioUpdate? : boolean
}

interface JsonDocument {
    _cas : string
    _type : string
    [ key : string ] : any
}

interface ListOptions {
    // Name of the endpoint filter
    filter? : string
    ioUpdate? : boolean

    // Filter's options
    params? : object
}

@define
export class DocumentEndpoint extends DocumentExtent implements IOEndpoint {
    bucket = null
    key : DocumentKey<Document>

    protected log( level, text ){
        tools.log( level, `[Couch-R] documents ${ this.key.type }: ${ text }`);
    }

    // Document collections are uniquely identified with it's document key type.
    get id() : string {
        return this.key.type;
    }

    // For the document collections, there's one design doc for the collection.
    getDesignDocKey(){
        return this.id;
    }

    get api(){
        return this.bucket.api;
    }

    get manager(){
        return this.bucket.manager;
    }
    
    async connect( bucket, initialize : boolean ){
        this.bucket = bucket;

        // Compile filters...
        tools.transform( this as any, this.filters, ( filter, name ) => (
            typeof filter === 'function' ?
                ( params : object ) => filter.call( this, params ).create().adhoc( true ) :
                ( filter.create() as N1qlStringQuery ).adhoc( false )
        ));
        
        this.log( 'info', 'initializing...' );
        await super.onConnect( initialize );
    }

    constructor( options ){
        super( options );
        this.key = new DocumentKey( options.key, this );
        this.filters.all = selectDocs();
    }

    filters : { [ name : string ] : Query | ( ( params : object ) => Query ) } = {};

    fetchPreviousOnUpdate: boolean

    async list( { filter = 'all', params = {} } : ListOptions, collection?: any ): Promise<JsonDocument[]> {
        if( !this.filters[ filter ] ) throw new ReferenceError( 'No such filter: ' + filter );

        const q = this[ filter ];
        return this.queryFilter( typeof q === 'function' ? this[ filter ]( params ) : q, params, collection.model.prototype.idAttribute );
    }

    // Initiate mutation.
    mutateIn( id ){
        return this.api.mutateIn( this.key.get( id ) );
    }

    // Execute mutation and return cas.
    async execute( builder ) : Promise<any> {
        return new Promise( ( resolve, reject ) => {
            builder.execute( ( error, result ) =>{
                if( error ) reject( error );
                else resolve( result.cas );
            } );
        }) as any;
    }

    protected async queryFilter( query : N1qlStringQuery, options = {}, idAttribute = 'id' ) : Promise<JsonDocument[]>{
        const rows = await this.api.query( query.consistency( 2 ), options );
        return rows.map( row => this.bodyToJson( row[ this.bucket.id ], row.id, row.cas, idAttribute ));
    }

    // Generate ID and insert.
    async create(json: any, options: object, record = defaultRecord ): Promise< object >{
        const id = await this.key.make( json ),
            shortId = this.key.toShort( id ),
            { cas } = await this.api.insert( id, this.jsonToBody( json, record.idAttribute ), options );

        this.notifyOnUpdate( this.bodyToJson( json, shortId, cas, record.idAttribute ) );

        return { _cas : cas, [ record.idAttribute ] : shortId, _type : this.key.type };
    }
    
    // Upsert. Must privide the valid id.
    async update(id: string | number, json: JsonDocument, { method, attributes, ...options } : WriteOptions = {}, record = defaultRecord ): Promise<object>{

        // MAYBE we need to *require* CAS when `fetchPreviousOnUpdate` is true.
        // Otherwise we can't guarantee that `prev` is really previous version
        let prev : JsonDocument = this.fetchPreviousOnUpdate ? await this.read( id ) : null;

        const key = this.key.get( id );
        let cas;

        if( attributes ){
            const paths = attributes.split( /\s+/ );

            let builder = this.mutateIn( id );

            for( let path of paths ){
                // FIXME: support deep path lookups in JSON. path can be "a.b.c"
                builder = builder.upsert( path, json[ path ], { createParents : true });
            }

            cas = await this.execute( builder );
        }
        else{
            const { _cas } = json;
            cas = ( await this.api[ method || 'upsert' ]( key, this.jsonToBody( json, record.idAttribute ), _cas ? { cas : _cas, ...options } : options ) ).cas;
        }

        this.notifyOnUpdate( this.bodyToJson( json, key, cas, record.idAttribute ), prev );

        return cas ? { _cas : cas, _type : this.key.type } : { _type : this.key.type };
    }

    protected notifyOnUpdate( json : JsonDocument, prev? : JsonDocument ) : void {
        this.trigger( 'updated', json, prev );
        this.bucket.trigger( 'updated', json, prev );
    }
    
    async read(id: any, options: ReadOptions = {}, record = defaultRecord ): Promise<JsonDocument> {
        const fullId = this.key.get( id ),
        { value, cas } = options.lock ? await this.api.getAndLock( fullId ) :
                            options.touch ? await this.api.getAndTouch( fullId, options.expiry ) :
                            await this.api.get( fullId );

        return this.bodyToJson( value, fullId, cas, record.idAttribute );
    }
    
    async destroy( id: string | number | object, options = {}, record = defaultRecord ): Promise<void>{
        const key = this.key.get( id );
        await this.api.remove( key, options );
        const shortId = this.key.toShort( key );

        this.trigger( 'removed', shortId, this );
        this.bucket.trigger( 'removed', shortId, this );
    }
    
    async subscribe(events, collection: Messenger ): Promise<any>{
        collection.listenTo( this, events ); 
    }
    
    unsubscribe(events, collection: Messenger ): void {
        collection.stopListening( this );
    }

    // Modify body to be serialized JSON record representation
    private bodyToJson( body : any, id, cas : string, idAttribute = 'id' ) : JsonDocument {
        body[ idAttribute ] = this.key.toShort( id );
        cas && ( body._cas = cas );
        body._type = this.key.type;

        return body;
    }

    private jsonToBody( json : JsonDocument, idAttribute = 'id' ) : object {
        const docBody : any = tools.omit( json, '_cas', idAttribute );
        docBody._type = this.key.type;
        return docBody;        
    }
}

export function documentIO<T extends EndpointSpec>( spec : T ) : DocumentEndpoint & { [ name in keyof T[ "queries" ] ] : N1qlStringQuery } & T {
    return new DocumentEndpoint( spec ) as any;
}

export interface EndpointSpec {
    queries? : { [ name : string ] : Query }
    key : DocumentId< Document >
}