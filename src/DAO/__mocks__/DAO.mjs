let nextValues = []
let DAO = {
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
    async getParticipantsByStudy (studykey, currentStatus, dataCallback) {
        if (dataCallback) {
            let ps = nextValues.shift()
            for (let p of ps) dataCallback(p)
        } else {
            return nextValues.shift()
        }
    },
    async getAnswersByStudy (studyKey, dataCallback) {
        if (dataCallback) {
            let as = nextValues.shift()
            for (let a of as) dataCallback(a)
        } else {
            return nextValues.shift()
        }
    }
}

export { DAO }