export let DAO = {
    nextValue: null,
    __setReturnedValue (val) {
        this.nextValue = val
    },
    getOneStudy: async function () {
        return this.nextValue
    }
}
