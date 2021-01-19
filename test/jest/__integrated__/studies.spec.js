import {
  ARANGOPORT, DB,
  pullArango, getArangoImage, getArangoContainer,
  createArangoContainer, startArangoContainer, stopArangoContainer,
  initArangoContainer, addDataToCollection, removeFromCollection
} from '../../arangoTools'
import createStudiesDB from '../../../src/DB/studiesDB'
import utils from '../../../src/DB/utils'
import logger from '../../../src/services/logger'

jest.mock('../../../src/DB/utils')
jest.mock('../../../src/services/logger')

describe('when arangodb is running', () => {

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

  describe('when a bunch of users and teams are set', () => {
    let studiesDB, researcher1Key, team1Key
    beforeAll(async () => {
      studiesDB = createStudiesDB(DB)

      researcher1Key = await addDataToCollection('user', {
        email: 'reseacher1@uni1.edu',
        hashedPasswor: 'xxxxxxxx',
        role: 'researcher'
      })

      team1Key = await addDataToCollection('teams', {
        name: 'team1',
        createdTS: '2018-11-12T16:40:07.542Z',
        researchersKeys: [
          researcher1Key
        ],
        invitationCode: 'xxxx',
        invitationExpiry: '2018-11-26T10:13:08.386Z'
      })
    }, 5000)

    test('a study can be created', async () => {
      let newStudy = await studiesDB.createStudy({
        createdTS: '2019-02-27T12:46:07.294Z',
        updatedTS: '2019-02-27T12:46:07.294Z',
        teamKey: team1Key,
        generalities: {
          title: {
            en: 'study1'
          }
        }
      })

      let study1 = await studiesDB.getOneStudy()
      expect(resp.status).toBe(200)
    })

    afterAll(async () => {
      await removeFromCollection(researcher1Key)
      await removeFromCollection(team1Key)
    })
  })

})
