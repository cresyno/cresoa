import nodemailer from 'nodemailer';

// ─── Brevo SMTP Transport ───
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASSWORD,
  },
});

// ─── Send Verification Email (Signup) ───
export async function sendVerificationEmail(to, verificationLink) {
  try {
    await transporter.sendMail({
      from: `"Cresoa" <${process.env.BREVO_FROM_EMAIL}>`,
      to: to,
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0F2B4A;">Verify your email</h2>
          <p>Click the link below to verify your email:</p>
          <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #D4A52A; color: #0F2B4A; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Verify Email
          </a>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Verification email error:', error);
    return { success: false, error };
  }
}

// ─── Send Password Reset Email ───
export async function sendPasswordResetEmail(to, resetLink) {
  try {
    await transporter.sendMail({
      from: `"Cresoa" <${process.env.BREVO_FROM_EMAIL}>`,
      to: to,
      subject: 'Reset your password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0F2B4A;">Reset your password</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #D4A52A; color: #0F2B4A; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
          <p style="color: #8A8A8A; font-size: 0.85rem;">This link expires in 1 hour.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Password reset email error:', error);
    return { success: false, error };
  }
}
