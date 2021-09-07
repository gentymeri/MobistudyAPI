import {
  DB,
  pullArango,
  getArangoImage,
  getArangoContainer,
  createArangoContainer,
  startArangoContainer,
  stopArangoContainer,
  connectToDatabase,
  dropDatabase,
  addDataToCollection,
  removeFromCollection,
} from "../arangoTools";
import createPositionsDB from "../../src/DAO/positionsDAO"

jest.mock("../../src/services/logger");

Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf())
  date.setDate(date.getDate() + days)
  return date;
};

Date.prototype.toISODateString = function () {
  return this.toISOString().slice(0, 10);
};

describe("when arangodb is running", () => {
  const DBNAME = "test_positions";

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

    await connectToDatabase(DBNAME);
  }, 60000);

  afterAll(async () => {
    await dropDatabase(DBNAME);
    // await stopArangoContainer()
  });

  describe("when a user and a study are set", () => {
    let positionsDB, userKey, participantKey, studyKey, participant1Key;
    beforeAll(async () => {
      // create the positions collection
      positionsDB = await createPositionsDB(DB);

      userKey = await addDataToCollection("users", {
        email: "participant@company.com",
        hashedPasswor: "xxxxxxxx",
        role: "participant",
      })

      studyKey = addDataToCollection("studies", {
        createdTS: "2019-02-27T12:46:07.294Z",
        updatedTS: "2019-02-27T12:46:07.294Z",
        generalities: {
          title: {
            en: "study",
          }
        }
      })

      participantKey = await addDataToCollection("participants", {
        userKey: participant1Key,
        createdTS: "2018-11-12T16:40:07.542Z",
        name: 'Dario',
        studies: [ {
            studyKey: studyKey,
            currentStatus: "accepted",
            acceptedTS: "2019-02-27T12:46:07.294Z",
          }]
      })
    }, 5000)

    test("a new position can be created and retrieved", async () => {
      let newPosition = await positionsDB.createPosition({
        userKey: userKey,
        studyKey: studyKey,
        taskId: 1,
        createdTS: "2021-05-29T21:32:15.581Z",
        position: {
          timestamp: 1622323689069,
          coords: {
            longitude: 13.019,
            latitude: 55.60,
            accuracy: 21,
            altitude: 33,
            altitudeAccuracy: 10
          }
        }
    })
      expect(newPosition._key).toBeDefined()

      let pos = await positionsDB.getOnePosition(newPosition._key)
      expect(pos.position).toBeDefined()
      expect(pos.position.timestamp).toBe(1622323689069)

      let poss = await positionsDB.getPositionsByUser(userKey)
      expect(poss[0].position).toBeDefined()
      expect(poss[0].position.timestamp).toBe(1622323689069)

      poss = await positionsDB.getPositionsByStudy(studyKey)
      expect(poss[0].position).toBeDefined()
      expect(poss[0].position.timestamp).toBe(1622323689069)

      poss = await positionsDB.getPositionsByUserAndStudy(userKey, studyKey)
      expect(poss[0].position).toBeDefined()
      expect(poss[0].position.timestamp).toBe(1622323689069)
    })

    afterAll(async () => {
      await removeFromCollection("users", researcher1Key)
      await removeFromCollection("teams", team1Key)
      await removeFromCollection("teams", participant1Key)
    })
  })
})
