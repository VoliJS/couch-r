import { Query } from './query'
import { tools } from 'type-r'

export class DeleteQuery extends Query {
    constructor( parts = {} ){
        super({
            where : [],
            ...parts
        });
    }

    where( ...args ){
        return this.append({ where : args } );
    }

    bind( extent, name : string ){
        const parts : any = { name };
        extent._from( parts );
        const where = extent._where && extent._where( parts );
        if( where ){
            parts.where = [ where ];
        }
        return this.append( parts );
    }

    toString(){
        const { parts } = this;
        let query = `DELETE FROM \`${ parts.bucket.id }\``;

        if( parts.where.length ) query += ` WHERE ${ parts.where.join( ' AND ' ) }\n`;

        return query;
    }
}

export function deleteWhere( ...where : string[] ){
    return new DeleteQuery({ where });
}