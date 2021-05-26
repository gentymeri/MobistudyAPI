import axios from 'axios'

async function getDiseaseEng (term, limit) {
  //https://browser.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/2020-01-31/descriptions?term=lung&conceptActive=true&active=true&semanticTag=disorder&groupByConcept=false&searchMode=STANDARD&offset=0&limit=50
  let resp = await axios.get('https://browser.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/2020-01-31/descriptions',
  {
    headers: {'Accept-Language': 'en'},
    params: {
      term: term,
      conceptActive: true,
      active: true,
      semanticTag: 'disorder',
      searchMode: 'STANDARD',
      offset: 0,
      limit: limit
    }
  })
  let raw = resp.data
  let output = []
  for (let concept of raw.items) {
    if (concept.active && concept.languageCode == 'en') {
      output.push({
        term: concept.term,
        conceptId: concept.concept.id,
        vocabulary: 'SNOMEDCT'
      })
    }
  }
  return output
}

async function getDiseaseSwe (term, limit) {
  //https://browser.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/SNOMEDCT-SE/2019-11-30/descriptions?limit=100&term=lunga&active=true&conceptActive=true&lang=swedish&semanticTag=disorder

  let resp = await axios.get('https://browser.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/SNOMEDCT-SE/2019-11-30/descriptions',
  {
    headers: {'Accept-Language': 'sv,en'},
    params: {
      term: term,
      lang: 'swedish',
      conceptActive: true,
      active: true,
      semanticTag: 'disorder',
      searchMode: 'STANDARD',
      offset: 0,
      limit: limit
    }
  })
  let raw = resp.data
  let output = []
  for (let concept of raw.items) {
    if (concept.active && concept.languageCode == 'sv') {
      output.push({
        term: concept.term,
        conceptId: concept.concept.id,
        vocabulary: 'SNOMEDCT-SE'
      })
    }
  }
  return output
}


(async () => {

  let heart = await getDiseaseEng('heart', 10)
  console.log(JSON.stringify(heart, null, 2))

  let hjarta = await getDiseaseSwe('hjärta', 10)
  console.log(JSON.stringify(hjarta, null, 2))
})()
