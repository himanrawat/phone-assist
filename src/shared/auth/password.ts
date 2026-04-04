const PASSWORD_HASH_RE = /^\$(argon2|2[aby])/;

export async function hashPassword(password: string) {
  return Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 4,
    timeCost: 3,
  });
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (!PASSWORD_HASH_RE.test(passwordHash) || passwordHash.includes('placeholder')) {
    return false;
  }

  try {
    return await Bun.password.verify(password, passwordHash);
  } catch {
    return false;
  }
}

export function isPasswordHash(value: string) {
  return PASSWORD_HASH_RE.test(value);
}
