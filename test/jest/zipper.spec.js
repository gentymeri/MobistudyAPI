import zipper from '../../src/services/dataZipper'
import { DAO } from '../../src/DAO/DAO'

jest.mock('../../src/services/logger')
jest.mock('../../src/DAO/DAO')

describe('when a participant and some answers are stored', () => {

  beforeAll(() => {
    let participants = [{
      _key: '0000',
      userKey: '111111',
      createdTS: "2019-02-27T12:46:07.294Z",
      name: "Dario",
      surname: "Salvi",
      sex: "male",
      dateOfBirth: "2019-02-27T12:46:07.294Z",
      country: "gb",
      language: "en",
      height: 180,
      weight: 78,
      diseases: [],
      medications: [],
      studiesSuggestions: true,
      studies: [{
        studyKey: "123456",
        currentStatus: "accepted",
        acceptedTS: "2019-02-27T12:46:07.294Z",
        taskItemsConsent: [{
          taskId: 1,
          consented: true,
          lastExecuted: "2019-02-27T12:46:07.294Z"
        }]
      }]
    }]
    let answers = [{
      _key: '9999',
      userKey: "111111",
      studyKey: "123456",
      taskId: 1,
      createdTS: "2019-02-27T12:46:07.294Z",
      responses: [{
        questionId: "Q1",
        questionType: "singleChoice",
        questionText: {
          en: "How are you?"
        },
        answer: {
          answerText: {
            en: "Very well"
          },
          answerId: "Q1A2"
        },
        timeStamp: "2019-02-27T12:46:07.294Z"
      }]
    }]
    DAO.__setReturnedValueSequence([participants, answers])
  })

  test('a zip file can be created', async () => {
    let filename = await zipper.zipStudyData("123456")
    expect(filename).toBeDefined()
  })

  test('purging files doesnt crash', async () => {
    await zipper.purgeOldFiles(-1)
  })

  afterAll(async () => {
    await zipper.purgeOldFiles(-1)
  })
})