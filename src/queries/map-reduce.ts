import * as couchbase from 'couchbase'
import { Query } from './query'

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
    reduce? : ( key : K, values : V[], rereduce : boolean ) => V
) : MapReduceQuery {

    const mapReduce : MapReduceView = { map : stringify( map( ( key, value ) => void 0 ) ) };

    if( reduce ){
        mapReduce.reduce = stringify( reduce );
    }

    return new MapReduceQuery( mapReduce );
}

function stringify( method : Function ) : string {
    return method.toString()
                 // Remove emit
                 .replace( /^\s*emit\s*=>\s*/, '' )
                 // Remove arrow function
                 .replace( /^\w*\((.*?)\)\s*=>\s*/, 'function($1)');
}