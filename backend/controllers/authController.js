const { Op } = require('sequelize');
const User = require('../models/userModel');
const sendEmail = require('../utils/sendEmail');
const generateRandomToken = require('../utils/generateToken');
const { generateToken } = require('../utils/jwt');

function isUserVerified(user) {
  if (!user) return false;

  if (typeof user.is_verified === 'boolean') {
    return user.is_verified;
  }

  if (user.dataValues && typeof user.dataValues.is_verified === 'boolean') {
    return user.dataValues.is_verified;
  }

  return false;
}

function buildLoginResponse(user) {
  const isVerified = isUserVerified(user);
  const redirectTo = user.profile_type === 'Admin' ? '/adminView' : '/home';

  return {
    message: 'Login successful.',
    token: generateToken(user),
    redirectTo,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      profile_type: user.profile_type,
      is_verified: isVerified,
    },
  };
}

function getBaseUrl(req) {
  return process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}` || 'http://localhost:5000';
}

function createEmailLayout({ title, intro, ctaText, ctaUrl, extraHtml = '' }) {
  return `
    <div style="font-family: Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #1f2937;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
        <h1 style="margin: 0 0 16px; font-size: 28px; color: #111827;">Guide Sheet Pro</h1>
        <h2 style="margin: 0 0 12px; font-size: 22px; color: #111827;">${title}</h2>
        <p style="margin: 0 0 24px; line-height: 1.6;">${intro}</p>
        <p style="margin: 0 0 24px;">
          <a href="${ctaUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">${ctaText}</a>
        </p>
        <p style="margin: 0 0 12px; line-height: 1.6;">If the button does not work, copy and paste this link into your browser:</p>
        <p style="margin: 0 0 24px; word-break: break-all;"><a href="${ctaUrl}">${ctaUrl}</a></p>
        ${extraHtml}
        <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">If you did not request this, you can safely ignore this email.</p>
      </div>
    </div>
  `;
}

function buildResultPage({ title, message, actionUrl = '/', actionText = 'Back to Login', success = true }) {
  const accent = success ? '#16a34a' : '#dc2626';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f3f4f6;
            color: #111827;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
            box-sizing: border-box;
          }
          .card {
            max-width: 560px;
            width: 100%;
            background: #fff;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
            border-top: 6px solid ${accent};
          }
          h1 {
            margin-top: 0;
            margin-bottom: 12px;
          }
          p {
            line-height: 1.6;
          }
          a.button {
            display: inline-block;
            margin-top: 20px;
            background: #2563eb;
            color: #fff;
            text-decoration: none;
            padding: 12px 18px;
            border-radius: 8px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${title}</h1>
          <p>${message}</p>
          <a class="button" href="${actionUrl}">${actionText}</a>
        </div>
      </body>
    </html>
  `;
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function buildEmailDebugPayload(emailResult, linkKey, linkValue, fallbackWarning) {
  const response = {};

  if (!emailResult?.ok) {
    response.email_warning = fallbackWarning;
    response.email_error = emailResult.publicMessage || 'Email delivery failed.';
    response.email_hint = emailResult.publicHint || 'Check your email configuration.';
    response[linkKey] = linkValue;
  } else if (!isProduction()) {
    response[linkKey] = linkValue;
  }

  if (!isProduction() && emailResult?.details) {
    response.email_debug = emailResult.details;
  }

  if (!isProduction() && emailResult?.provider) {
    response.email_provider = emailResult.provider;
  }

  return response;
}

async function safelySendEmail(payload) {
  try {
    const result = await sendEmail(payload);
    return {
      ok: true,
      provider: result.provider,
      result: result.result,
    };
  } catch (error) {
    console.error('Email send failed:', error.message);
    if (error?.details) {
      console.error('Email send diagnostics:', JSON.stringify(error.details, null, 2));
    }

    return {
      ok: false,
      publicMessage: error?.publicMessage || 'Email delivery failed.',
      publicHint: error?.publicHint || 'Check your email configuration and try again.',
      details: error?.details || null,
    };
  }
}

async function issueVerificationEmail(req, user) {
  const verificationToken = generateRandomToken();
  const verificationTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  user.verification_token = verificationToken;
  user.verification_token_expiry = verificationTokenExpires;
  await user.save();

  const baseUrl = getBaseUrl(req);
  const verifyUrl = `${baseUrl}/api/verify-email/${verificationToken}`;

  const emailResult = await safelySendEmail({
    to: user.email,
    subject: 'Verify your Guide Sheet Pro email',
    html: createEmailLayout({
      title: 'Verify your email',
      intro: `Hi ${user.first_name || 'there'}, please confirm your email address to activate your Guide Sheet Pro account. This link expires in 24 hours.`,
      ctaText: 'Verify Email',
      ctaUrl: verifyUrl,
    }),
  });

  return {
    emailResult,
    verifyUrl,
  };
}

