// lib/jwt.js
import jwt from 'jsonwebtoken'

const secret = process.env.JWT_VERIFICATION_SECRET

export function signVerificationToken(userId) {
  // Token expires in 24 hours
  return jwt.sign({ userId }, secret, { expiresIn: '24h' })
}

export function verifyVerificationToken(token) {
  try {
    return jwt.verify(token, secret)
  } catch (err) {
    return null
  }
}
