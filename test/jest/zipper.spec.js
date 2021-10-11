import zipper from '../../src/services/dataZipper'
import { DAO } from '../../src/DAO/DAO'
import { saveAttachment } from '../../src/services/attachments.mjs'
import { rmdir as fsRmdir } from 'fs/promises'

jest.mock('../../src/services/logger')
jest.mock('../../src/DAO/DAO')

describe('when a participant and some answers are stored', () => {

  beforeAll(async () => {
    const participants = [{
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
        },
        {
          taskId: 2,
          consented: true,
          lastExecuted: "2019-02-27T12:46:07.294Z"
        }]
      }]
    }]
    const answers = [{
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
    const healthstores = [{
      _key: '44444',
      userKey: "111111",
      studyKey: "123456",
      taskId: 2,
      createdTS: "2019-02-27T12:46:07.294Z",
      healthData: [{
        startDate: "2019-02-27T12:46:07.294Z",
        endDate: "2019-02-27T12:46:07.294Z",
        unit: 'count',
        value: 150
      }]
    }]
    const mibands = [{
      _key: '3333',
      userKey: "111111",
      studyKey: "123456",
      taskId: 3,
      createdTS: "2019-02-27T12:46:07.294Z",
      miband3Data: []
    }]
    const po60s = [{
      _key: '121212',
      userKey: "111111",
      studyKey: "123456",
      taskId: 4,
      createdTS: "2019-02-27T12:46:07.294Z",
      po60Data: []
    }]
    const qcst = [{
      _key: '878787',
      userKey: "111111",
      studyKey: "123456",
      taskId: 5,
      createdTS: "2019-02-27T12:46:07.294Z",
      steps: 66,
      heartRate: 120,
      borgScale: 7,
      time: "03:00"
    }]
    const swmts = [{
      _key: '323232',
      userKey: "111111",
      studyKey: "123456",
      taskId: 6,
      createdTS: "2019-02-27T12:46:07.294Z",
      distance: 600,
      steps: 433,
	    borgScale: 5,
    }]
    const peakflows = [{
      _key: '723723',
      userKey: "111111",
      studyKey: "123456",
      taskId: 7,
      createdTS: "2019-02-27T12:46:07.294Z",
      PEF: 323
    }]
    const positions = [{
      _key: '22222',
      userKey: "111111",
      studyKey: "123456",
      taskId: 8,
      createdTS: "2019-02-27T12:46:07.294Z",
      "position": {
        "timestamp": 1622323689069,
        "coords": {
          "longitude": 13.019884999999999,
          "latitude": 55.6028994,
          "accuracy": 21,
          "altitude": 33,
          "altitudeAccuracy": 10
        }
      }
    }]
    const fingerTappings = [{
      _key: '22222',
      userKey: "111111",
      studyKey: "123456",
      taskId: 9,
      createdTS: "2019-02-27T12:46:07.294Z",
      tappingCount: 0,
      tappingData: [{
        tapTimeStamp: 0,
        tappedButtonId: "TappedButtonLeft",
        tapCoordinates: [86.5, 438.5]
      }]
    }]
    DAO.__setReturnedValueSequence([participants, answers, healthstores, mibands, po60s, qcst, swmts, peakflows, positions, fingerTappings])

    let userKey = '111111'
    let studyKey = '123456'
    let taskId = '10'
    let fileName = 'temp.txt'
    let writer = await saveAttachment(userKey, studyKey, taskId, fileName)
    await writer.writeChunk('some test data')
    await writer.end()
  })

  test('a zip file can be created', async () => {
    let filename = await zipper.zipStudyData("123456")
    expect(filename).toBeDefined()
  })

  test('purging files doesnt crash', async () => {
    await zipper.purgeOldFiles(-1)
  })

  afterAll(async () => {
    await fsRmdir('tasksuploads/123456/', { recursive: true })
    await zipper.purgeOldFiles(-1)
  })
})
