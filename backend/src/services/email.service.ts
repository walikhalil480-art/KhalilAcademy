import nodemailer from 'nodemailer';
import { logger } from '../config/logger';
import { env } from '../config/env';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Lazy-initialized SMTP Transporter
let transporter: nodemailer.Transporter | null = null;

export const getMailTransporter = (): nodemailer.Transporter | null => {
  if (transporter) return transporter;

  const host = env.MAIL_HOST;
  const port = parseInt(env.MAIL_PORT, 10) || 587;
  const user = env.MAIL_USERNAME;
  const pass = env.MAIL_PASSWORD;
  const encryption = (env.MAIL_ENCRYPTION || 'tls').toLowerCase();
  const isSecure = encryption === 'ssl' || port === 465;

  if (host && user) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    logger.info(`[MAIL] Transporter configured successfully for host: ${host}:${port}`);
    return transporter;
  }

  return null;
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const mailer = getMailTransporter();
    const fromHeader = `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>`;

    if (mailer) {
      const info = await mailer.sendMail({
        from: fromHeader,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.subject,
      });

      logger.info(`[MAIL DELIVERED] To: ${options.to} | MessageId: ${info.messageId}`);
      return true;
    }

    logger.warn(`[MAIL NOT CONFIGURED] Email to ${options.to} was not dispatched because SMTP credentials (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD) are not set in .env.`);
    return false;
  } catch (error: any) {
    logger.error(`[MAIL ERROR] Failed to send email to ${options.to}: ${error.message}`);
    return false;
  }
};

export const sendWelcomeEmail = async (to: string, name: string) => {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030914; padding: 40px 20px; color: #e2e8f0;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #08152A; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; font-size: 24px; margin: 0; font-weight: 800;">Khalil Academy</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">World-Class Tech & Engineering Education</p>
        </div>
        <h2 style="color: #f8fafc; font-size: 18px; margin-bottom: 12px;">Welcome to Khalil Academy, ${name}!</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          We are thrilled to welcome you to our modern e-learning platform. Your account has been registered with the name <strong>${name}</strong>, which will appear on all your verified completion certificates.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${env.APP_URL}/login" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
            Explore Courses
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
          &copy; ${new Date().getFullYear()} Khalil Academy. All rights reserved.
        </p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject: 'Welcome to Khalil Academy', html });
};

export const sendVerificationEmail = async (to: string, token: string, name?: string) => {
  const link = `${env.APP_URL}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030914; padding: 40px 20px; color: #e2e8f0;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #08152A; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; font-size: 24px; margin: 0; font-weight: 800;">Khalil Academy</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Account Verification & Security</p>
        </div>
        <h2 style="color: #f8fafc; font-size: 18px; margin-bottom: 12px;">Verify Your Khalil Academy Email Address</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Hello ${name ? `<strong>${name}</strong>` : 'Learner'},<br /><br />
          Welcome to Khalil Academy! Thank you for creating your account. Please verify your email address to activate your account and start learning.
        </p>
        <div style="background-color: #040c1d; border: 1px solid #1e3a8a; border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
          <p style="color: #93c5fd; font-size: 13px; margin: 0; line-height: 1.5;">
            <strong>Important Notice:</strong> Please enter your real name exactly as you want it to appear on your course completion certificates. Your registered name (<strong>${name || 'as registered'}</strong>) will be permanently used on issued certificates.
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
            Verify My Email
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
          If the button above does not work, copy and paste the following URL into your web browser:
        </p>
        <p style="color: #38bdf8; font-size: 11px; word-break: break-all; background-color: #040c1d; padding: 10px; border-radius: 6px; font-family: monospace;">
          ${link}
        </p>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
          If you did not create this account, you can safely ignore this email.<br />
          &mdash; Khalil Academy
        </p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject: 'Verify Your Khalil Academy Email Address', html });
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const link = `${env.APP_URL}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030914; padding: 40px 20px; color: #e2e8f0;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #08152A; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #38bdf8; font-size: 24px; margin: 0; font-weight: 800;">Khalil Academy</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Password Reset Request</p>
        </div>
        <h2 style="color: #f8fafc; font-size: 18px; margin-bottom: 12px;">Reset Your Password</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          You requested a password reset for your Khalil Academy account. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background-color: #dc2626; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(220,38,38,0.4);">
            Reset Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
          If the button above does not work, copy and paste this URL into your browser:
        </p>
        <p style="color: #38bdf8; font-size: 11px; word-break: break-all; background-color: #040c1d; padding: 10px; border-radius: 6px; font-family: monospace;">
          ${link}
        </p>
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
          If you did not request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
    </div>
  `;
  return sendEmail({ to, subject: 'Reset Password - Khalil Academy', html });
};
