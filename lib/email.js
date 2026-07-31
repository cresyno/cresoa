// lib/email.js
import nodemailer from 'nodemailer'

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

/**
 * Send a staff invitation email
 */
export async function sendStaffInviteEmail(to, inviterName, businessName, acceptLink) {
  const subject = `You've been invited to join ${businessName} on Cresoa`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>🎉 You're Invited!</h2>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${businessName}</strong> on Cresoa.</p>
      <p>To accept this invitation, click the button below:</p>
      <a href="${acceptLink}" style="display: inline-block; padding: 12px 24px; background: #1E3A5F; color: #fff; text-decoration: none; border-radius: 6px;">
        Accept Invitation
      </a>
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        If you don't have a Cresoa account yet, you'll be prompted to create one.<br>
        This link expires in 7 days.
      </p>
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #999;">
        If you didn't expect this invitation, you can ignore this email.
      </p>
    </div>
  `

  await transporter.sendMail({
    from: `"Cresoa" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  })
}
