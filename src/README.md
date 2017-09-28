# Folder structure

Every definition file must export the singleton object as default export,
_and_ all types.

```javascript
export default new Cluster();
```

- database
    - index.ts Cluster definition
    - bucket_1
        - index.ts Bucket definition
        - collection_1.ts Collections definitions
        - collection_2.ts
        - ...
    - bucket_2
        - ...

# API

## Cluster

```javascript
import { Cluster } from 'couch-r'
import { define, prop } from 'type-r'
import omnia, { Omnia } from './omnia'

@define
export class Database extends Cluster {
    // connection string
    static connection = config.couchbase.connection;

    // couchbase options object
    static options = config.couchbase.options || {};

    // Each bucket needs to be included like this.
    @prop( omnia ) omnia : Omnia
}

export default new Database();
```