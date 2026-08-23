import nodemailer from 'nodemailer';
import { logger } from '../config/logger';
import { env } from '../config/env';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
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
  const recipientStr = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  
  if (process.env.NODE_ENV === 'test') {
    logger.info(`[TEST MODE MAIL DISPATCH] To: ${recipientStr} | Subject: "${options.subject}"`);
    return true;
  }
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
        attachments: options.attachments,
      });

      logger.info(`[MAIL DELIVERED] To: ${recipientStr} | MessageId: ${info.messageId}`);
      return true;
    }

    logger.warn(`[MAIL NOT CONFIGURED] Email to ${recipientStr} was not dispatched because SMTP credentials (MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD) are not set in .env.`);
    return false;
  } catch (error: any) {
    logger.error(`[MAIL ERROR] Failed to send email to ${recipientStr}: ${error.message}`);
    return false;
  }
};

// Common Brand Container Wrapper
const renderBrandWrapper = (contentHtml: string, subtitle = 'World-Class Tech & Engineering Education'): string => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030914; padding: 40px 20px; color: #e2e8f0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #08152A; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; box-shadow: 0 15px 35px rgba(0,0,0,0.6);">
        <div style="text-align: center; margin-bottom: 28px;">
          <h1 style="color: #38bdf8; font-size: 26px; margin: 0; font-weight: 900; letter-spacing: 0.5px;">Khalil Academy</h1>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">${subtitle}</p>
        </div>
        ${contentHtml}
        <hr style="border: 0; border-top: 1px solid #1e293b; margin: 28px 0 20px 0;" />
        <div style="text-align: center; color: #64748b; font-size: 12px; line-height: 1.5;">
          <p style="margin: 0 0 4px 0;">&copy; ${new Date().getFullYear()} Khalil Academy. Learn • Grow • Succeed.</p>
          <p style="margin: 0;">World-Class Tech & Cloud Computing LMS</p>
        </div>
      </div>
    </div>
  `;
};

// -------------------------------------------------------------
// 1. Welcome Email
// -------------------------------------------------------------
export const sendWelcomeEmail = async (to: string, name: string) => {
  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(2, 132, 199, 0.3), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">👋</div>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0 0 4px 0; font-weight: 800;">Welcome to Khalil Academy, ${name}!</h2>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">Your gateway to high-demand cloud and software engineering skills</p>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      We are thrilled to welcome you to our learning community. Your account has been registered with the name <strong style="color: #f8fafc;">${name}</strong>, which will be authenticated on all your official certificates of completion.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${env.APP_URL}/courses" style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);">
        Explore Course Catalog →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: 'Welcome to Khalil Academy!', html: renderBrandWrapper(content) });
};

// -------------------------------------------------------------
// 2. Email Verification
// -------------------------------------------------------------
export const sendVerificationEmail = async (to: string, token: string, name?: string) => {
  const link = `${env.APP_URL}/verify-email?token=${token}`;
  const content = `
    <h2 style="color: #f8fafc; font-size: 18px; margin-bottom: 12px;">Verify Your Email Address</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      Hello ${name ? `<strong>${name}</strong>` : 'Learner'},<br /><br />
      Welcome to Khalil Academy! Please verify your email address to activate your account and start your courses.
    </p>
    <div style="background-color: #040c1d; border: 1px solid #1e3a8a; border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
      <p style="color: #93c5fd; font-size: 13px; margin: 0; line-height: 1.5;">
        <strong>Certificate Notice:</strong> Please ensure your registered name (<strong>${name || 'as registered'}</strong>) is accurate, as it will be printed on all verified credentials.
      </p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
        Verify My Email
      </a>
    </div>
    <p style="color: #38bdf8; font-size: 11px; word-break: break-all; background-color: #040c1d; padding: 10px; border-radius: 6px; font-family: monospace;">
      ${link}
    </p>
  `;
  return sendEmail({ to, subject: 'Verify Your Khalil Academy Email Address', html: renderBrandWrapper(content, 'Account Verification') });
};

// -------------------------------------------------------------
// 3. Password Reset Email
// -------------------------------------------------------------
export const sendPasswordResetEmail = async (to: string, token: string) => {
  const link = `${env.APP_URL}/reset-password?token=${token}`;
  const content = `
    <h2 style="color: #f8fafc; font-size: 18px; margin-bottom: 12px;">Reset Your Password</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      You requested a password reset for your Khalil Academy account. Click the button below to choose a new secure password:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" style="background-color: #dc2626; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(220,38,38,0.4);">
        Reset Password
      </a>
    </div>
    <p style="color: #38bdf8; font-size: 11px; word-break: break-all; background-color: #040c1d; padding: 10px; border-radius: 6px; font-family: monospace;">
      ${link}
    </p>
  `;
  return sendEmail({ to, subject: 'Reset Password - Khalil Academy', html: renderBrandWrapper(content, 'Password Recovery') });
};

// -------------------------------------------------------------
// 4. Course Enrollment Confirmation
// -------------------------------------------------------------
export const sendCourseEnrolledEmail = async (
  to: string,
  name: string,
  courseTitle: string,
  courseSlug: string,
  instructorName?: string
) => {
  const courseUrl = `${env.APP_URL}/courses/${courseSlug}/learn`;
  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(14, 116, 144, 0.3), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">🚀</div>
      <span style="display: inline-block; background-color: rgba(6, 182, 212, 0.2); color: #22d3ee; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px;">Enrollment Confirmed</span>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0; font-weight: 800;">You're Enrolled in "${courseTitle}"!</h2>
      ${instructorName ? `<p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Taught by ${instructorName}</p>` : ''}
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
      Hi <strong>${name}</strong>, your seat has been confirmed. You now have full access to all video lessons, hands-on lab assignments, and certification assessments.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${courseUrl}" style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 16px rgba(2, 132, 199, 0.4);">
        Start Learning Now →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: `Enrollment Confirmed: "${courseTitle}"`, html: renderBrandWrapper(content, 'Course Enrollment') });
};

// -------------------------------------------------------------
// 5. Course Started (1st Lesson Milestone)
// -------------------------------------------------------------
export const sendCourseStartedEmail = async (
  to: string,
  name: string,
  courseTitle: string,
  lessonTitle: string
) => {
  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(79, 70, 229, 0.3), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">🌟</div>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0 0 4px 0; font-weight: 800;">Great Start, ${name}!</h2>
      <p style="color: #a5b4fc; font-size: 13px; margin: 0;">You've officially started "${courseTitle}"</p>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      You completed: <strong style="color: #f8fafc;">"${lessonTitle}"</strong> in <strong style="color: #f8fafc;">"${courseTitle}"</strong>.
      Consistent daily learning is the fastest way to master new technical skills and earn your official verified certificate. Keep up the great momentum!
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${env.APP_URL}/dashboard" style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block;">
        Continue Lesson →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: `🌟 Great Start on "${courseTitle}"!`, html: renderBrandWrapper(content, 'Learning Progress') });
};

// -------------------------------------------------------------
// 6. Assignment Submitted (Confirmation to Student)
// -------------------------------------------------------------
export const sendAssignmentSubmittedEmail = async (
  to: string,
  name: string,
  assignmentTitle: string,
  courseTitle: string,
  attemptNumber: number
) => {
  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(14, 116, 144, 0.3), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">📥</div>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0 0 4px 0; font-weight: 800;">Assignment Received!</h2>
      <p style="color: #22d3ee; font-size: 13px; margin: 0;">Attempt #${attemptNumber} for "${assignmentTitle}"</p>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      Hi <strong>${name}</strong>, your coursework submission for <strong style="color: #f8fafc;">"${assignmentTitle}"</strong> in <em>"${courseTitle}"</em> has been received. Your instructor will review and grade your submission shortly.
    </p>
  `;
  return sendEmail({ to, subject: `Assignment Received: "${assignmentTitle}"`, html: renderBrandWrapper(content, 'Assignment Submission') });
};

