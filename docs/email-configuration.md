# Email Configuration for Schedulo

This document explains how to set up and configure the email functionality for Schedulo.

## Overview

Schedulo uses two email providers:

1. **Resend** - A modern email API (primary provider if configured)
2. **Nodemailer** - A traditional SMTP email library (fallback)

For development purposes, Nodemailer will use [Ethereal Email](https://ethereal.email/) to create test accounts automatically.

## Configuration

### Setting up the environment

Create a `.env.local` file in the root of the project with the following variables:

```
# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_password_here

# Resend API (alternative email provider)
NEXT_PUBLIC_RESEND_API_KEY=re_your_resend_api_key
```

### For Development

For development, you don't need to set any SMTP credentials. The application will automatically create a test account with Ethereal Email. The test emails can be viewed at the URL that is logged to the console.

### For Production

For production, you should configure either:

1. **Resend**: Sign up at [resend.com](https://resend.com), create an API key, and add it to your environment as `NEXT_PUBLIC_RESEND_API_KEY`.

2. **SMTP Server**: Configure a real SMTP server with the `SMTP_*` environment variables.

## Email Functionality

The following emails are sent by the application:

1. **Booking Confirmation** - Sent to guests when they book a meeting
2. **Host Notification** - Sent to hosts when someone books a meeting with them

## Testing Email Functionality

To test email functionality:

1. Run the application in development mode
2. Create a booking through the booking form
3. Check the console for the Ethereal Email preview URL
4. Open the URL to view the sent email
