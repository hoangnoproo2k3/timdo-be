import * as bcrypt from 'bcryptjs';

export async function hashPassword(password: string, saltRounds = 10) {
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
