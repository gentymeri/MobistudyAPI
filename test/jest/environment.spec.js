import { getWeather, getPollution, getPostcode, getAllergenes } from '../../src/services/environment.mjs'

// Warning: for this test to work, a proper configuration file with API keys must be given!

describe('when searching for environment', () => {

  test('you can retrieve weather', async () => {
    let weather = await getWeather(55.6028859, 13.019894299999999)
    expect(weather).not.toBeUndefined()
    expect(weather.location).toBe('Gamla Staden')
  })

  test('you can retrieve pollution', async () => {
    let aq = await getPollution(55.6028859, 13.019894299999999)
    expect(aq).not.toBeUndefined()
    expect(aq.aqi).not.toBeUndefined()
  })

  test('you can retrieve postcode', async () => {
    let pc = await getPostcode(51.751985, -1.257609)
    expect(pc).not.toBeUndefined()
    expect(pc.postcode).toBe('OX1 4DS')
  })

  test('you sometimes cannot retrieve postcode', async () => {
    let pc = await getPostcode(55.6028859, 13.019894299999999)
    expect(pc).toBeUndefined()
  })

  test('you can retrieve pollen', async () => {
    let pol = await getAllergenes(55.6028859, 13.019894299999999)
    expect(pol).not.toBeUndefined()
  })
})
