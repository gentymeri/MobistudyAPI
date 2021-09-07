/**
* This is an attempt to use the UMLS REST API to retrieve concepts in a given language
* This code works, but the response time is terribly slow, so it's practically unsable.
* One solution would be using a different returnIdType that returns localised concepts,
* the problem is that the IDs change language by language, so, after selecting a term
* it would be necessary to retrieve the meta thesaurus ID of that term
* Another solution solution may be to run the system on our premises, see https://www.nlm.nih.gov/research/umls/licensedcontent/umlsknowledgesources.html
* the data is stored in a SQL database, and therefore easily queryable: https://www.nlm.nih.gov/research/umls/implementation_resources/query_diagrams/index.html
*
* Conclusion: for now I think using SNOMED is easier
**/
// REMEMBER TO INSTALL THESE DEPENDENCIES !!!
import axios from 'axios'
import qs from 'querystring'
import parser from 'node-html-parser'

console.log('Hello')

const APIKEY = '134237b5-29e2-473b-8740-8ca7f87cdb3b'
let tgt = 'TGT-283393-UqLGWMzwbtsEdbzCUeZwtX7hS3W0QucCOcrujdypRV4FIj0BVz-cas'
let tgtTimestamp = new Date()

let word = 'diabete insipido'
let lang = 'ita'

// 1) Get long term ticket:
async function getTGT() {
  console.log('getting new TGT')
  let resp = await axios.post('https://utslogin.nlm.nih.gov/cas/v1/api-key', qs.stringify({ apikey: APIKEY }))
  let html = resp.data
  let root = parser.parse(html)
  let uri = root.querySelector('form').getAttribute('action')
  return uri.split('api-key/')[1]
}

// 2) Get single request ticket:
async function getSRT(tgt) {
  let resp = await axios.post('https://utslogin.nlm.nih.gov/cas/v1/api-key/' + tgt, qs.stringify({ service: 'http://umlsks.nlm.nih.gov' }))
  let srt = resp.data
  return srt
}

// 3) Search term:
async function getTerm (words, tgt) {
  let srt = await getSRT(tgt)
  let resp = await axios.get('https://uts-ws.nlm.nih.gov/rest/search/current?string=' + words +'&searchType=words&ticket=' + srt)
  return resp.data
}

async function getTermITA (words, tgt) {
  // trying here the italian vocabulary MDRITA, see complete list: https://www.nlm.nih.gov/research/umls/sourcereleasedocs/index.html
  let srt = await getSRT(tgt)
  let resp = await axios.get('https://uts-ws.nlm.nih.gov/rest/search/current?string=' + words +'&searchType=words&sabs=MDRITA&returnIdType=sourceDescriptor&ticket=' + srt)
  return resp.data
}



// 4) for each term search
async function searchTerm (cui, tgt) {
  let srt = await getSRT(tgt)
  let resp = await axios.get('https://uts-ws.nlm.nih.gov/rest/content/current/CUI/' + cui + '?ticket=' + srt)
  return resp.data
}

// 5) for each filtered term then search the original language
async function searchLocalised (cui, language, tgt) {
  let srt = await getSRT(tgt)
  let resp = await axios.get('https://uts-ws.nlm.nih.gov/rest/content/current/CUI/' + cui + '/atoms?&language=' + language.toUpperCase() + '&ticket=' + srt)
  return resp.data
}

(async () => {
  let gettgt = false
  if (tgt && tgtTimestamp) {
    // Ticket-Granting Ticket will be valid for 8 hours
    let timediff = new Date() - tgtTimestamp
    if (timediff > 5 * 60 * 60 * 1000) gettgt = true
  } else gettgt = true
  if (gettgt) {
    tgt = await getTGT()
    tgtTimestamp = new Date()
  }

  console.log('TGT', tgt)

  let term = await getTerm(word, tgt)
  for (let concept of term.result.results) {
    console.log(concept)
    let cui = await searchTerm(concept.ui, tgt)
    let disease = false
    let medicine = false
    for (let st of cui.result.semanticTypes) {
      if (st.name === 'Disease or Syndrome') {
        disease = true
        break
      }
      if (st.name === 'Pharmacologic Substance') {
        medicine = true
        break
      }
    }
    if (disease) {
      let local = await searchLocalised(concept.ui, lang, tgt)
      let candidates = []
      for (let localword of local.result) {
        if (localword.language.toUpperCase() === lang.toUpperCase() && localword.name.toUpperCase().includes(word.toUpperCase())) {
          candidates.push({
            source: localword.rootSource,
            term: localword.name
          })
        }
      }
      // find the shortest
      let shortest = 1000000
      let shortestI = -1
      for(let i = 0; i<candidates.length; i++) {
        if (candidates[i].term.length < shortest) {
          shortest = candidates[i].term.length
          shortestI = i
        }
      }
      if (shortestI != -1) console.log(candidates[shortestI])
    }
  }
})()
