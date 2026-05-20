import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/hash.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { sendSuccess, sendCreated, sendError, sendUnauthorized } from '../utils/response.util';
import { logger } from '../config/logger';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    sendError(res, 'Email already registered', 409);
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  logger.info(`New user registered: ${email}`);
  sendCreated(res, { user, accessToken, refreshToken }, 'Account created successfully');
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    sendUnauthorized(res, 'Invalid email or password');
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    sendUnauthorized(res, 'Invalid email or password');
    return;
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  sendSuccess(
    res,
    {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken,
    },
    'Login successful'
  );
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  try {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
    });
    sendSuccess(res, { accessToken }, 'Token refreshed');
  } catch {
    sendUnauthorized(res, 'Invalid or expired refresh token');
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  sendSuccess(res, { user });
};
