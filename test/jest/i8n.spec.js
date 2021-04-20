import i18n from '../../src/i18n/i18n.mjs'

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
