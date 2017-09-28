import * as couchbase from 'couchbase'
import { tools, definitionDecorator } from 'type-r'

export interface QueryParts {
    bucket? : any
    index? : string

    [ name : string ] : string[] | string | any
}

export class Query {
    constructor( public parts : QueryParts ){
    }

    append( parts : QueryParts ) : this {
        const query = new ( this.constructor as any )( this.parts );

        for( let name in parts ){
            const append = parts[ name ];
            query.parts[ name ] = Array.isArray( append ) ? query.parts[ name ].concat( append ) : append;
        }

        return query;
    }

    // Decorator's factory. Populate 'queries' definition.
    get asProp(){
        return definitionDecorator( 'queries', this );
    }

    // Bind to the bucket or document collection 
    bind( object, name : string ) : this {
        const update = { name };
        object._from( update );
        return this.append( update );
    }

    create() : couchbase.N1qlQuery | couchbase.ViewQuery {
        return couchbase.N1qlQuery.fromString( this.toString() );
    }

    compile(){
        const query = this.create(),
            { bucket } = this.parts as any;

        return async function( params? : object ){
            return params ? bucket.api.query( query, params ) : bucket.api.query( query );
        }
    }

    async execute(){
        return this.parts.bucket.api.query( this.create() );
    }
}