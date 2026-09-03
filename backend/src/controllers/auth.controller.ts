import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { AuthenticatedRequest } from '../middlewares/auth';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for the verification link.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.loginUser(req.body, ip, userAgent);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful.',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    next(error);
  }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.resendVerificationEmail(req.body.email);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req.query.token as string) || req.body.token;
    const result = await authService.verifyEmailToken(token);
    res.json({
      success: true,
      message: 'Email address verified successfully. Your account is now active!',
      user: result,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const result = await authService.rotateRefreshToken(token);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    await authService.logoutUser(token);
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      await authService.logoutAllDevices(req.user.id);
    }
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out from all devices successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.forgotPassword(req.body.email);
    res.json({
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
