export default {
  studyStatusUpdate: {
    studyAcceptedTitle: 'Bekräftelse att studie { studyTitle } är accepterad',
    studyAcceptedThanks: 'Tack för att du accepterat att deltaga i studien { studyTitle }.',
    studyAcceptedConsentedTasks: 'Du har samtyckt till följande:',
    studyAcceptedNotConsentedTasks: 'Du har inte samtyckt till följande:',
    studyCompletedTitle: 'Studien { studyTitle } är slutförd',
    studyCompletedThanks: 'Studien { studyTitle } har slutförts. Tack för ditt deltagande.',
    studyWithdrawnTitle: 'Avbryt deltagande i studien { studyTitle }',
    studyWithdrawnThanks: 'Du har avbrutit ditt deltagande i studien { studyTitle }. Tack för din tid.'
  },
  account: {
    registrationTitle: 'Bekräftelse av registrering på Mobistudy',
    registrationContent: '<p>Du har registrerats på Mobistudy.</p> <p>Om du inte avsåg att acceptera deltagande kan du svara på det här e-postmeddelandet och be oss ta bort ditt konto.</p>',
    passwordRecoveryTitle: 'Mobistudy återställning av lösenord',
    passwordRecoveryContent: `<p>Du har begärt att återställa ditt lösenord på Mobistudy.</p>
    <p>Gå till <a href={serverlink}>den här webbsida</a> för att återställa lösenordet.</p>
    <p>Du kan också manuellt använda följande kod: {token}</p>
    <p>Denna kod upphör att gälla om 24 timmar.</p>`,
    newPasswordTitle: 'Nytt lösenord på Mobistudy',
    newPasswordContent: `<p>Du har skapat in ett nytt lösenord på Mobistudy.</p>
    <p>Om du inte känner igen den här åtgärden, vänligen kontakta mobistudy@mau.se omedelbart.</p>`
  }
}
