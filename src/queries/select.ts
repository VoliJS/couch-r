import { Query, QueryParts } from './query'

export function select( ...fields : string[] ){
    return new SelectQuery({ select : fields });
}

export class SelectQuery extends Query {
    constructor( parts = {} ){
        super({
            select : [],
            from : [],
            use_index : [],
            where : [],
            group_by : [],
            order_by : [],
            ...parts
        });
    }

    select( ...args : string[] ){
        return this.append({ select : args } );
    }

    from( ...args : ( { _from( parts : QueryParts) : void } | string )[] ){
        const from = args.filter( x => typeof x === 'string' ),
            update = { from },
            objects = args
                .filter( x => typeof x === 'object' )
                .forEach( x => ( x as any )._from( update ) );

        return this.append( update );
    }

    hasCode( code : string ){
        return this.append({ code });
    }

    use_index( ...args : string[] ){
        return this.append({ use_index : args } );
    }

    where( ...args : string[] ){
        return this.append({ where : args } );
    }

    group_by( ...args : string[] ){
        return this.append({ group_by : args } );
    }

    order_by( ...args : string[] ){
        return this.append({ order_by : args });
    }

    toString(){
        const { parts } = this,
            from = parts.from.slice(),
            where = parts.where.slice();
            
        if( parts.bucket ){
            from.push( '`' + parts.bucket.name + '`' );
        }

        if( parts.store ){
            where.push( parts.store._where( parts ) );
        }
        
        let query = `
                SELECT ${ parts.select.join( ',' ) }
                FROM ${ from.join( ',' ) }
            `;

        if( parts.use_index.length ) query += `USE INDEX( ${ parts.use_index.join( ', ' ) } )\n`;
        if( where.length ) query += `WHERE ${ where.map( x => '(' + x + ')' ).join( ' AND ' ) }\n`;
        if( parts.group_by.length ) query += `GROUP BY ${ parts.group_by.join( ',' ) }\n`;
        if( parts.order_by.length ) query += `ORDER BY ${ parts.order_by.join( ',' ) }\n`;

        return query;
    }
}
