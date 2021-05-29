export default {
  studyStatusUpdate: {
    studyAcceptedTitle: 'Confirmation of acceptance of study { studyTitle }',
    studyAcceptedThanks: 'Thank you for accepting to take part in the study { studyTitle }.',
    studyAcceptedConsentedTasks: 'You have consented to the following:',
    studyAcceptedNotConsentedTasks: 'You have not consented to the following:',
    studyCompletedTitle: 'Completion of study { studyTitle }',
    studyCompletedThanks: 'The study { studyTitle } has now been completed. Thank you for your participation.',
    studyWithdrawnTitle: 'Withdrawal from study { studyTitle }',
    studyWithdrawnThanks: 'You have withdrawn from the study { studyTitle }. Thank you for your time.'
  },
  account: {
    registrationTitle: 'Mobistudy registration confirmation',
    registrationContent: '<p>You have been successfully registered on Mobistudy.</p><p>If you don\'t recognize this message, please reply to this email and ask us to delete your account.</p>',
    passwordRecoveryTitle: 'Mobistudy password recovery',
    passwordRecoveryContent: `<p>You have requested to reset your password on Mobistudy.</p>
    <p>Please go to <a href={serverlink}>this webpage</a> to set another password.</p>
    <p>Or copy/paste the following code in the app: {token}</p>
    <p>This code will expire after 24 hours.</p>`,
    newPasswordTitle: 'New password on Mobsitudy',
    newPasswordContent: `<p>You have set a new password on Mobistudy.</p>
    <p>If you don't recognize this action, please contact mobistudy@mau.se immediately.</p>`
  }
}
