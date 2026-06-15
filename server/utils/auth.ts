import { SignJWT, jwtVerify } from 'jose'
import { hash, compare } from 'bcryptjs'

const ACCESS_TOKEN_EXPIRY = '2h'
const REFRESH_TOKEN_EXPIRY = '7d'

function getSecret(name: string) {
  const config = useRuntimeConfig()
  return new TextEncoder().encode(config[name as keyof typeof config] as string)
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed)
}

export async function generateAccessToken(payload: { userId: string; role: string; name?: string; tokenVersion?: number }) {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecret('jwtSecret'))
}

export async function generateRefreshToken(payload: { userId: string; tokenVersion?: number }) {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecret('jwtRefreshSecret'))
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret('jwtSecret'))
    return payload as { userId: string; role: string; type: string }
  }
  catch {
    return null
  }
}

export async function verifyRefreshToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret('jwtRefreshSecret'))
    return payload as { userId: string; type: string; tokenVersion?: number }
  }
  catch {
    return null
  }
}
