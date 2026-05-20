import { hashPassword, comparePassword } from '../../src/utils/hash.util';

describe('hashPassword', () => {
  it('should return a hash different from the original password', async () => {
    const password = 'MySecurePass123!';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]?\$/); // bcrypt hash prefix
  });

  it('should produce different hashes for the same password (salted)', async () => {
    const password = 'SamePassword';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});

describe('comparePassword', () => {
  it('should return true for correct password', async () => {
    const password = 'correct-password';
    const hash = await hashPassword(password);
    const result = await comparePassword(password, hash);
    expect(result).toBe(true);
  });

  it('should return false for wrong password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await comparePassword('wrong-password', hash);
    expect(result).toBe(false);
  });

  it('should return false for empty string vs real hash', async () => {
    const hash = await hashPassword('realpassword');
    const result = await comparePassword('', hash);
    expect(result).toBe(false);
  });
});
