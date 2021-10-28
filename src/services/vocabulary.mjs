/**
* Medical vocabulary used to match term (in supported languages) with a unique ID
* these IDs are used for inclusion criteria matching.
**/
import axios from 'axios'

// term: term or part of term to be searched for
// type: can be substance or disorder
// lang: en or sv
// limit: max number of terms
export async function getTerm(term, type, lang, limit) {
  if (!term) throw new Error('A term must be specified')
  if (!lang) throw new Error('A langauge must be specified')
  if (!type) throw new Error('A type must be specified')

  const apibase = 'https://browser.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/'
  let version = '2021-01-31/' // english version
  if (lang === 'sv') version = 'SNOMEDCT-SE/2020-11-30/'
  if (lang === 'es') version = 'SNOMEDCT-ES/2021-04-30/'
  const url = apibase + version + 'descriptions'

  let acceptedLangs = 'en'
  if (lang === 'sv') acceptedLangs = 'sv,en'
  if (lang === 'es') acceptedLangs = 'es,en'
  let language = 'english'
  if (lang === 'sv') language = 'swedish'
  if (lang === 'es') language = 'spanish'
  let vocabulary = 'SNOMEDCT'
  if (lang === 'sv') vocabulary = 'SNOMEDCT-SE'
  if (lang === 'es') vocabulary = 'SNOMEDCT-ES'

  const resp = await axios.get(url,
    {
      headers: {
        'Accept-Language': acceptedLangs,
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36'
      },
      mode: 'cors',
      params: {
        term: term,
        lang: language,
        conceptActive: true,
        active: true,
        semanticTag: type,
        searchMode: 'STANDARD',
        offset: 0,
        limit: limit
      }
    })
  const raw = resp.data
  const output = []
  for (const concept of raw.items) {
    if (concept.active && concept.languageCode === lang) {
      output.push({
        term: concept.term,
        conceptId: concept.concept.id,
        vocabulary: vocabulary
      })
    }
  }
  return output
}
