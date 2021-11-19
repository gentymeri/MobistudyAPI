import { getTerm } from '../../src/services/vocabulary.mjs'

describe('when searching for a medical term', () => {

  test('you can retrieve heart failure in english', async () => {
    let concepts = await getTerm('heart failure', 'disorder', 'en', 10)
    expect(concepts.length).not.toBe(0)
    expect(concepts).toEqual(expect.arrayContaining([{
      term: 'Heart failure',
      conceptId: '84114007',
      vocabulary: 'SNOMEDCT'
    }]))
  })

  test('you can retrieve heart failure in swedish', async () => {
    let concepts = await getTerm('hjärt', 'disorder', 'sv', 10)
    expect(concepts.length).not.toBe(0)
    expect(concepts).toEqual(expect.arrayContaining([{
      term: 'hjärtsvikt',
      conceptId: '84114007',
      vocabulary: 'SNOMEDCT-SE'
    }]))
  })

})
