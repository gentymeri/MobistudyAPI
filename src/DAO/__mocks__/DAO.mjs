let nextValues = []
const DAO = {
  __setReturnedValue (val) {
    nextValues = []
    nextValues[0] = val
  },
  __setReturnedValueSequence (vals) {
    nextValues = vals
  },
  async getOneStudy () {
    return nextValues.shift()
  },
  getNextData (dataCallback) {
    if (dataCallback) {
      const hs = nextValues.shift()
      if (hs) for (const h of hs) dataCallback(h)
    } else {
      return nextValues.shift()
    }
  },
  async getAllUsersByCriteria (role, studyKeys, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getParticipantsByStudy (studykey, currentStatus, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getAnswersByStudy (studyKey, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getHealthStoreDataByStudy (studyKey, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getMiband3DataByStudy (studyKey, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getPO60DataByStudy (studyKey, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getQCSTDataByStudy (studyKey, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getSmwtsDataByStudy (studyKey, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getPeakFlowsByStudy (studyKey, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getPositionsByStudy (studyKey, dataCallback) {
    return this.getNextData(dataCallback)
  },
  async getFingerTappingsByStudy (studyKey, dataCallback) {
    return this.getNextData(dataCallback)
  }
}

export { DAO }
