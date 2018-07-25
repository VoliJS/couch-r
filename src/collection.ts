import { tools, define, definitions, definitionDecorator, Collection, mixinRules, Messenger } from 'type-r'
import { Query, SelectQuery, select, QueryParts } from './queries'
import { DocumentKey, DocumentId, DocumentKeySource, DocAlike } from './key'
import { DocumentExtent, CouchbaseQuery } from './extent'
import { Document, DocumentEndpoint } from './document';
const couchbaseErrors = require('couchbase/lib/errors');

@define
@definitions({
    Document : mixinRules.protoValue,
    key : mixinRules.protoValue
})
export class DocumentsCollection<D extends Document = Document> extends DocumentEndpoint {
    static Document : typeof Document
    Document : typeof Document

    toDocument( row ) : D {
        const value = row[ this.bucket.id ];

        return new this.Document({
            id : this.key.toShort( row.id ),
            _cas : row.cas,
            ...value
        }) as D;
    }

    // Select query template to scan and return all docs.
    get selectDocs() : SelectQuery {
        const { id } = this.bucket;

        return select( '*', `meta(\`${id}\`).id`, `TOSTRING(meta(\`${id}\`).cas) as cas` )
                .from( this )
    }

    // Query complete documents
    async queryDocs( query : CouchbaseQuery ) : Promise<Collection<D>>{
        const rows = await this.query( query );

        return new this.Document.Collection<any>(
            rows.map( row => this.toDocument( row ) )
        );
    }

    _from( queryParts : QueryParts ){
        this.bucket._from( queryParts );
        queryParts.store = this;
    }

    _where( parts : QueryParts ){
        return `\`_type\` = "${parts.store.key.type}"`;
    }

    get idAttribute(){
        return this.Document.prototype.idAttribute;
    }

    /**
     * get( shortId | longId ) - read document by its id.
     * get({ props }) when !idCounter - read document by composite key
     * get( document ) - fetch the document
     */
    async _get( id : DocumentKeySource, method : ( key : string ) => Promise< any > )  /* this.Document */ {
        if( !id ) return null;

        const doc = id instanceof this.Document ? id : null;
        const key = this.key.get( id );

        try{
            const { value, cas } = await method( key );
            value[ this.idAttribute ] = this.key.toShort( key );
            value._cas = cas;
            value._type = this.key.type;

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

    async get( id : DocumentKeySource, options = {} ) : Promise<D> {
        return this._get( id, key => this.api.get( key, options ) ) as Promise<D>;
    }

    async getAndLock( id : DocumentKeySource, options = {} ){
        return this._get( id, key => this.api.getAndLock( key, options ) ) as Promise<D>;
    }

    /**
     * unlock( document ) - unlock the previously locked document.
     */
    async unlock( doc, options = {} ){
        return this.api.unlock( this.key.get( doc ), doc._cas );
    }

    async getAndTouch( id : DocumentKeySource, expiry, options = {} ){
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

    async upsert( a_doc : DocAlike, options = {} ){
        return this._insert( a_doc, 'upsert', options );
    }

    async insert( a_doc : DocAlike, options = {} ){
        return this._insert( a_doc, 'insert', options );
    }

    async replace( a_doc : DocAlike, options = {} ){
        return this._insert( a_doc, 'replace', options );
    }

    async _insert( a_doc : DocAlike, method, options ){
        const doc = a_doc instanceof this.Document ? a_doc : new this.Document( a_doc ),
            key = await this.key.make( doc );

        // TODO: handle idAttribute
        const json = doc.toJSON(),
             cas = (json as any)._cas;

        ( json as any )._type = this.key.type;

        let result = await this.api[ method ]( key, tools.omit( json, '_cas', this.idAttribute ), cas ? { cas, ...options } : options );

        // Update document cas and id (and type, since it not used before insert)
        doc.set({
            id: this.key.toShort( key ),
            _cas: result.cas,
            _type: this.key.type
        })

        this.trigger( 'write', doc, key, this );
        this.bucket.trigger( 'write', doc, key, this );

        // Hack! Send IOEndpoints events.
        ( json as any )._cas = result.cas;
        this.trigger( 'update', json );
        this.bucket.trigger( 'update', json );

        return doc;
    }

    /**
     * remove( doc ) will check the cas.
     * remove( doc.id ) will ignore cas.
     * remove({ field : 'a', ... }) will delete doc with compond key.
     */
    async remove( document : Partial<D> | string, a_options = {} ){
        const key = this.key.get( document ),
            cas = typeof document === 'string' ? null : document._cas,
            doc = cas ? document : null;

        const options = cas ? { cas, ...a_options } : a_options;

        await this.api.remove( key, options );

        const shortId = this.key.toShort( key );
        this.trigger( 'remove', doc, shortId, this );
        this.bucket.trigger( 'remove', doc, shortId, this );

        // Hack! Send IOEndpoints events...
        this.trigger( 'removed', shortId );
        this.bucket.trigger( 'removed', shortId );

    }
}