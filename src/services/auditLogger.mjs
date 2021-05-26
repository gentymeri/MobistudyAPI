'use strict'

/**
* Audit log, uses the DB to log events and it includes the file logger too.
*/
import { DAO } from '../DAO/DAO.mjs'

export default {
  async log (event, userKey, studyKey, taskId, message, refData, refKey, data) {
    DAO.addAuditLog({
      timestamp: new Date(),
      event,
      userKey,
      studyKey,
      taskId,
      message,
      refData,
      refKey,
      data
    })
  }
}
