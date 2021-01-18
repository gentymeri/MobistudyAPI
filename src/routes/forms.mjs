'use strict'

/**
* This provides the API endpoints for the form descriptions.
*/

import express from 'express'
import passport from 'passport'
import getDB from '../DB/DB.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'

const router = express.Router()

export default async function () {
  var db = await getDB()

  // query params:"
  // "list" if set only provides a list
  router.get('/forms', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      // TODO: do some access control
      let forms
      if (req.query.list) {
        forms = await db.getFormsList()
      } else {
        forms = await db.getAllForms()
      }
      res.send(forms)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve forms')
      res.sendStatus(500)
    }
  })

  router.get('/forms/:form_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      // TODO: do some access control
      let form = await db.getOneForm(req.params.form_key)
      res.send(form)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve form with _key ' + req.params.form_key)
      res.sendStatus(500)
    }
  })

  router.post('/forms', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newform = req.body
    newform.created = new Date()
    try {
      // TODO: do some access control, same as study, only researchers, any team
      newform = await db.createForm(newform)
      res.send(newform)
      applogger.info(newform, 'New form created')
      auditLogger.log('formCreated', req.user._key, undefined, undefined, 'New form created', 'forms', newform._key, newform)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new form')
      res.sendStatus(500)
    }
  })

  router.put('/forms/:form_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newform = req.body
    try {
      // TODO: do some access control
      newform = await db.replaceForm(req.params.form_key, newform)
      res.send(newform)
      applogger.info(newform, 'Form has been replaced')
      auditLogger.log('formReplaced', req.user._key, undefined, undefined, 'Form has been replaced', 'forms', newform._key, newform)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot replace form with _key ' + req.params.form_key)
      res.sendStatus(500)
    }
  })

  router.patch('/forms/:form_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    let newform = req.body
    try {
      // TODO: do some access control
      newform = await db.updateForm(req.params.form_key, newform)
      res.send(newform)
      applogger.info(newform, 'Form has been updated')
      auditLogger.log('formUpdate', req.user._key, undefined, undefined, 'Form has been updated', 'forms', newform._key, newform)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot update form with _key ' + req.params.form_key)
      res.sendStatus(500)
    }
  })

  router.delete('/forms/:form_key', passport.authenticate('jwt', { session: false }), async function (req, res) {
    try {
      // TODO: do some access control
      await db.deleteForm(req.params.form_key)
      res.sendStatus(200)
      applogger.info({ formKey: req.params.form_key }, 'Form has been deleted')
      auditLogger.log('formUpdate', req.user._key, undefined, undefined, 'Form with key ' + req.params.form_key + ' has been deleted', 'forms', req.params.form_key, undefined)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot delete form with _key ' + req.params.form_key)
      res.sendStatus(500)
    }
  })

  return router
}
