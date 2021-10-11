'use strict'

/**
* This provides the API endpoints for authentication.
*/
import express from 'express'
import passport from 'passport'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import owasp from 'owasp-password-strength-test'
import zxcvbn from 'zxcvbn'
import { DAO } from '../DAO/DAO.mjs'
import getConfig from '../services/config.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { sendEmail } from '../services/mailSender.mjs'
import { userRegistrationCompose, passwordRecoveryCompose, newPasswordCompose } from '../services/emailComposer.mjs'
import { getLanguageFromAcceptedList } from '../i18n/i18n.mjs'

owasp.config({
  allowPassphrases: true,
  maxLength: 70,
  minLength: 8,
  minPhraseLength: 10,
  minOptionalTestsToPass: 3
})

const router = express.Router()

const config = getConfig()

const pwdCheck = function (email, password) {
  const userName = email.substring(0, email.indexOf('@'))
  if ((password.toUpperCase().includes(userName.toUpperCase()))) return false

  const strengthCheck = zxcvbn(password)
  if (strengthCheck.score < 2) return false

  const result = owasp.test(password)
  if (!result.strong) {
    return false
  }
  return true
}

export default async function () {
  router.post('/login', passport.authenticate('local', { session: false }), function (req, res, next) {
    res.send(req.user)
    auditLogger.log('login', req.user._key, undefined, undefined, 'User ' + req.user.email + ' has logged in', 'users', req.user._key, undefined)
  })

  router.post('/sendResetPasswordEmail', async function (req, res) {
    if (req.body.email) {
      const email = req.body.email
      const existing = await DAO.findUser(email)
      if (!existing) return res.sendStatus(200)

      const daysecs = 24 * 60 * 60
      const token = jwt.sign({
        email: email
      }, config.auth.secret, {
        expiresIn: daysecs
      })
      const serverlink = 'https://app.mobistudy.org/#/resetPassword?email=' + email + '&token=' + token
      let language = 'en'
      if (existing.role === 'participant') {
        // find language of the participant
        const part = await DAO.getParticipantByUserKey(existing._key)
        language = part.language
      }
      const msg = passwordRecoveryCompose(serverlink, token, language)
      sendEmail(email, msg.title, msg.content)
      res.sendStatus(200)
      applogger.info({ email: req.body.email }, 'Reset password email sent')
      auditLogger.log('resetPasswordEmail', existing._key, undefined, undefined, 'User ' + email + ' has requested a reset password email', 'users', existing._key, undefined)
    } else res.sendStatus(400)
  })

  router.post('/resetPassword', async function (req, res) {
    if (req.body.token && req.body.password) {
      let decoded
      try {
        decoded = jwt.verify(req.body.token, config.auth.secret)
      } catch (err) {
        applogger.error(err, 'Resetting password, cannot parse token')
        return res.sendStatus(500)
      }
      if (new Date().getTime() >= (decoded.exp * 1000)) {
        applogger.info('Resetting password, token has expired')
        res.sendStatus(400)
      } else {
        const email = decoded.email
        const newPasssword = req.body.password
        if (!pwdCheck(email, newPasssword)) return res.status(400).send('Password too weak')
        const hashedPassword = bcrypt.hashSync(newPasssword, 8)
        const existing = await DAO.findUser(email)
        if (!existing) {
          applogger.info('Resetting password, email ' + email + ' not registered')
          return res.status(409).send('This email is not registered')
        }
        let language = 'en'
        if (existing.role === 'participant') {
          // find language of the participant
          const part = await DAO.getParticipantByUserKey(existing._key)
          language = part.language
        }
        const msg = newPasswordCompose(language)
        await sendEmail(email, msg.title, msg.content)

        await DAO.updateUser(existing._key, {
          hashedPassword: hashedPassword
        })

        res.sendStatus(200)
        applogger.info({ email: email }, 'User has changed the password')
        auditLogger.log('resetPassword', existing._key, undefined, undefined, 'User ' + email + ' has changed the password', 'users', existing._key, undefined)
      }
    } else res.sendStatus(400)
  })

  router.post('/users', async (req, res) => {
    const user = req.body
    const password = user.password
    if (!pwdCheck(user.email, password)) return res.status(400).send('Password too weak')

    // get the language from the browser, at this stage the user preferences are unknown
    const language = getLanguageFromAcceptedList(req.acceptsLanguages())
    try {
      const msg = userRegistrationCompose(language)
      await sendEmail(user.email, msg.title, msg.content)
    } catch (err) {
      res.status(400).send('Cannot send confirmation email')
      applogger.warn({ error: err }, 'Cannot send new user confirmation email')
      return
    }

    const hashedPassword = bcrypt.hashSync(password, 8)
    delete user.password
    user.hashedPassword = hashedPassword
    try {
      const existing = await DAO.findUser(user.email)
      if (existing) return res.status(409).send('This email is already registered')
      if (user.role === 'admin') return res.sendStatus(403)
      const newuser = await DAO.createUser(user)
      res.sendStatus(200)
      applogger.info({ email: newuser.email }, 'New user created')
      auditLogger.log('userCreated', newuser._key, undefined, undefined, 'New user created with email ' + newuser.email, 'users', newuser._key, undefined)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new user')
      res.sendStatus(500)
    }
  })

  // possible query parameters:
  // studyKey: the key of the study (TO DELETE ?? DUPLICATED BY GET/ALL )
  router.get('/users', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
      let val
      if (req.user.role === 'admin') {
        val = await DAO.getAllUsersByCriteria(null, [req.query.studyKey])
      } else if (req.user.role === 'researcher') {
        // TODO: make sure the study Key is among the ones the researcher is allowed
        if (req.query.studyKey) val = await DAO.getAllUsersByCriteria('participant', [req.query.studyKey])
        else {
          // TODO: retrieve studies where this participant is involved in
          let studyKeys
          val = await DAO.getAllUsersByCriteria('participant', [studyKeys])
        }
      } else { // a participant
        val = await DAO.getOneUser(req.user._key)
      }
      res.send(val)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new user')
      res.sendStatus(500)
    }
  })

  // NEW GET USER FUNCTION
  router.get('/getUsers', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role !== 'admin') {
      console.log('not an admin')
      res.sendStatus(403)
    } else {
      try {
        const result = await DAO.getUsers(false,
          req.query.roleType,
          req.query.userEmail,
          req.query.sortDirection,
          req.query.offset,
          req.query.rowsPerPage
        )
        console.log('routes/users.mjs RESULT:', result)
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve users')
        res.sendStatus(500)
      }
    }
  })

  // NEW GET USER COUNT FUNCTION
  router.get('/getUsers/count', passport.authenticate('jwt', { session: false }), async function (req, res) {
    if (req.user.role !== 'admin') {
      console.log('not an admin')
      res.sendStatus(403)
    } else {
      try {
        const result = await DAO.getUsers(true,
          req.query.roleType,
          req.query.userEmail,
          req.query.sortDirection,
          req.query.offset,
          req.query.rowsPerPage
        )
        res.send(result)
      } catch (err) {
        applogger.error({ error: err }, 'Cannot retrieve users count')
        res.sendStatus(500)
      }
    }
  })

  // Get All Users in Db (TO DELETE ?? DUPLICATED BY GET/ALL )
  router.get('/users/all', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
      let val
      // Only Admin can get a list of all users
      if (req.user.role === 'admin') {
        val = await DAO.getAllUsersInDb()
      } else if (req.user.role === 'researcher') {
        // See all Users associated to teams to which this researcher belongs
      }
      res.send(val)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot get all users')
      res.sendStatus(500)
    }
  })

  router.get('/users/:user_key', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
      let val
      if (req.user.role === 'admin') {
        val = await DAO.getOneUser(req.params.user_key)
      } else if (req.user.role === 'researcher') {
        // TODO: make sure the user Key is among the ones the researcher is allowed. i.e is part of the team key
        val = await DAO.getOneUser(req.params.user_key)
      }
      res.send(val)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve user details')
      res.sendStatus(500)
    }
  })

  // Remove Specified User (currently only removes researchers)
  // TODO: remove participants as well
  router.delete('/users/:user_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      const userKey = req.params.user_key
      // Only admin can remove a team
      if (req.user.role === 'admin') {
        // Remove user from all teams
        const teamsOfUser = await DAO.getAllTeams(userKey)
        // For each team, find the user key in the researcher keys and remove
        for (let i = 0; i < teamsOfUser.length; i++) {
          const teamKeyOfUser = teamsOfUser[i]._key
          const selTeam = await DAO.getOneTeam(teamKeyOfUser)
          const index = selTeam.researchersKeys.indexOf(userKey)
          if (index !== null) {
            selTeam.researchersKeys.splice(index, 1)
          }
          await DAO.replaceTeam(teamKeyOfUser, selTeam)
        }
        // Then, FINALLY, remove user from DAO
        const user = await DAO.getOneUser(userKey)
        await DAO.removeUser(userKey)
        res.sendStatus(200)

        applogger.info({ email: user.email }, 'User deleted')
        auditLogger.log('userDeleted', userKey, undefined, undefined, 'User with email ' + user.email + ' deleted', 'users', userKey, undefined)
      } else res.sendStatus(403)
    } catch (err) {
      // respond to request with error
      applogger.error({ error: err }, 'Cannot delete user with key ' + req.params.user_key)
      res.sendStatus(500)
    }
  })

  return router
}
