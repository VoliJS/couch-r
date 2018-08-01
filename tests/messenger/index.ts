import { cluster, bucket, Collection, attr, documentIO, index, select } from '../../src'
import { userInfo } from 'os';


@define
class User extends Record {
    static endpoint = documentIO(); // autoincrement

    @attr name : string
    @attr email : string
}

@define
class Post extends Document {
    static endpoint = documentIO({
        queries : {
            ix_byDate : index( 'createdAt' )
        },

        filters : {
            paged : select.docs()
                .order_by( 'createdAt DESC' )
                .limit( '$size' )
                .offset( '$page * $size' )
        }
    });

    @attr( Date.timestamp ) createdAt : Date
    @attr subject : string
    @attr user : string
}

@define
class DocumentPage extends Store {
    @attr( Post.Collection ) posts : Collection<Post>
    @attr( User.Collection ) users : Collection<User>
    @attr page : number

    async fetch({ params }){
        this.page = params.page;

        await this.posts.fetch({
            filter : 'paged',
            params
        });
        
        await this.users.fetch({
            filter : 'pick',
            params : {
                ids : this.posts.pluck( 'user' )
            }
        });

        return this;
    }
}

const messenger = bucket({
    documents : {
        p : Post,
        u : User
    }
});

cluster({
    connection : 'localhost',

    authenticate : {
        username : 'test',
        password : 'pazz'
    },

    buckets : { messenger }
})
.start( () => {

});