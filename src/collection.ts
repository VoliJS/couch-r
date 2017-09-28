import { tools, define, definitions, definitionDecorator, mixinRules, Messenger } from 'type-r'
import { base64, Document } from './common'
import { Query, SelectQuery, QueryParts } from './queries'
import { DocumentKey, DocumentId } from './key'
import { DocumentExtent } from './extent'
const couchbaseErrors = require('couchbase/lib/errors');


@define
@definitions({
    Document : mixinRules.protoValue,
    key : mixinRules.protoValue
})
export class DocumentsCollection<D extends Document> extends DocumentExtent {
    static Document : typeof Document
    Document : typeof Document

    static key : DocumentId<Document>

    key : DocumentKey<D>

    get asProp(){
        return definitionDecorator( 'collections', this );
    }

    // Document collections are uniquely identified with it's document key type.
    get id() : string {
        return this.key.type;
    }

    // For the document collections, there's one design doc for the collection.
    getDesignDocKey(){
        return this.id;
    }

    bucket = null;

    constructor(){
        super();
        this.key = new DocumentKey( this.key, this );
    }

    _from( queryParts : QueryParts ){
        this.bucket._from( queryParts );
        queryParts.store = this;
    }

    _where( parts : QueryParts ){
        let pattern = [ parts.store.key.type + '#' ],
            code = '';

        if( parts.code ){
            if( parts.code[ 0 ] === '$' ){
                pattern.push( parts.code );
            }
            else{
                pattern[ 0 ] += parts.code;
            }
        }

        if( pattern.length > 1 ){
            pattern.push( "%" );
        }
        else{
            pattern[ 0 ] += "%";
        }

        return `(meta(self).\`id\`) like ${ pattern.map( x => `"${x}"` ).join( ' || ') }`;
    }

    async connect( bucket, existingIndexes ){
        this.bucket = bucket;

        this.log( 'info', 'initializing...' );
        await super.onConnect( existingIndexes );
    }

    protected log( level, text ){
        tools.log( level, `[Couch-R] Collection ${ this.key.type }: ${ text }`);
    }

    get idAttribute(){
        return this.Document.prototype.idAttribute;
    }

    get api(){
        return this.bucket.api;
    }

    get manager(){
        return this.bucket.manager;
    }

    /**
     * get( shortId | longId ) - read document by its id.
     * get({ props }) when !idCounter - read document by composite key
     * get( document ) - fetch the document
     */
    async _get( id : Partial<D> | string, method : ( key : string ) => Promise< any > )  /* this.Document */ {
        if( !id ) return null;

        const doc = id instanceof this.Document ? id : null;
        const key = this.key.get( id );

        try{
            const { value, cas } = await method( key );
            value[ this.idAttribute ] = this.key.toShort( key );
            value.cas = cas;

            return doc ? doc.set( value, { parse : true } ) :
                         new this.Document( value, { parse : true } );
        }
        catch( e ){
            if ( e.code === couchbaseErrors.keyNotFound ) {
                return null;
            } else {
                throw e
            }
        }
    }

    async get( id, options = {} ){
        return this._get( id, key => this.api.get( key, options ) ) as Promise<D>;
    }

    async getAndLock( id, options = {} ){
        return this._get( id, key => this.api.getAndLock( key, options ) );
    }

    /**
     * unlock( document ) - unlock the previously locked document.
     */
    async unlock( doc, options = {} ){
        return this.api.unlock( this.key.get( doc ), doc.cas );
    }

    async getAndTouch( id, expiry, options = {} ){
        return this._get( id, key => this.api.getAndTouch( key, expiry, options ) );
    }

    /**
     * touch( doc, exp ) - touches the document.
     * touch( doc.id, exp ) - touches the document by its it.
     * touch({ attr1 : value, ... }) - touch the doc with a compund key.
     */
    async touch( doc, expiry, options = {} ){
        return this.api.touch( this.key.get( doc ), expiry, options );
    }

    async getMulti( ){
        // TODO: create/update collection.
    }

    async upsert( a_doc : Partial<D>, options = {} ){
        return this._insert( a_doc, 'upsert', options );
    }

    async insert( a_doc : Partial<D>, options = {} ){
        return this._insert( a_doc, 'insert', options );
    }

    async replace( a_doc : Partial<D>, options = {} ){
        return this._insert( a_doc, 'replace', options );
    }

    async _insert( a_doc : Partial<D>, method, options ){
        const doc = ( a_doc instanceof this.Document ? a_doc : new this.Document( a_doc ) ) as D,
            key = await this.key.make( doc );

        // TODO: handle idAttribute
        const json = doc.toJSON(),
            { cas } = json as any;

        delete ( json as any ).cas;
        delete json[ this.idAttribute ];

        await this.api[ method ]( key, json, cas ? { cas, ...options } : options );

        // Update document id.
        doc.id = this.key.toShort( key );

        this.trigger( 'write', doc, key, this );
        this.bucket.trigger( 'write', doc, key, this );

        return doc;
    }

    /**
     * remove( doc ) will check the cas.
     * remove( doc.id ) will ignore cas.
     * remove({ field : 'a', ... }) will delete doc with compond key.
     */
    async remove( document : Partial<D> | string, a_options = {} ){
        const key = this.key.get( document ),
            cas = typeof document === 'string' ? null : document.cas,
            doc = cas ? document : null;

        const options = cas ? { cas, ...a_options } : a_options;

        await this.api.remove( key, cas, options );

        this.trigger( 'remove', doc, key, this );
        this.bucket.trigger( 'remove', doc, key, this );
    }
}