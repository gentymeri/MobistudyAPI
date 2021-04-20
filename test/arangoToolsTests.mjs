import {
    ARANGOPORT,
    pullArango, getArangoImage, getArangoContainer,
    createArangoContainer, startArangoContainer, stopArangoContainer,
    connectToDatabase, dropDatabase
} from './arangoTools.mjs'
import axios from 'axios'


const DB_NAME = 'mobsitudydbtest';

(async () => {
    try {
        let image = await getArangoImage()
        try {
            await image.status()
        } catch (error) {
            await pullArango()
        }
        // image.remove()

        let arangoContainer = await getArangoContainer()
        if (!arangoContainer) {
            await createArangoContainer()
        }
        await startArangoContainer()

        await connectToDatabase(DB_NAME)

        let resp = await axios.get('http://localhost:' + ARANGOPORT + '/_db/' + DB_NAME + '/', {
            auth: {
                username: 'mobistudy',
                password: 'testpwd'
            }
        })

        console.log(resp.status)

        await dropDatabase(DB_NAME)
        // await stopArangoContainer()

        console.log('Test completed')
    } catch (err) {
        console.error(err)
    }
})()