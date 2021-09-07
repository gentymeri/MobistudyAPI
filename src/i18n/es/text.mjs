export default {
  studyStatusUpdate: {
    studyAcceptedTitle: 'Confirmación de aceptación del estudio { studyTitle }',
    studyAcceptedThanks: 'Gracias por aceptar participar en el estudio { studyTitle }.',
    studyAcceptedConsentedTasks: 'Ha dado su consentimiento para lo siguiente:',
    studyAcceptedNotConsentedTasks: 'NO ha dado su consentimiento para lo siguiente:',
    studyCompletedTitle: 'Completion of study { studyTitle }',
    studyCompletedThanks: 'El estudio { studyTitle } ha sido ahora completado. Gracias por su participación.',
    studyWithdrawnTitle: 'Retirada del estudio { studyTitle }',
    studyWithdrawnThanks: 'Se ha retirado del estudio { studyTitle }. Gracias por su tiempo.'
  },
  account: {
    registrationTitle: ' Confirmación de resgistro en Mobistudy',
    registrationContent: '<p>Se has registrado con éxito en Mobistudy.</p><p>Si no reconoce este mensaje, responda a este correo electrónico y pídanos que eliminemos su cuenta.</p>',
    passwordRecoveryTitle: 'Recuperación de contraseña de Mobistudy',
    passwordRecoveryContent: `<p>Ha solicitado restablecer su contraseña en Mobistudy.</p>
    <p>Por favor vaya a  <a href={serverlink}>this webpage</a> para reestablecer contraseña.</p>
    <p>O use el siguiente código si es necesario: {token}</p>
    <p>Este código caducará después de 24 horas.</p>`,
    newPasswordTitle: 'Nueva contraseña de Mobsitudy',
    newPasswordContent: `<p>Ha cambiado contraseña en Mobistudy.</p>
    <p>Si no reconoce esta actividad, por favor contacte con mobistudy@mau.se.</p>`
  }
}
