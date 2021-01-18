import {
  ARANGOPORT, DB,
  pullArango, getArangoImage, getArangoContainer,
  createArangoContainer, startArangoContainer, stopArangoContainer,
  initArangoContainer, getCollection, addDataToCollection, removeFromCollection
} from '../../arangoTools'
import createStudiesDB from '../../../src/DB/studiesDB'

jest.mock('../../../src/DB/utils')
import utils from '../../../src/DB/utils'
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
    let studiesDB, researcher1Key, team1Key, study1Key
    beforeAll(async () => {
      // mocking utils.getCollection('studies')
      let studiesCollection = getCollection('studies')
      utils.getCollection.mockImplementation(() => studiesCollection)
      // create the studiesDB
      studiesDB = await createStudiesDB(DB)

      // feed with some initial data
      researcher1Key = await addDataToCollection('users', {
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

      study1Key = await addDataToCollection('studies', {
        name: 'team1',
        createdTS: '2018-11-12T16:40:07.542Z',
        researchersKeys: [
          researcher1Key
        ],
        invitationCode: 'xxxx',
        invitationExpiry: '2018-11-26T10:13:08.386Z'
      })
    }, 5000)

    test('a new study can be created', async () => {
      let newStudy = await studiesDB.createStudy({
        createdTS: '2019-02-27T12:46:07.294Z',
        updatedTS: '2019-02-27T12:46:07.294Z',
        teamKey: team1Key,
        generalities: {
          title: {
            en: 'study2'
          }
        }
      })
      expect(newStudy._key).toBeDefined()

      let study2 = await studiesDB.getOneStudy(newStudy._key)
      expect(study2.generalities).toBeDefined()
      expect(study2.generalities.title).toBeDefined()
      expect(study2.generalities.title.en).toBe(newStudy.generalities.title.en)
      await removeFromCollection('studies', newStudy._key)
    })

    afterAll(async () => {
      await removeFromCollection('users', researcher1Key)
      await removeFromCollection('teams', team1Key)
      await removeFromCollection('studies', study1Key)
    })
  })

})