// -------------------------------------------------------------
// 7. Assignment Instructor Alert (Notification to Instructor)
// -------------------------------------------------------------
export const sendAssignmentInstructorAlertEmail = async (
  instructorEmail: string,
  instructorName: string,
  studentName: string,
  assignmentTitle: string,
  courseTitle: string
) => {
  const content = `
    <h2 style="color: #f8fafc; font-size: 18px; margin-bottom: 12px;">New Assignment Submission to Grade</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      Hello <strong>${instructorName}</strong>,<br /><br />
      Student <strong style="color: #38bdf8;">${studentName}</strong> has submitted coursework for <strong style="color: #f8fafc;">"${assignmentTitle}"</strong> in <em>"${courseTitle}"</em>.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${env.APP_URL}/instructor/dashboard" style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block;">
        Review Submission in Dashboard →
      </a>
    </div>
  `;
  return sendEmail({ to: instructorEmail, subject: `New Submission: ${studentName} - "${assignmentTitle}"`, html: renderBrandWrapper(content, 'Instructor Alert') });
};

// -------------------------------------------------------------
// 8. Assignment Graded (Result & Feedback)
// -------------------------------------------------------------
export const sendAssignmentGradedEmail = async (
  to: string,
  name: string,
  assignmentTitle: string,
  courseTitle: string,
  status: 'PASSED' | 'NEEDS_REVISION' | 'FAILED',
  score?: number,
  maxScore?: number,
  feedback?: string
) => {
  const isPassed = status === 'PASSED';
  const content = `
    <div style="text-align: center; background: ${isPassed ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(15, 23, 42, 0.6))' : 'linear-gradient(135deg, rgba(120, 53, 15, 0.4), rgba(15, 23, 42, 0.6))'}; border: 1px solid ${isPassed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">${isPassed ? '✅' : '📝'}</div>
      <span style="display: inline-block; background-color: ${isPassed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${isPassed ? '#34d399' : '#fbbf24'}; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px;">
        ${isPassed ? 'Assignment Passed' : 'Revision Requested'}
      </span>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0; font-weight: 800;">"${assignmentTitle}" Graded</h2>
      ${score !== undefined ? `<p style="color: #f8fafc; font-size: 16px; font-weight: 800; margin: 8px 0 0 0;">Score: ${score}${maxScore ? ` / ${maxScore}` : '%'}</p>` : ''}
    </div>
    ${feedback ? `
      <div style="background-color: #040c1d; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <h4 style="color: #94a3b8; font-size: 12px; text-transform: uppercase; margin: 0 0 6px 0;">Instructor Feedback:</h4>
        <p style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.5;">${feedback}</p>
      </div>
    ` : ''}
    <div style="text-align: center; margin: 30px 0;">
      <a href="${env.APP_URL}/dashboard" style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block;">
        View in Dashboard →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: `Assignment ${isPassed ? 'Passed' : 'Feedback'}: "${assignmentTitle}"`, html: renderBrandWrapper(content, 'Assignment Evaluation') });
};

// -------------------------------------------------------------
// 9. Quiz / Assessment Completed Result
// -------------------------------------------------------------
export const sendQuizCompletedEmail = async (
  to: string,
  name: string,
  quizTitle: string,
  courseTitle: string,
  score: number,
  passingScore: number,
  passed: boolean,
  attemptNumber: number,
  maxAttempts: number
) => {
  const content = `
    <div style="text-align: center; background: ${passed ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(15, 23, 42, 0.6))' : 'linear-gradient(135deg, rgba(127, 29, 29, 0.4), rgba(15, 23, 42, 0.6))'}; border: 1px solid ${passed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">${passed ? '🏆' : '📊'}</div>
      <span style="display: inline-block; background-color: ${passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${passed ? '#34d399' : '#f87171'}; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px;">
        ${passed ? 'Assessment Passed' : 'Assessment Result'}
      </span>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0; font-weight: 800;">${passed ? 'Congratulations!' : 'Keep Practicing!'}</h2>
      <p style="color: #f8fafc; font-size: 22px; font-weight: 900; margin: 8px 0 0 0;">${score}% Score</p>
      <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Passing Requirement: ${passingScore}% · Attempt ${attemptNumber} of ${maxAttempts}</p>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      ${passed ? `You have met the required score to earn certification for <strong style="color: #f8fafc;">"${courseTitle}"</strong>!` : `You need at least ${passingScore}% to pass. You have ${Math.max(0, maxAttempts - attemptNumber)} attempt(s) remaining.`}
    </p>
  `;
  return sendEmail({ to, subject: `Quiz Result: ${score}% on "${quizTitle}"`, html: renderBrandWrapper(content, 'Assessment Evaluation') });
};

// -------------------------------------------------------------
// 10. Course Completion Congratulations & Next Steps
// -------------------------------------------------------------
export const sendCourseCompletionEmail = async (
  to: string,
  name: string,
  courseTitle: string,
  courseSlug?: string
) => {
  const catalogUrl = `${env.APP_URL}/courses`;
  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
      <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px;">Course Curriculum Completed</span>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 6px 0 0 0; font-weight: 800;">Congratulations, ${name}!</h2>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
      You have successfully completed all video lessons and coursework for <strong style="color: #f8fafc;">"${courseTitle}"</strong> at Khalil Academy!
    </p>
    <div style="text-align: center; margin: 32px 0 16px 0;">
      <h3 style="color: #f8fafc; font-size: 15px; font-weight: 700; margin-bottom: 8px;">What's Your Next Learning Goal?</h3>
      <a href="${catalogUrl}" style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 18px rgba(2, 132, 199, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
        Explore Next Courses & Register →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: `🎉 Congratulations on Completing "${courseTitle}" — What's Next?`, html: renderBrandWrapper(content, 'Milestone Recognition') });
};

