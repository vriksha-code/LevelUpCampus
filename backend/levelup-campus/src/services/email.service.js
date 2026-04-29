const nodemailer = require("nodemailer");

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || "smtp.gmail.com",
      port:   parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Send OTP verification email
 */
const sendOTPEmail = async (to, otp, name = "Student") => {
  const hasEmailCredentials = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

  if (!hasEmailCredentials) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[dev-email] OTP for ${to}: ${otp}`);
      return;
    }

    throw new Error("Email credentials are not configured.");
  }

  const transport = getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f4f7ff; margin: 0; padding: 0; }
        .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 36px 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 28px; letter-spacing: -0.5px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 40px 32px; }
        .greeting { font-size: 18px; color: #1a1a2e; font-weight: 600; margin-bottom: 12px; }
        .message { color: #555; font-size: 15px; line-height: 1.6; }
        .otp-box { background: #f4f7ff; border: 2px dashed #667eea; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }
        .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #667eea; font-family: monospace; }
        .otp-label { font-size: 13px; color: #888; margin-top: 8px; }
        .expiry { color: #e74c3c; font-size: 13px; text-align: center; margin-bottom: 24px; }
        .footer { background: #f9f9f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
        .warning { background: #fff8e1; border-left: 4px solid #f39c12; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #7d6608; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎮 LevelUp Campus</h1>
          <p>Your academic journey starts here</p>
        </div>
        <div class="body">
          <div class="greeting">Hey ${name}! 👋</div>
          <div class="message">
            Use the OTP below to verify your college email and start your LevelUp journey.
          </div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-label">One-Time Password</div>
          </div>
          <div class="expiry">⏱ This OTP expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</div>
          <div class="warning">
            🔐 Never share this OTP with anyone. LevelUp Campus will never ask for your OTP.
          </div>
        </div>
        <div class="footer">
          LevelUp Campus • Empowering Students Everywhere<br/>
          If you didn't request this, you can safely ignore this email.
        </div>
      </div>
    </body>
    </html>
  `;

  await transport.sendMail({
    from:    process.env.EMAIL_FROM || "LevelUp Campus <noreply@levelupcampus.com>",
    to,
    subject: `${otp} — Your LevelUp Campus Verification OTP`,
    html,
  });
};

/**
 * Send badge earned notification email
 */
const sendBadgeEmail = async (to, name, badge) => {
  const transport = getTransporter();
  await transport.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject: `🏆 You earned the "${badge.name}" badge on LevelUp Campus!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;">
        <h2>🎉 Congratulations, ${name}!</h2>
        <p>You just unlocked the <strong>${badge.icon} ${badge.name}</strong> badge!</p>
        <p style="color:#666">${badge.description}</p>
        <p>+${badge.xpReward} XP has been added to your profile.</p>
        <a href="${process.env.CLIENT_URL}/dashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#667eea;color:#fff;border-radius:8px;text-decoration:none;">View Dashboard →</a>
      </div>
    `,
  });
};

module.exports = { sendOTPEmail, sendBadgeEmail };
