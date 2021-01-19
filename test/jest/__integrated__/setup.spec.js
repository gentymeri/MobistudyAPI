import {
  ARANGOPORT,
  pullArango, getArangoImage, getArangoContainer,
  createArangoContainer, startArangoContainer, stopArangoContainer,
  connectToDatabase, dropDatabase
} from '../../arangoTools'
const axios = require('axios')

describe('when arangodb is running with mock data', () => {

  const DBNAME = 'test_setup'

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

    await connectToDatabase(DBNAME)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
    // await stopArangoContainer()
  })

  test('user mobistudy can access db mobistudy', async () => {
    console.log('going to check if I can access the db')
    let resp = await axios.get('http://localhost:' + ARANGOPORT + '/_db/' + DBNAME + '/', {
      auth: {
        username: 'mobistudy',
        password: 'testpwd'
      }
    })
    expect(resp.status).toBe(200)
  })

})