// -------------------------------------------------------------
// 11. Official Certificate Issued Email (with Attached PDF)
// -------------------------------------------------------------
export const sendCertificateIssuedEmail = async (
  to: string,
  name: string,
  courseTitle: string,
  certificateNumber: string,
  verificationUrl: string,
  pdfBuffer?: Buffer
) => {
  const attachments = pdfBuffer
    ? [
        {
          filename: `KhalilAcademy-Certificate-${certificateNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ]
    : undefined;

  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(20, 83, 45, 0.5), rgba(15, 23, 42, 0.8)); border: 2px solid rgba(245, 158, 11, 0.5); border-radius: 18px; padding: 28px; margin-bottom: 24px;">
      <div style="font-size: 44px; margin-bottom: 12px;">🎓</div>
      <span style="display: inline-block; background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 10px;">Official Verified Credential</span>
      <h2 style="color: #f8fafc; font-size: 22px; margin: 0 0 6px 0; font-weight: 900;">Certificate Awarded to ${name}!</h2>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">For successfully completing and mastering <strong>${courseTitle}</strong></p>
    </div>
    <div style="background-color: #040c1d; border: 1px solid #1e293b; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr><td style="color: #94a3b8; padding: 6px 0;">Recipient:</td><td style="color: #f8fafc; padding: 6px 0; font-weight: 700; text-align: right;">${name}</td></tr>
        <tr><td style="color: #94a3b8; padding: 6px 0;">Course:</td><td style="color: #f8fafc; padding: 6px 0; font-weight: 700; text-align: right;">${courseTitle}</td></tr>
        <tr><td style="color: #94a3b8; padding: 6px 0;">Certificate ID:</td><td style="color: #38bdf8; padding: 6px 0; font-family: monospace; font-weight: 700; text-align: right;">${certificateNumber}</td></tr>
        <tr><td style="color: #94a3b8; padding: 6px 0;">PDF Attachment:</td><td style="color: #34d399; padding: 6px 0; font-weight: 700; text-align: right;">✓ Attached to this email</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${verificationUrl}" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block;">
        Verify Certificate Online →
      </a>
    </div>
  `;
  return sendEmail({
    to,
    subject: `🎓 Your Official Verified Certificate for "${courseTitle}" is Attached!`,
    html: renderBrandWrapper(content, 'Official Verified Credential'),
    attachments,
  });
};

// -------------------------------------------------------------
// 12. Live Class 24-Hour Reminder
// -------------------------------------------------------------
export const sendLiveClassReminder24hEmail = async (
  to: string,
  name: string,
  sessionTitle: string,
  courseTitle: string,
  startTime: Date,
  sessionId: string
) => {
  const sessionUrl = `${env.APP_URL}/live-classes/${sessionId}`;
  const formattedTime = startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  const formattedDate = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">📅</div>
      <span style="display: inline-block; background-color: rgba(59, 130, 246, 0.2); color: #60a5fa; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px;">Live Class Tomorrow</span>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0; font-weight: 800;">"${sessionTitle}"</h2>
      <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">${courseTitle}</p>
    </div>
    <div style="background-color: #040c1d; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
      <p style="color: #38bdf8; font-size: 16px; font-weight: 800; margin: 0;">⏰ ${formattedDate} at ${formattedTime}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${sessionUrl}" style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block;">
        View Class & Add to Calendar →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: `Reminder: Live Class "${sessionTitle}" is Tomorrow`, html: renderBrandWrapper(content, 'Live Virtual Classroom') });
};

