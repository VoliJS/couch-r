
export const SelectQuery = query({
    methods : {
        select : ( x : string[] ) => `SELECT ${ x.join( ', ' ) }`,
        from : ( x : string[] ) => `FROM ${x.join( ', ' )}`,
        where : ( arr : string[] ) => `WHERE ${ arr.map( x => `(${ x })` ).join( ' AND ' ) }`,
        limit : arr => `LIMIT ${ arr[ arr.length - 1 ] }`,
        offset : arr => `OFFSET ${ arr[ arr.length - 1 ] }`
    }
});

class GenericQuery {
    _toString : { [ name : string ] : ( x : any[] ) => string }
    _parts : { [ name : string ] : any[] }
    _keys : string[]

    constructor( other? ){
        this._parts = other ? { ...other._parts } : {};
    }

    _append( key : string, args : any[] ){
        const clone = new this.constructor( this );
        clone._parts[ key ] = ( clone._parts[ key ] || [] ).concat( args );
        return clone;
    }

    toString() : string {
        return this._keys
            .filter( x => this._parts[ x ] && this._parts[ x ].length )
            .map( x => this._toString[ x ]( this._parts[ x ] ) )
            .join( '\n' );
    };
}

function query( spec ){
    const keys = Object.keys( spec.methods );

    const Query = class extends GenericQuery {
    }

    Query.prototype._keys = keys;

    for( let key of keys ){
        Query.prototype[ key ] = spec[ key ] || function( ...args : any[] ){
            return this._append( key, args );
        }
    }
}