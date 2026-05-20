// Mock env config so tests don't require .env file
jest.mock('../../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-very-long-value-123',
    JWT_REFRESH_SECRET: 'test-refresh-secret-very-long-456',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  JwtPayload,
} from '../../src/utils/jwt.util';

const samplePayload: JwtPayload = {
  userId: 'user-abc-123',
  email: 'test@example.com',
  workspaceId: 'ws-xyz-456',
  role: 'ADMIN',
};

describe('signAccessToken / verifyAccessToken', () => {
  it('should sign and verify an access token successfully', () => {
    const token = signAccessToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // valid JWT structure

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(samplePayload.userId);
    expect(decoded.email).toBe(samplePayload.email);
    expect(decoded.workspaceId).toBe(samplePayload.workspaceId);
  });

  it('should throw for invalid access token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('should throw for tampered access token', () => {
    const token = signAccessToken(samplePayload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe('signRefreshToken / verifyRefreshToken', () => {
  it('should sign and verify a refresh token successfully', () => {
    const token = signRefreshToken(samplePayload);
    expect(typeof token).toBe('string');

    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe(samplePayload.userId);
    expect(decoded.role).toBe(samplePayload.role);
  });

  it('should throw for invalid refresh token', () => {
    expect(() => verifyRefreshToken('bad-refresh-token')).toThrow();
  });

  it('access token should not verify with refresh secret', () => {
    const accessToken = signAccessToken(samplePayload);
    // The refresh token verifier uses a different secret, so this should throw
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
