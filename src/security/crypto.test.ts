import { describe, it, expect } from 'vitest'
import { deriveKey, encrypt, decrypt } from '../security/crypto'

describe('crypto', () => {
  it('roundtrips encryption', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await deriveKey('pass', salt)
    const payload = await encrypt('hello', key)
    const text = await decrypt(payload, key)
    expect(text).toBe('hello')
  })
})