// -------------------------------------------------------------
// 13. Live Class Starting Soon (15-Minute Countdown)
// -------------------------------------------------------------
export const sendLiveClassStartingSoonEmail = async (
  to: string,
  name: string,
  sessionTitle: string,
  sessionId: string
) => {
  const sessionUrl = `${env.APP_URL}/live-classes/${sessionId}`;
  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">🔴</div>
      <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.2); color: #f87171; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px;">Starting in 15 Minutes</span>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0; font-weight: 800;">"${sessionTitle}" is About to Begin!</h2>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${sessionUrl}" style="background: linear-gradient(135deg, #dc2626, #ef4444); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 4px 16px rgba(220, 38, 38, 0.4);">
        Join Virtual Classroom Now →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: `🔴 LIVE NOW: "${sessionTitle}" is starting soon!`, html: renderBrandWrapper(content, 'Live Virtual Classroom') });
};

// -------------------------------------------------------------
// 14. Missed Live Class (Recording Ready)
// -------------------------------------------------------------
export const sendLiveClassMissedEmail = async (
  to: string,
  name: string,
  sessionTitle: string,
  courseTitle: string,
  sessionId: string
) => {
  const sessionUrl = `${env.APP_URL}/live-classes/${sessionId}`;
  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(71, 85, 105, 0.3), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">🎬</div>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0 0 4px 0; font-weight: 800;">Missed "${sessionTitle}"?</h2>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">The session recording is now available to watch anytime.</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${sessionUrl}" style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block;">
        Watch Session Recording →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: `Recording Available: "${sessionTitle}"`, html: renderBrandWrapper(content, 'Session Recording') });
};

