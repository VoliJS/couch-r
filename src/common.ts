const { promisify } = require( 'util' );

import { define, attr, Record, Messenger, value } from 'type-r'

export function promisifyAll( obj : object, ...names : string[] ){
    for( let name of names ){
        obj[ name ] = promisify( obj[ name ] );
    }
}

/**
 * Polymorphic record
 */
@define
export class Document extends Record {
    @attr( value( void 0 ) )
    _cas : any

    /**
     * Type is written by collection and never used there.
     * Currently it's only reasonable usage is in mapReduce views
     */
    @attr( String )
    _type : string

    static id : any = String.value( null );

    static get ref(){
        return this.has
            .toJSON( x => ( x && x.id ) || null )
            .parse( x => {
                return { id : x };
            });
    }
}

var digitsStr = 
//   0       8       16      24      32      40      48      56     63
//   v       v       v       v       v       v       v       v      v
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
var digits = digitsStr.split('');

export function base64( int32 ){
    let code = "";
    
    do{
        code = digits[int32 & 0x3f] + code;
        int32 >>>= 6;
    }
    while( int32 )

    return code;
}
