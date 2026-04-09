# GSP Email Setup

Guide Sheet Pro now supports both Amazon SES and SMTP.

## 1) Choose a provider

Set one of these in `backend/.env`:

- `EMAIL_PROVIDER=ses`
- `EMAIL_PROVIDER=smtp`
- `EMAIL_PROVIDER=auto` (default behavior if omitted)

`auto` will try SES first when SES variables are present, then SMTP if SMTP variables are present.

## 2) Amazon SES setup

Required variables:

```env
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_FROM_EMAIL=verified-sender@yourdomain.com
```

Important notes:
- `AWS_FROM_EMAIL` must be verified in Amazon SES.
- If your SES account is still in sandbox mode, the recipient email must also be verified.
- The IAM user/key must have permission to send email with SES.
- The AWS region must match the SES region where your sender identity is verified.

## 3) SMTP setup

Supported variable names:
- `SMTP_HOST` or `EMAIL_HOST`
- `SMTP_PORT` or `EMAIL_PORT`
- `SMTP_USER` or `EMAIL_USER`
- `SMTP_PASS` or `EMAIL_PASS`
- `SMTP_FROM` or `EMAIL_FROM`
- `SMTP_SECURE` or `EMAIL_SECURE`

Example Gmail dev setup:

```env
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=yourgmail@gmail.com
EMAIL_SECURE=false
```

Important notes:
- For Gmail, use a Google App Password, not your normal Gmail password.
- App Passwords require 2-step verification on the Google account.
- Port `587` usually uses `EMAIL_SECURE=false`.
- Port `465` usually uses `EMAIL_SECURE=true`.

## 4) What changed in GSP

If email sending fails now, GSP will return:
- a clearer error message
- a configuration hint
- the verification/reset link for manual testing
- debug info in non-production environments

## 5) Most common SES failure you will see

If registration says SES rejected the email, usually one of these is true:
- `AWS_FROM_EMAIL` is not verified
- the app is in SES sandbox and the recipient email is not verified
- the AWS key does not have SES send permission
