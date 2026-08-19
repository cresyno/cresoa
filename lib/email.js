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

export async function sendVerificationEmail(to, verificationLink) {
  try {
    await transporter.sendMail({
      from: `"Cresoa" <${process.env.BREVO_FROM_EMAIL}>`,
      to: to,
      subject: 'Verify your email address',
      html: `<h2>Verify your email</h2><p>Click <a href="${verificationLink}">here</a> to verify.</p>`,
    });
    return { success: true };
  } catch (error) {
    console.error('Verification email error:', error);
    return { success: false, error };
  }
}

export async function sendPasswordResetEmail(to, resetLink) {
  try {
    await transporter.sendMail({
      from: `"Cresoa" <${process.env.BREVO_FROM_EMAIL}>`,
      to: to,
      subject: 'Reset your password',
      html: `<h2>Reset your password</h2><p>Click <a href="${resetLink}">here</a> to reset.</p>`,
    });
    return { success: true };
  } catch (error) {
    console.error('Password reset email error:', error);
    return { success: false, error };
  }
}

export async function sendBetaInviteEmail(to, inviteCode) {
  try {
    await transporter.sendMail({
      from: `"Cresoa" <${process.env.BREVO_FROM_EMAIL}>`,
      to: to,
      subject: 'You are invited to join Cresoa Beta!',
      html: `<h2>Beta Invite</h2><p>Your invite code: <strong>${inviteCode}</strong></p>`,
    });
    return { success: true };
  } catch (error) {
    console.error('Beta invite email error:', error);
    return { success: false, error };
  }
}

export async function sendStaffInviteEmail(to, inviteCode, businessName) {
  try {
    await transporter.sendMail({
      from: `"Cresoa" <${process.env.BREVO_FROM_EMAIL}>`,
      to: to,
      subject: `You've been invited to join ${businessName}`,
      html: `<h2>Invite</h2><p>Your invite code: <strong>${inviteCode}</strong></p>`,
    });
    return { success: true };
  } catch (error) {
    console.error('Staff invite email error:', error);
    return { success: false, error };
  }
}

// ─── NEW: Ticket Reply Email ───
export async function sendTicketReplyEmail(to, businessName, subject, message) {
  try {
    await transporter.sendMail({
      from: `"Cresoa Support" <${process.env.BREVO_FROM_EMAIL}>`,
      to: to,
      subject: `Re: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #F7F5F0; padding: 2rem;">
          <div style="background: #fff; border-radius: 12px; padding: 2rem;">
            <h2 style="color: #0F2B4A;">Cresoa Support</h2>
            <p>Dear <strong>${businessName}</strong>,</p>
            <p>${message.replace(/\n/g, '<br/>')}</p>
            <p style="color: #888;">Best regards,<br/>The Cresoa Team</p>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Ticket reply email error:', error);
    return { success: false, error };
  }
}
