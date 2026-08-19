import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { prisma } from '../config/database';
import { Role, UserStatus } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    avatar?: string | null;
    bio?: string | null;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        bio: true,
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
    }

    req.user = {
      id: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar || undefined,
      bio: user.bio || undefined,
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired access token.' });
  }
};

export const authenticateOptional = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        bio: true,
      },
    });

    if (user && user.status !== 'SUSPENDED') {
      req.user = {
        id: user.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar || undefined,
        bio: user.bio || undefined,
      };
    }

    next();
  } catch (error) {
    // If token invalid, proceed as guest without error
    next();
  }
};

