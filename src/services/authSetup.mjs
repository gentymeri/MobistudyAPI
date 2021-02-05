'use strict'

/**
* Sets-up the authentication strategy.
*/
import passport from 'passport'
import PassportLocal from 'passport-local'
import PassportJWT from 'passport-jwt'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { applogger } from './logger.mjs'
import { DAO } from '../DAO/DAO.mjs'
import getConfig from './config.mjs'

export default async function () {
  var config = getConfig()

  if (config.auth.adminEmail) {
    // generate admin user from config if not already existing
    try {
      let admin = await DAO.findUser(config.auth.adminEmail)
      if (!admin) {
        await DAO.createUser({
          email: config.auth.adminEmail,
          hashedPassword: bcrypt.hashSync(config.auth.adminPassword, 8),
          role: 'admin'
        })
        applogger.info('Admin user created')
      }
      applogger.debug('Admin user already exists')
    } catch (err) {
      applogger.fatal(err, 'Cannot create admin user')
      process.exit(1)
    }
  }

  // This is used for authenticating with a post
  passport.use(new PassportLocal({
    usernameField: 'email',
    passwordField: 'password'
  }, async function (email, password, done) {
    let user = await DAO.findUser(email)
    if (!user) {
      return done(null, false, { message: 'Incorrect email or password.' })
    } else {
      var dbHashedPwd = user.hashedPassword
      if (bcrypt.compareSync(password, dbHashedPwd)) {
        // OK!
        applogger.info({ email: email }, 'User has logged in')
        delete user.hashedPassword
        delete user._rev
        delete user._id
        const token = jwt.sign(user, config.auth.secret, {
          expiresIn: config.auth.tokenExpires
        })
        user.token = token
        return done(null, user, { message: 'Logged In Successfully' })
      } else {
        // wrong password!
        applogger.debug(email + 'is trying to login, but wrong password')
        return done(null, false, { message: 'Incorrect email or password.' })
      }
    }
  }))

  // this is used each time an API endpoint is called
  var opts = {}
  opts.jwtFromRequest = PassportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()
  opts.secretOrKey = config.auth.secret
  passport.use(new PassportJWT.Strategy(opts, function (jwtPayload, cb) {
    let user = jwtPayload
    return cb(null, user)
  }))
}
