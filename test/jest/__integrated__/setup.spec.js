import {
  ARANGOPORT,
  pullArango, getArangoImage, getArangoContainer,
  createArangoContainer, startArangoContainer, stopArangoContainer,
  initArangoContainer
} from '../../arangoTools'
const axios = require('axios')

describe('when arangodb is running with mock data', () => {

  beforeAll(async () => {
    let image = await getArangoImage()
    try {
      await image.status()
    } catch (error) {
      await pullArango()
    }

    let arangoContainer = await getArangoContainer()
    if (!arangoContainer) {
      await createArangoContainer()
    }
    await startArangoContainer()

    await initArangoContainer()
  }, 60000)

  afterAll(async () => {
    await stopArangoContainer()
  })

  test('user mobistudy can access db mobistudy', async () => {
    console.log('going to check if I can access the db')
    let resp = await axios.get('http://localhost:' + ARANGOPORT + '/_db/mobistudy/', {
      auth: {
        username: 'mobistudy',
        password: 'testpwd'
      }
    })
    expect(resp.status).toBe(200)
  })

})
