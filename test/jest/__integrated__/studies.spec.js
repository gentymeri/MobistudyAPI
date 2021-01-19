import {
  DB,
  pullArango, getArangoImage, getArangoContainer,
  createArangoContainer, startArangoContainer, stopArangoContainer,
  connectToDatabase, dropDatabase, addDataToCollection, removeFromCollection
} from '../../arangoTools'
import createStudiesDB from '../../../src/DB/studiesDB'

jest.mock('../../../src/services/logger')

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

Date.prototype.toISODateString = function () {
  return this.toISOString().slice(0, 10)
}

var date = new Date();

console.log(date.addDays(5));

describe('when arangodb is running', () => {

  const DBNAME = 'test_studies'

  beforeAll(async () => {
    // let image = await getArangoImage()
    // try {
    //   await image.status()
    // } catch (error) {
    //   await pullArango()
    // }

    // let arangoContainer = await getArangoContainer()
    // if (!arangoContainer) {
    //   await createArangoContainer()
    // }
    // await startArangoContainer()

    await connectToDatabase(DBNAME)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
    // await stopArangoContainer()
  })

  describe('when a bunch of users and teams are set', () => {
    let studiesDB, researcher1Key, team1Key, participant1Key
    beforeAll(async () => {
      // create the studiesDB
      studiesDB = await createStudiesDB(DB)

      // feed with some initial data
      researcher1Key = await addDataToCollection('users', {
        email: 'reseacher1@uni1.edu',
        hashedPasswor: 'xxxxxxxx',
        role: 'researcher'
      })

      participant1Key = await addDataToCollection('users', {
        email: 'participant1@company1.com',
        hashedPasswor: 'xxxxxxxx',
        role: 'participant'
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

    test('a new invitational study can be created and found', async () => {
      let newcode = await studiesDB.getNewInvitationCode()

      expect(newcode).toBeDefined()
      expect(newcode.length).toBe(6)

      let newStudy = await studiesDB.createStudy({
        createdTS: '2019-02-27T12:46:07.294Z',
        updatedTS: '2019-02-27T12:46:07.294Z',
        teamKey: team1Key,
        invitational: true,
        invitationCode: newcode,
        generalities: {
          title: {
            en: 'study3'
          }
        }
      })
      expect(newStudy._key).toBeDefined()

      let study = await studiesDB.getInvitationalStudy(newcode)

      expect(study._key).toBe(newStudy._key)
      expect(study.invitational).toBeTruthy()

      await removeFromCollection('studies', newStudy._key)
    })

    test('someone with no studies and right age, sex, country is selected', async () => {
      let part1key = await addDataToCollection('participants', {
        userKey: participant1Key,
        name: 'part1',
        sex: 'male',
        dateOfBirth: '1980-02-27',
        country: 'gb',
        language: 'en',
        height: 180,
        weight: 78,
        diseases: [],
        medications: [],
        studiesSuggestions: true,
        studies: []
      })

      let study1key = await addDataToCollection('studies', {
        publishedTS: '2020-02-27T12:46:07.294Z',
        teamKey: team1Key,
        generalities: {
          title: {
            en: 'study2'
          },
          languages: ['en'],
          startDate: '2020-02-01',
          endDate: new Date().addDays(60).toISODateString(),
        },
        inclusionCriteria: {
          countries: ['gb'],
          minAge: 18,
          maxAge: 100,
          sex: ['male', 'female', 'other'],
          numberOfParticipants: 5,
          diseases: [],
          medications: [],
          minBMI: 18,
          maxBMI: 30
        }
      })

      let matchedStudies = await studiesDB.getMatchedNewStudies(participant1Key)

      expect(matchedStudies).toContain(study1key)

      await removeFromCollection('participants', part1key)
      await removeFromCollection('studies', study1key)
    })

    afterAll(async () => {
      await removeFromCollection('users', researcher1Key)
      await removeFromCollection('teams', team1Key)
      await removeFromCollection('teams', participant1Key)
    })
  })

})
