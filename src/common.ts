import { promisify } from 'util'
import { define, attr, Record, Messenger, value } from 'type-r'
import { DocumentEndpoint } from './document';

export function promisifyAll( obj : object, ...names : string[] ){
    for( let name of names ){
        obj[ name ] = promisify( obj[ name ] );
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
