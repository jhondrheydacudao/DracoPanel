require('dotenv').config();
const nodemailer = require('nodemailer');
const { db } = require('./db.js');
const config = require('../config.json');

async function getSMTPSettings() {
  const envSMTP = {
    server: process.env.SMTP_SERVER,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : null,
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
    fromName: process.env.SMTP_FROM_NAME || 'Executorx',
    fromAddress: process.env.SMTP_FROM_ADDRESS || 'no-reply@example.com'
  };

  let smtpSettings = envSMTP;

  if (!envSMTP.server || !envSMTP.port || !envSMTP.username || !envSMTP.password) {
    console.warn('SMTP environment variables not fully set, falling back to database settings.');
    const dbSMTP = await db.get('smtp_settings');

    if (!dbSMTP) {
      throw new Error('SMTP settings not found in environment variables or database.');
    }

    smtpSettings = {
      server: dbSMTP.server,
      port: dbSMTP.port,
      username: dbSMTP.username,
      password: dbSMTP.password,
      fromName: dbSMTP.fromName || 'Executorx',
      fromAddress: dbSMTP.fromAddress || 'no-reply@example.com'
    };
  }

  const secure = ![587, 25].includes(smtpSettings.port);

  const transporter = nodemailer.createTransport({
    host: smtpSettings.server,
    port: smtpSettings.port,
    secure,
    auth: {
      user: smtpSettings.username,
      pass: smtpSettings.password,
    },
    tls: secure ? undefined : { rejectUnauthorized: true },
  });

  return { transporter, smtpSettings };
}

async function sendEmail(to, subject, htmlContent) {
  try {
    const { transporter, smtpSettings } = await getSMTPSettings();
    
    const mailOptions = {
      from: `${smtpSettings.fromName} <${smtpSettings.fromAddress}>`,
      to,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
}

// Improved Welcome Email
async function sendWelcomeEmail(email, username, password) {
  const subject = `🎉 Welcome to ${config.panelName}!`;
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px;">
        <h2 style="color: #007bff; text-align: center;">Welcome to ${config.panelName}!</h2>
        <p>Hi <b>${username}</b>,</p>
        <p>We're excited to have you on board! Below are your login details:</p>
        <p><b>Username:</b> ${username}<br><b>Password:</b> ${password}</p>
        <p>Click the button below to log in:</p>
        <div style="text-align: center;">
          <a href="${config.baseUri}/auth/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login Now</a>
        </div>
        <p>If you have any questions, feel free to contact us.</p>
        <p style="color: gray; text-align: center;">- The ${config.panelName} Team</p>
      </div>
    </div>
  `;

  await sendEmail(email, subject, html);
}

// Improved Email Verification
async function sendVerificationEmail(email, token) {
  const subject = '🔐 Verify Your Email Address';
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px;">
        <h2 style="text-align: center; color: #28a745;">Email Verification</h2>
        <p>Hi there,</p>
        <p>Please confirm your email by clicking the button below:</p>
        <div style="text-align: center;">
          <a href="${config.baseUri}/verify/${token}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        </div>
        <p>If you didn’t request this, please ignore this email.</p>
        <p style="color: gray; text-align: center;">- The ${config.panelName} Team</p>
      </div>
    </div>
  `;

  await sendEmail(email, subject, html);
}

// Improved Password Reset Email
async function sendPasswordResetEmail(email, token) {
  const subject = '🔑 Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px;">
        <h2 style="text-align: center; color: #dc3545;">Reset Your Password</h2>
        <p>Hello,</p>
        <p>It looks like you requested a password reset. Click the button below to reset your password:</p>
        <div style="text-align: center;">
          <a href="${config.baseUri}/auth/reset/${token}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
        <p>If you didn't request this, you can ignore this email.</p>
        <p style="color: gray; text-align: center;">- The ${config.panelName} Team</p>
      </div>
    </div>
  `;

  await sendEmail(email, subject, html);
}

// Improved Test Email
async function sendTestEmail(email) {
  const subject = '📧 Test Email from ' + config.panelName;
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px;">
        <h2 style="text-align: center; color: #17a2b8;">Test Email</h2>
        <p>Hello,</p>
        <p>This is a test email from <b>${config.panelName}</b>. If you received this email, it means your SMTP settings are correctly configured!</p>
        <p style="color: gray; text-align: center;">- The ${config.panelName} Team</p>
      </div>
    </div>
  `;

  await sendEmail(email, subject, html);
}

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendTestEmail,
  sendVerificationEmail,
};
