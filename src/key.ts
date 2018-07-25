import { base64 } from './common'

const typeSeparator = '#',
      idSeparator = '~';

export type KeyCode = ( doc : object ) => string[]
export type KeyCounter = ( doc : object ) => string | string[]
export type DocumentKeySource = object | string | number | Array<string | number>

export interface DocumentId{
    type : string
    code? : KeyCode
    counter? : boolean | KeyCounter
}

export interface DocAlike {
    id : string | number
}

export class DocumentKey implements DocumentId {
    type : string
    code : KeyCode

    counter : boolean | KeyCounter
    
    constructor({ type, code, counter } : DocumentId, public collection ){
        this.type = type;
        this.code = code || null;
        this.counter = counter === void 0 || counter === true ? this.defaultCounter : counter;
    }

    defaultCounter( doc : DocAlike ) : string {
        // By default there is the separate counter for each `type#code`
        return this.get( doc, true );
    }

    // Parse full id to the array of strings.
    parse( fullId : string ) : string[] {
        const byType = fullId.split( typeSeparator );
        return byType[ byType.length - 1 ].split( idSeparator );
    }

    getCounterId( doc : DocAlike ) : string {
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
    private async getCounterValue( doc : DocAlike, next : number ) : Promise<string> {
        const counterId = this.getCounterId( doc );

        if( counterId ){
            const { value } = next > 0 ?
                await this.collection.api.counter( counterId, next, { initial : 0 } ):
                await this.collection.api.get( counterId ) - next;

            return base64( value );
        }

        return null;
    }

    async make( doc : DocAlike ) : Promise<string> {
        return this.last( doc, 1 );
    }

    // Return ID of the last document.
    async last( doc  : DocAlike, takeNext = 0 ) : Promise<string>{
        const { type } = this;

        // Return existing id...
        let { id } = doc;
        if( id ) return this.fromShort( id );

        // Create id part before counter
        let key  = this.get( doc, true );

        const counter = await this.getCounterValue( doc, takeNext );

        return counter ? key + ( this.code ? idSeparator : '' ) + counter : key;
    }

    /**
     * Get document key for the document
     * 
     * get( shortId )
     * get( { document code attributes } ) - if counter === false
     * get( existingDocument )
     * get( newDocument )
     */
    get( doc : DocumentKeySource, ignoreErrors? : true ) : string {
        const { type } = this;

        // Convert to full id.
        if( doc instanceof Array ) return this.fromShort( doc.join( idSeparator ) )
        if( typeof doc !== 'object' ) return this.fromShort( String( doc ) );

        // Return existing id, if it's present.
        const id = doc[ this.collection.idAttribute ];
        if( id ) return this.fromShort( id );
        
        if( this.counter && !ignoreErrors ){
            throw new Error( "Can't create full id for document with counter." );
        }

        return this.fromShort( this.code ? this.code( doc ).join( idSeparator ) : '' );
    }

    getShort( doc : DocumentKeySource ) : string {
        return this.toShort( this.get( doc ) );
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