async function issuePasswordResetEmail(req, user) {
  const resetToken = generateRandomToken();
  const resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60);

  user.reset_password_token = resetToken;
  user.reset_password_expiry = resetPasswordExpires;
  await user.save();

  const baseUrl = getBaseUrl(req);
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

  const emailResult = await safelySendEmail({
    to: user.email,
    subject: 'Reset your Guide Sheet Pro password',
    html: createEmailLayout({
      title: 'Reset your password',
      intro: `Hi ${user.first_name || 'there'}, we received a request to change your Guide Sheet Pro password. This link expires in 1 hour.`,
      ctaText: 'Change Password',
      ctaUrl: resetUrl,
      extraHtml: '<p style="margin: 0; color: #6b7280; font-size: 14px;">For security, any older reset links will stop working after a new one is requested.</p>',
    }),
  });

  return {
    emailResult,
    resetUrl,
  };
}

const register = async (req, res) => {
  try {
    let { first_name, last_name, email, password } = req.body;

    email = String(email || '').trim().toLowerCase();
    first_name = String(first_name || '').trim();
    last_name = String(last_name || '').trim();
    password = String(password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    if (!first_name) first_name = email.split('@')[0] || 'User';
    if (!last_name) last_name = 'User';

    const user = await User.create({
      first_name,
      last_name,
      email,
      password_hash: password,
      profile_type: 'Guest',
      is_verified: false,
      verification_token: null,
      verification_token_expiry: null,
    });

    const { emailResult, verifyUrl } = await issueVerificationEmail(req, user);

    const response = {
      message: emailResult.ok
        ? 'Account created. Please check your email to verify your account.'
        : 'Account created, but the verification email could not be sent automatically.',
      requires_verification: true,
      ...buildEmailDebugPayload(
        emailResult,
        'verification_url',
        verifyUrl,
        'Verification email could not be sent automatically.'
      ),
    };

    return res.status(201).json(response);
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const resendVerification = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(200).json({
        message: 'If the account exists and still needs verification, a new verification email has been sent.',
      });
    }

    if (isUserVerified(user)) {
      return res.status(200).json({
        message: 'This account is already verified. You can log in now.',
      });
    }

    const { emailResult, verifyUrl } = await issueVerificationEmail(req, user);

    const response = {
      message: emailResult.ok
        ? 'If the account exists and still needs verification, a new verification email has been sent.'
        : 'The account still needs verification, but the verification email could not be sent automatically.',
      ...buildEmailDebugPayload(
        emailResult,
        'verification_url',
        verifyUrl,
        'Verification email could not be sent automatically.'
      ),
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error('ResendVerification error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const token = String(req.params?.token || '').trim();

    if (!token) {
      return res.status(400).send(buildResultPage({
        title: 'Verification failed',
        message: 'This verification link is invalid or missing.',
        success: false,
      }));
    }

    const user = await User.findOne({
      where: {
        verification_token: token,
        verification_token_expiry: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).send(buildResultPage({
        title: 'Verification link expired',
        message: 'This verification link is invalid or has expired. Request a new verification email from the login page.',
        success: false,
      }));
    }

    user.is_verified = true;
    if (user.profile_type === 'Guest') {
      user.profile_type = 'Registered';
    }
    user.verification_token = null;
    user.verification_token_expiry = null;
    await user.save();

    return res.send(buildResultPage({
      title: 'Email verified',
      message: 'Your email has been verified successfully. You can now log in to Guide Sheet Pro.',
      success: true,
    }));
  } catch (err) {
    console.error('VerifyEmail error:', err);
    return res.status(500).send(buildResultPage({
      title: 'Server error',
      message: 'Something went wrong while verifying your email. Please try again later.',
      success: false,
    }));
  }
};

const login = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (!isUserVerified(user)) {
      const response = {
        message: 'Please verify your email first.',
        requires_verification: true,
      };

      if (!isProduction()) {
        response.hint = 'Use the resend verification option if you need a fresh email.';
      }

      return res.status(403).json(response);
    }

    if (user.profile_type === 'Banned') {
      return res.status(403).json({ message: 'Your account has been banned.' });
    }

    const loginResponse = buildLoginResponse(user);

    res.cookie('authToken', loginResponse.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction(),
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.json(loginResponse);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: {
        exclude: [
          'password_hash',
          'password_salt',
          'verification_token',
          'verification_token_expiry',
          'reset_password_token',
          'reset_password_expiry',
        ],
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json(user);
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(200).json({
        message: 'If this email is registered, a password reset link has been sent.',
      });
    }

    const { emailResult, resetUrl } = await issuePasswordResetEmail(req, user);

    const response = {
      message: emailResult.ok
        ? 'If this email is registered, a password reset link has been sent.'
        : 'A password reset link was created, but the reset email could not be sent automatically.',
      ...buildEmailDebugPayload(
        emailResult,
        'reset_url',
        resetUrl,
        'Reset email could not be sent automatically.'
      ),
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error('ForgotPassword error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = String(req.params?.token || '').trim();
    const password = String(req.body?.password || '').trim();

    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const user = await User.findOne({
      where: {
        reset_password_token: token,
        reset_password_expiry: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    user.password_hash = password;
    user.reset_password_token = null;
    user.reset_password_expiry = null;
    await user.save();

    return res.json({
      message: 'Password updated successfully. You can now log in.',
    });
  } catch (err) {
    console.error('ResetPassword error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
