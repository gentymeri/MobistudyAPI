import {
    ARANGOPORT,
    pullArango, getArangoImage, getArangoContainer,
    createArangoContainer, startArangoContainer, stopArangoContainer,
    initArangoContainer
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

        await initArangoContainer()

        let resp = await axios.get('http://localhost:' + ARANGOPORT + '/_db/mobistudy/', {
            auth: {
                username: 'mobistudy',
                password: 'testpwd'
            }
        })

        console.log(resp.status)

        await stopArangoContainer()

        console.log('Dario is cool')
    } catch (err) {
        console.error(err)
    }
})()