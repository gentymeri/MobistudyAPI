import {
    ARANGOPORT,
    pullArango, getArangoImage, getArangoContainer,
    createArangoContainer, startArangoContainer, stopArangoContainer,
    connectToDatabase, dropDatabase
} from './arangoTools.mjs'
import axios from 'axios'


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

        await connectToDatabase('mobsitudydb')

        let resp = await axios.get('http://localhost:' + ARANGOPORT + '/_db/mobsitudydb/', {
            auth: {
                username: 'mobistudy',
                password: 'testpwd'
            }
        })

        console.log(resp.status)

        await dropDatabase('mobsitudydb')
        // await stopArangoContainer()

        console.log('Dario is cool')
    } catch (err) {
        console.error(err)
    }
})()