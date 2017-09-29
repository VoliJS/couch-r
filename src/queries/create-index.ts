import { Query } from './query'
import { tools } from 'type-r'

export class CreateIndexQuery extends Query {
    constructor( parts = {} ){
        super({
            where : [],
            name : '',
            fields : [],
            ...parts
        });
    }

    notEqual( index ) : boolean {
        const { where } = index,
            fields = index.fields.map( x => x.replace( /`/g, '' ) );

        return tools.notEqual( fields, this.parts.fields ) || this.parts.where.map( x => '(' + x + ')' ).join( ' AND ' ) !== where;
    }

    bind( extent, name : string ){
        const parts : any = { name };
        extent._from( parts );
        const where = extent._where && extent._where( parts );
        if( where ){
            parts.where = [ where ];
        }
        extent.appendIndex( this, name );
        return this.append( parts );
    }

    fields( ...args : string[] ){
        return this.append({ fields : args });
    }

    where( ...args ){
        return this.append({ where : args } );
    }

    isEqual( existing ){
        return existing && existing.where === this.parts.where && 
            !tools.notEqual( existing.fields, this.parts.fields );
    }

    toString(){
        const { parts } = this,
            fields = parts.fields.map( x => "`" + x + "`" ).join(',')

        let query = `CREATE INDEX \`${ parts.name }\` ON \`${ parts.bucket.id }\`(${ fields })\n`;

        if( parts.where.length ) query += `WHERE ${ parts.where.join( ' AND ' ) }\n`;

        // Always defer the build.
        query += 'WITH { "defer_build" : true };'

        return query;
    }
}

export function index( ...fields : string[] ){
    return new CreateIndexQuery({ fields });
}