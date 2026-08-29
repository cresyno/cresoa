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

const fromEmail = process.env.BREVO_FROM_EMAIL;
const brandName = 'Cresoa';

// ─── Reusable email wrapper ───
const emailLayout = (content) => `
  <div style="font-family: Arial, sans-serif; background: #F7F5F0; padding: 2rem;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 2rem; border: 1px solid #E5E0D8;">
      ${content}
      <hr style="margin-top: 2rem; border: none; border-top: 1px solid #E5E0D8;" />
      <p style="text-align: center; color: #888; font-size: 0.85rem; margin: 1rem 0 0;">
        <strong>${brandName}</strong><br/>Business management made simple.
      </p>
    </div>
  </div>
`;

const buttonStyle = `
  display: inline-block;
  background: #D4A52A;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
  margin: 20px 0;
`;

// ─── 1. Email Verification ───
export async function sendVerificationEmail(to, verificationLink) {
  try {
    const html = emailLayout(`
      <h2 style="color: #0F2B4A;">Welcome to Cresoa — verify your email</h2>
      <p>You're one step away from getting your business set up.</p>
      <p>Please verify your email address to activate your Cresoa account and continue setting up your business.</p>
      <a href="${verificationLink}" style="${buttonStyle}">Verify my email</a>
      <p>If you didn't create a Cresoa account, you can safely ignore this email.</p>
    `);

    await transporter.sendMail({
      from: `"${brandName}" <${fromEmail}>`,
      to,
      subject: 'Welcome to Cresoa — verify your email',
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Verification email error:', error);
    return { success: false, error };
  }
}

// ─── 2. Password Reset ───
export async function sendPasswordResetEmail(to, resetLink) {
  try {
    const html = emailLayout(`
      <h2 style="color: #0F2B4A;">Let's get you back in</h2>
      <p>We received a request to reset the password for your Cresoa account.</p>
      <p>Click the button below to create a new password and get back to your business.</p>
      <a href="${resetLink}" style="${buttonStyle}">Reset my password</a>
      <p>If you didn't request a password reset, you can ignore this email. Your password will remain unchanged.</p>
      <p style="font-size: 0.8rem; color: #888;">For your security, don't share this link with anyone.</p>
    `);

    await transporter.sendMail({
      from: `"${brandName}" <${fromEmail}>`,
      to,
      subject: 'Reset your Cresoa password',
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Password reset email error:', error);
    return { success: false, error };
  }
}

// ─── 3. Beta Invitation ───
export async function sendBetaInviteEmail(to, inviteCode) {
  try {
    const joinLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cresoa.com.ng'}/signup?code=${inviteCode}`;
    const html = emailLayout(`
      <h2 style="color: #0F2B4A;">Welcome to Cresoa Beta 🎉</h2>
      <p>You've been invited to get early access to Cresoa.</p>
      <p>Cresoa is built to help Nigerian businesses stay organised, manage their day-to-day operations and spend less time trying to keep everything in their head.</p>
      <p>Here's your invitation code:</p>
      <p style="font-size: 1.4rem; font-weight: bold; color: #D4A52A;">${inviteCode}</p>
      <p>Use this code when joining Cresoa Beta.</p>
      <a href="${joinLink}" style="${buttonStyle}">Join Cresoa</a>
      <p>Your feedback during this early stage matters. You're not just using Cresoa — you're helping us build it better.</p>
    `);

    await transporter.sendMail({
      from: `"${brandName}" <${fromEmail}>`,
      to,
      subject: "You're invited to Cresoa Beta 🎉",
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Beta invite email error:', error);
    return { success: false, error };
  }
}

// ─── 4. Staff Invitation (acceptLink now included) ───
export async function sendStaffInviteEmail(to, inviteCode, businessName, acceptLink) {
  try {
    const html = emailLayout(`
      <h2 style="color: #0F2B4A;">You've been invited to join a business on Cresoa</h2>
      <p><strong>${businessName}</strong> has invited you to join their team on Cresoa.</p>
      <p>Cresoa helps businesses keep their customers, jobs, orders and day-to-day work organised in one place.</p>
      <p>Your invitation code is:</p>
      <p style="font-size: 1.4rem; font-weight: bold; color: #D4A52A;">${inviteCode}</p>
      <p>Use this code when joining the business on Cresoa.</p>
      <a href="${acceptLink}" style="${buttonStyle}">Join the team</a>
      <p>If you weren't expecting this invitation, you can simply ignore this email.</p>
    `);

    await transporter.sendMail({
      from: `"${brandName}" <${fromEmail}>`,
      to,
      subject: `You've been invited to join ${businessName} on Cresoa`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Staff invite email error:', error);
    return { success: false, error };
  }
}

// ─── 5. Support / Ticket Reply ───
export async function sendTicketReplyEmail(to, businessName, subject, message) {
  try {
    const html = emailLayout(`
      <h2 style="color: #0F2B4A;">Cresoa Support</h2>
      <p>Hi <strong>${businessName}</strong>,</p>
      <p>We've got an update for you regarding your support request.</p>
      <p>${message.replace(/\n/g, '<br/>')}</p>
      <p>If you need further help with this issue, you can continue the conversation through Cresoa Support.</p>
      <p>We're here to help you keep your business moving.</p>
      <p style="margin-top: 1.5rem; color: #888;">Cresoa Support</p>
    `);

    await transporter.sendMail({
      from: `"Cresoa Support" <${fromEmail}>`,
      to,
      subject: `Re: ${subject}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Ticket reply email error:', error);
    return { success: false, error };
  }
      }
