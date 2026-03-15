import bcrypt from 'bcryptjs';

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
export async function comparePasswords(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}