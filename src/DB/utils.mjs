'use strict'

/**
* Some utilities for the DB.
*/
export default {
  getCollection: async function (db, collname) {
    // load or create collection
    let names = await db.listCollections()

    for (var ii = 0; ii < names.length; ii++) {
      if (names[ii].name === collname) {
        return db.collection(collname)
      }
    }
    return db.createCollection(collname)
  }
}
