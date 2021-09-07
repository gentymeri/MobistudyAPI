import { DAO } from '../../src/DAO/DAO'
import { studyStatusUpdateCompose, passwordRecoveryCompose } from '../../src/services/emailComposer.mjs'

jest.mock('../../src/DAO/DAO')

describe('when composing an email', () => {

  test('the email password recovery is correct', async () => {
    let email = await passwordRecoveryCompose('link', 'token', 'en')
    expect(email.title).toBe('Mobistudy password recovery')
    expect(email.content).toBe(`<p>You have requested to reset your password on Mobistudy.</p>
    <p>Please go to <a href=link>this webpage</a> to set another password.</p>
    <p>Or copy/paste the following code in the app: token</p>
    <p>This code will expire after 24 hours.</p>`)
  })

  test('the email password recovery in Spanish is correct', async () => {
    let email = await passwordRecoveryCompose('link', 'token', 'es')
    expect(email.title).toBe('Recuperación de contraseña de Mobistudy')
  })

  test('the email for a completed study is correct', async () => {
    DAO.__setReturnedValue({
      generalities: {
        languages: ['en', 'it'],
        title: {
          en: 'teststudy',
          it: 'studio test'
        }
      },
      consent: {
        taskItems: [],
        extraItems: []
      }
    })

    let email = await studyStatusUpdateCompose('1', {
      language: 'en',
      studies: [{
        studyKey: '1',
        currentStatus: "completed"
      }]
    })
    expect(email.title).toBe('Completion of study teststudy')
    expect(email.content).toBe('The study teststudy has now been completed. Thank you for your participation.')
  })

  test('the email for a withdrawn study is correct', async () => {
    DAO.__setReturnedValue({
      generalities: {
        languages: ['en', 'it'],
        title: {
          en: 'teststudy',
          it: 'studio test'
        }
      },
      consent: { taskItems: [], extraItems: [] }
    })

    let email = await studyStatusUpdateCompose('1', {
      language: 'en',
      studies: [{
        studyKey: '1',
        currentStatus: "withdrawn"
      }]
    })
    expect(email.title).toBe('Withdrawal from study teststudy')
    expect(email.content).toBe('You have withdrawn from the study teststudy. Thank you for your time.')
  })

  test('the email for an accepted study is correct', async () => {
    DAO.__setReturnedValue({
      generalities: {
        languages: ['en', 'it'],
        title: {
          en: 'teststudy',
          it: 'studio test'
        }
      },
      consent: {
        taskItems: [{
          description: {
            en: 'task1',
            it: 'attivita 1'
          },
          taskId: 1
        }],
        extraItems: [{
          description: {
            en: 'extra1',
            it: 'addizionale 1'
          }
        }]
      }
    })

    let email = await studyStatusUpdateCompose('1', {
      language: 'en',
      studies: [{
        studyKey: '1',
        currentStatus: "accepted",
        taskItemsConsent: [
          { taskId: 1, consented: true }
        ],
        extraItemsConsent: [
          { consented: true }
        ]
      }]
    })

    expect(email.title).toBe('Confirmation of acceptance of study teststudy')
    expect(email.content).toBe('Thank you for accepting to take part in the study teststudy.\n\nYou have consented to the following:\n\u2022 task1\n\u2022 extra1\n')
  })
})
