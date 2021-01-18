import { startArango, stopArango, ARANGOPORT, addDataToCollection } from './arangoTools'
const axios = require('axios')
// import studiesDB from '../../../src/DB/studiesDB'
// import utils from '../../../src/DB/utils'
// import logger from '../../../src/services/logger'

// jest.mock('../../../src/DB/utils')
// jest.mock('../../../src/services/logger')

describe('when arangodb is running with mock data', () => {

  beforeAll(async () => {
    await startArango()
    console.log('arango started')
  }, 120000)

  afterAll(async () => {
    await stopArango()
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
