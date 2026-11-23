
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export async function createToken(user) {
  return new SignJWT({
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(secret)
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret)
  return payload
}
