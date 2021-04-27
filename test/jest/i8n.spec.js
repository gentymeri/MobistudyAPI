import { getLanguageFromAcceptedList, default as i18n } from '../../src/i18n/i18n.mjs'

describe('when using lang from list', () => {
  test('a list with only english gives en', () => {
    let lang = getLanguageFromAcceptedList(['en'])
    expect(lang).toBe('en')
  })

  test('a list with only british english gives en', () => {
    let lang = getLanguageFromAcceptedList(['en-gb'])
    expect(lang).toBe('en')
  })

  test('a list with only swedish gives sv', () => {
    let lang = getLanguageFromAcceptedList(['sv'])
    expect(lang).toBe('sv')
  })

  test('a list with english first and swedish second gives en', () => {
    let lang = getLanguageFromAcceptedList(['en', 'sv'])
    expect(lang).toBe('en')
  })

  test('a list with no supported languages gives en', () => {
    let lang = getLanguageFromAcceptedList(['it', 'de'])
    expect(lang).toBe('en')
  })

  test('an empty list gives en', () => {
    let lang = getLanguageFromAcceptedList([])
    expect(lang).toBe('en')
  })

  test('an undefined list gives en', () => {
    let lang = getLanguageFromAcceptedList()
    expect(lang).toBe('en')
  })

  test('a list with it, de and sv gives sv', () => {
    let lang = getLanguageFromAcceptedList(['it', 'de', 'sv'])
    expect(lang).toBe('sv')
  })

  test('a list with it, de and sv-SW gives sv', () => {
    let lang = getLanguageFromAcceptedList(['it', 'de', 'sv-SW'])
    expect(lang).toBe('sv')
  })
})

describe('when using i18n', () => {
  beforeAll(() => {
    i18n.text.testLang = {
      test: 'TEST',
      phrase: '{ n } times 1 is { n  }',
      phrase2: '{  name1} is cooler than { name2  }'
    }
    i18n.locale = 'testLang'
  })

  test('a phrase can be easily retrieved', () => {
    expect(i18n.text.testLang.test).toBe('TEST')
  })

  test('tokens are changed with actual content', () => {
    expect(i18n.t('phrase', { n: 5 })).toBe('5 times 1 is 5')
    expect(i18n.t('phrase2', { name1: 'dario', name2: 'pino' })).toBe('dario is cooler than pino')
  })
})
