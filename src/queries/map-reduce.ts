import * as couchbase from 'couchbase'
import { Query } from './query'
import {type} from "os";

export type MapReduceView = {
    map : string,
    reduce? : string
}

export class MapReduceQuery extends Query {
    _name : string
    _designDoc : string
    
    constructor( public mapReduce : MapReduceView ){
        super( {} );
    }

    bind( object, name : string ){
        this._designDoc = object.appendView( this, name );
        this._name = name;
        return this;
    }

    toJSON(){
        return this.mapReduce;
    }

    create() {
        return couchbase.ViewQuery.from( this._designDoc, this._name );
    }
}

export function mapReduce<K, V>(
    map : ( emit : ( key : K, value : V ) => void ) => ( doc, meta : { id : string }) => void,
    reduce? : ( key : K, values : V[], rereduce : boolean ) => V,
    includeMap? : object
) : MapReduceQuery {

    const mapReduce : MapReduceView = { map : stringify( map( ( key, value ) => void 0 ), includeMap ) };

    if( reduce ){
        mapReduce.reduce = stringify( reduce, includeMap );
    }

    return new MapReduceQuery( mapReduce );
}

function stringify( method : Function, includeMap : object ) : string {
    return method.toString()
                 // Remove emit
                 .replace( /^\s*emit\s*=>\s*/, '' )
                 // Remove arrow function
                 .replace( /^\w*\((.*?)\)\s*=>\s*/, 'function($1)')
                 .replace( /^\w*\s+(.*?)\s*=>\s*/, 'function($1)') //1 arg version
                 // process //@include
                 .replace(/\/\/\s*@include\s*\((.+?)\)/g, ( match, ...args ) => {
                     const param = args[0],
                           names = param.split(',').map( str => str.trim() );
                     return names.map( name => {
                                        const item = includeMap[ name ],
                                              content = typeof item === "string"
                                                  ? JSON.stringify(item) //mainly for escape quotes
                                                  : item.toString();
                                        return '//included: ' + name + '\n' +
                                               'var ' + name + ' = ' + content + ';\n'
                                    } )
                                   .join( '\n' )
                 });
}