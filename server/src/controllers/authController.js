
import {
  registerUser,
  loginUser,
} from '../services/authService.js'

import { createToken } from '../utils/jwt.js'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

export async function register(req, res, next) {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      studentNumber,
      departmentId,
      enrollmentYear,
      yearLevel,
    } = req.body

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
      !password ||
      !studentNumber?.trim() ||
      !departmentId ||
      !enrollmentYear ||
      !yearLevel
    ) {
      return res.status(400).json({
        message: 'Please complete all required fields.',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      })
    }

    const user = await registerUser({
      firstName,
      lastName,
      email,
      password,
      studentNumber,
      departmentId,
      enrollmentYear,
      yearLevel,
    })

    const token = await createToken(user)

    res.cookie('token', token, cookieOptions)

    return res.status(201).json({
      message: 'Student account created successfully.',
      user,
    })
  } catch (error) {
    next(error)
  }
}


export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      })
    }

    const user = await loginUser(email, password)
    const token = await createToken(user)

    res.cookie('token', token, cookieOptions)

    return res.status(200).json({
      message: 'Login successful.',
      user,
    })
  } catch (error) {
    next(error)
  }
}

export function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  return res.status(200).json({
    message: 'Logged out successfully.',
  })
}
