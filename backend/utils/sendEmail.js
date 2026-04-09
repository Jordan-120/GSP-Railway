let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  nodemailer = null;
}

class EmailDeliveryError extends Error {
  constructor({ message, publicMessage, publicHint, details }) {
    super(message || publicMessage || 'Email delivery failed.');
    this.name = 'EmailDeliveryError';
    this.publicMessage = publicMessage || 'Email delivery failed.';
    this.publicHint = publicHint || 'Check your email provider settings and try again.';
    this.details = details || null;
  }
}

function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function getEmailProviderPreference() {
  return envValue('EMAIL_PROVIDER').toLowerCase() || 'auto';
}

function getSesConfig() {
  return {
    region: envValue('AWS_REGION'),
    accessKeyId: envValue('AWS_ACCESS_KEY_ID'),
    secretAccessKey: envValue('AWS_SECRET_ACCESS_KEY'),
    fromEmail: envValue('AWS_FROM_EMAIL', 'EMAIL_FROM'),
  };
}

function hasSesConfig(config = getSesConfig()) {
  return Boolean(config.region && config.accessKeyId && config.secretAccessKey && config.fromEmail);
}

function getSmtpConfig() {
  return {
    host: envValue('SMTP_HOST', 'EMAIL_HOST'),
    port: Number(envValue('SMTP_PORT', 'EMAIL_PORT') || 587),
    secure: String(envValue('SMTP_SECURE', 'EMAIL_SECURE') || 'false').toLowerCase() === 'true',
    user: envValue('SMTP_USER', 'EMAIL_USER'),
    pass: envValue('SMTP_PASS', 'EMAIL_PASS'),
    from: envValue('SMTP_FROM', 'EMAIL_FROM'),
  };
}

function hasSmtpConfig(config = getSmtpConfig()) {
  return Boolean(config.host && config.user && config.pass);
}

function serializeError(error) {
  return {
    name: error?.name || 'Error',
    code: error?.code || error?.Code || null,
    message: error?.message || 'Unknown email error.',
  };
}

function classifyProviderError(provider, error) {
  const info = serializeError(error);
  const lowerMessage = String(info.message || '').toLowerCase();
  const lowerCode = String(info.code || '').toLowerCase();

  if (provider === 'ses') {
    if (lowerMessage.includes('email address is not verified') || lowerCode === 'messagerejected') {
      return {
        publicMessage: 'Amazon SES rejected the email.',
        publicHint:
          'Verify the sender email in SES. If your SES account is still in sandbox mode, verify the recipient email too.',
      };
    }

    if (
      lowerCode === 'invalidclienttokenid' ||
      lowerCode === 'signaturedoesnotmatch' ||
      lowerCode === 'unrecognizedclientexception' ||
      lowerCode === 'accessdeniedexception' ||
      lowerMessage.includes('security token included in the request is invalid')
    ) {
      return {
        publicMessage: 'Amazon SES credentials were rejected.',
        publicHint: 'Check AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and IAM SES send permissions.',
      };
    }

    return {
      publicMessage: 'Amazon SES could not send the email.',
      publicHint: 'Check SES region, verified sender address, sandbox restrictions, and IAM permissions.',
    };
  }

  if (!nodemailer) {
    return {
      publicMessage: 'SMTP email sending is unavailable.',
      publicHint: 'Install nodemailer or use Amazon SES instead.',
    };
  }

  if (
    lowerCode === 'eauth' ||
    lowerMessage.includes('invalid login') ||
    lowerMessage.includes('authentication unsuccessful') ||
    lowerMessage.includes('auth')
  ) {
    return {
      publicMessage: 'SMTP login failed.',
      publicHint: 'Check the SMTP username/password. For Gmail, use an App Password instead of your normal password.',
    };
  }

  if (
    lowerCode === 'econnection' ||
    lowerCode === 'esocket' ||
    lowerCode === 'etimedout' ||
    lowerCode === 'econnrefused' ||
    lowerMessage.includes('connect')
  ) {
    return {
      publicMessage: 'SMTP server connection failed.',
      publicHint: 'Check the SMTP host, port, secure setting, and whether your server can reach that mail server.',
    };
  }

  return {
    publicMessage: 'SMTP could not send the email.',
    publicHint: 'Check SMTP_HOST/EMAIL_HOST, SMTP_PORT/EMAIL_PORT, SMTP_USER/EMAIL_USER, and SMTP_PASS/EMAIL_PASS.',
  };
}