// -------------------------------------------------------------
// 15. New Course Announcement Broadcast
// -------------------------------------------------------------
export const sendNewCourseAnnouncementEmail = async (
  to: string | string[],
  courseTitle: string,
  courseSlug: string,
  category: string,
  description: string,
  instructorName: string
) => {
  const courseUrl = `${env.APP_URL}/courses/${courseSlug}`;
  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(6, 78, 59, 0.3), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">✨</div>
      <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px;">New Course Release</span>
      <h2 style="color: #f8fafc; font-size: 22px; margin: 0; font-weight: 800;">"${courseTitle}"</h2>
      <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">${category} · Taught by ${instructorName}</p>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">${description}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${courseUrl}" style="background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block;">
        View Course Curriculum →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: `✨ New Course Available: "${courseTitle}"`, html: renderBrandWrapper(content, 'Academy Announcement') });
};

// -------------------------------------------------------------
// 16. Instructor Course Announcement
// -------------------------------------------------------------
export const sendInstructorAnnouncementEmail = async (
  to: string | string[],
  courseTitle: string,
  instructorName: string,
  title: string,
  message: string
) => {
  const content = `
    <div style="background-color: #040c1d; border: 1px solid #1e3a8a; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
      <span style="color: #38bdf8; font-size: 11px; font-weight: 800; text-transform: uppercase;">Announcement for ${courseTitle}</span>
      <h2 style="color: #f8fafc; font-size: 18px; margin: 6px 0 12px 0; font-weight: 800;">${title}</h2>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-line;">${message}</p>
      <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0 0;">&mdash; ${instructorName}, Course Instructor</p>
    </div>
  `;
  return sendEmail({ to, subject: `Announcement: "${title}" (${courseTitle})`, html: renderBrandWrapper(content, 'Course Announcement') });
};

// -------------------------------------------------------------
// 17. Inactive Student Reminder (Re-engagement)
// -------------------------------------------------------------
export const sendInactiveStudentReminderEmail = async (
  to: string,
  name: string,
  courseTitle: string,
  courseId: string,
  lastActiveDays: number,
  progressPercentage: number
) => {
  const content = `
    <div style="text-align: center; background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(15, 23, 42, 0.6)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <div style="font-size: 36px; margin-bottom: 8px;">💡</div>
      <h2 style="color: #f8fafc; font-size: 20px; margin: 0 0 4px 0; font-weight: 800;">Ready to Continue Learning, ${name}?</h2>
      <p style="color: #fbbf24; font-size: 13px; margin: 0;">You're already ${progressPercentage}% through "${courseTitle}"</p>
    </div>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      We noticed you haven't logged in over the last ${lastActiveDays} days. A quick 15-minute lesson today will keep your skills sharp and bring you closer to earning your official certificate!
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${env.APP_URL}/dashboard" style="background: linear-gradient(135deg, #d97706, #f59e0b); color: #0a1322; padding: 14px 34px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; display: inline-block;">
        Jump Back In →
      </a>
    </div>
  `;
  return sendEmail({ to, subject: `💡 Pick Up Where You Left Off in "${courseTitle}"`, html: renderBrandWrapper(content, 'Learning Milestone') });
};
