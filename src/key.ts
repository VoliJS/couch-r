import { base64, Document } from './common'
import { tools } from 'type-r'

const typeSeparator = '#',
      idSeparator = '~';

export type KeyCode<D> = ( doc : Partial<D> ) => string[]
export type KeyCounter<D> = ( doc : Partial<D> ) => string | string[]

export interface DocumentId<D>{
    type : string
    code? : KeyCode<D>

    counter? : boolean | KeyCounter<D>
}

export class DocumentKey<D extends Document> implements DocumentId<D> {
    type : string
    code : KeyCode<D>

    counter : boolean | KeyCounter<D>
    
    constructor({ type, code, counter } : DocumentId<D>, public collection ){
        this.type = type;
        this.code = code || null;
        this.counter = counter === void 0 || counter === true ? this.defaultCounter : counter;
    }

    defaultCounter( doc : Partial<D> ) : string {
        // By default there is the separate counter for each `type#code`
        return this.get( doc, true );
    }

    getCounterId( doc : Partial<D> ) : string {
        // All counter ids starts with typeSeparator. #...
        if ( typeof this.counter === 'function' ) {
            const id = this.counter( doc )
            return typeSeparator + (id instanceof Array ? id.join( typeSeparator ) : id)
        } else {
            return null
        }
    }

    /**
     * counterValue( doc, code ) - take the next counter value
     */
    private async getCounterValue( doc : Partial<D>, next : number ) : Promise<string> {
        const counterId = this.getCounterId( doc );

        if( counterId ){
            const { value } = next > 0 ?
                await this.collection.api.counter( counterId, next, { initial : 0 } ):
                await this.collection.api.get( counterId ) - next;

            return base64( value );
        }

        return null;
    }

    async make( doc : Partial<D> ) : Promise<string> {
        return this.last( doc, 1 );
    }

    // Return ID of the last document.
    async last( doc  : Partial<D>, takeNext = 0 ) : Promise<string>{
        const { type } = this;

        // Return existing id...
        let { id } = doc;
        if( id ) return this.fromShort( id );

        // Create id part before counter
        let key  = this.get( doc, true );

        const counter = await this.getCounterValue( doc, takeNext );

        return counter ? key + idSeparator + counter : key;
    }

    /**
     * Get document key for the document
     * 
     * get( shortId )
     * get( { document code attributes } ) - if counter === false
     * get( existingDocument )
     * get( newDocument )
     */
    get( doc : string | Partial<D> | string[], ignoreErrors? : true ){
        const { type } = this;

        // Convert to full id.
        if( typeof doc === 'string' ) return this.fromShort( doc );
        if( doc instanceof Array ) return this.fromShort( doc.join( idSeparator ) )

        // Return existing id, if it's present.
        const id = doc[ this.collection.idAttribute ];
        if( id ) return this.fromShort( id );
        
        if( this.counter && !ignoreErrors ){
            throw new Error( "Can't create full id for document with counter." );
        }

        return this.fromShort( this.code( doc ).join( idSeparator ) );
    }

    toShort( fullId : string ) : string {
        const edge = fullId.indexOf( typeSeparator );
        return edge >= 0 ? fullId.substr( edge + 1 ) : fullId;
    }

    fromShort( a_shortId : string | number ) : string {
        const shortId = String( a_shortId );
        return shortId.indexOf( typeSeparator ) >= 0 ?
                    shortId :
                    `${ this.type }${ typeSeparator }${ shortId }`;
    }
}