function buildMissingConfigError(provider) {
  if (provider === 'ses') {
    return new EmailDeliveryError({
      message: 'Amazon SES environment variables are incomplete.',
      publicMessage: 'Amazon SES is selected, but the SES settings are incomplete.',
      publicHint: 'Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_FROM_EMAIL.',
      details: {
        provider: 'ses',
        reason: 'missing_config',
      },
    });
  }

  return new EmailDeliveryError({
    message: 'SMTP environment variables are incomplete.',
    publicMessage: 'SMTP is selected, but the SMTP settings are incomplete.',
    publicHint:
      'Set SMTP_HOST/EMAIL_HOST, SMTP_PORT/EMAIL_PORT, SMTP_USER/EMAIL_USER, SMTP_PASS/EMAIL_PASS, and optionally SMTP_FROM/EMAIL_FROM.',
    details: {
      provider: 'smtp',
      reason: 'missing_config',
    },
  });
}

async function sendWithSes({ to, subject, html }, config = getSesConfig()) {
  if (!hasSesConfig(config)) {
    throw buildMissingConfigError('ses');
  }

  const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

  const ses = new SESClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  try {
    return await ses.send(
      new SendEmailCommand({
        Source: config.fromEmail,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
          },
          Body: {
            Html: {
              Data: html,
            },
          },
        },
      })
    );
  } catch (error) {
    const classification = classifyProviderError('ses', error);
    throw new EmailDeliveryError({
      message: `SES send failed: ${error.message}`,
      publicMessage: classification.publicMessage,
      publicHint: classification.publicHint,
      details: {
        provider: 'ses',
        ...serializeError(error),
      },
    });
  }
}

async function sendWithSmtp({ to, subject, html }, config = getSmtpConfig()) {
  if (!nodemailer) {
    throw new EmailDeliveryError({
      message: 'nodemailer is not installed.',
      publicMessage: 'SMTP email sending is unavailable.',
      publicHint: 'Install nodemailer or switch to Amazon SES.',
      details: {
        provider: 'smtp',
        reason: 'missing_dependency',
      },
    });
  }

  if (!hasSmtpConfig(config)) {
    throw buildMissingConfigError('smtp');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    await transporter.verify();

    return await transporter.sendMail({
      from: config.from || `"Guide Sheet Pro" <${config.user}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    const classification = classifyProviderError('smtp', error);
    throw new EmailDeliveryError({
      message: `SMTP send failed: ${error.message}`,
      publicMessage: classification.publicMessage,
      publicHint: classification.publicHint,
      details: {
        provider: 'smtp',
        ...serializeError(error),
      },
    });
  }
}

async function sendEmail(payload) {
  const providerPreference = getEmailProviderPreference();
  const sesConfig = getSesConfig();
  const smtpConfig = getSmtpConfig();
  const attempts = [];

  const providerOrder =
    providerPreference === 'ses'
      ? ['ses']
      : providerPreference === 'smtp'
        ? ['smtp']
        : hasSesConfig(sesConfig) && hasSmtpConfig(smtpConfig)
          ? ['ses', 'smtp']
          : hasSesConfig(sesConfig)
            ? ['ses']
            : hasSmtpConfig(smtpConfig)
              ? ['smtp']
              : [];

  if (!providerOrder.length) {
    throw new EmailDeliveryError({
      message: 'No email provider is configured.',
      publicMessage: 'No email provider is configured.',
      publicHint:
        'Set EMAIL_PROVIDER=smtp or ses. SMTP also supports EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASS aliases. See backend/EMAIL_SETUP.md.',
      details: {
        provider: providerPreference,
        reason: 'missing_all_config',
      },
    });
  }

  for (const provider of providerOrder) {
    try {
      const result =
        provider === 'ses'
          ? await sendWithSes(payload, sesConfig)
          : await sendWithSmtp(payload, smtpConfig);

      return {
        provider,
        result,
      };
    } catch (error) {
      attempts.push({
        provider,
        ...(error?.details || serializeError(error)),
        publicMessage: error?.publicMessage || 'Email delivery failed.',
        publicHint: error?.publicHint || 'Check your email configuration.',
      });

      if (providerPreference === 'ses' || providerPreference === 'smtp' || providerOrder.length === 1) {
        throw new EmailDeliveryError({
          message: error.message,
          publicMessage: error.publicMessage,
          publicHint: error.publicHint,
          details: {
            provider,
            attempts,
          },
        });
      }
    }
  }

  const primaryAttempt = attempts[0] || null;
  throw new EmailDeliveryError({
    message: primaryAttempt?.message || 'Email delivery failed.',
    publicMessage: primaryAttempt?.publicMessage || 'Email delivery failed.',
    publicHint: primaryAttempt?.publicHint || 'Check your email configuration and try again.',
    details: {
      provider: 'auto',
      attempts,
    },
  });
}

module.exports = sendEmail;
module.exports.EmailDeliveryError = EmailDeliveryError;
