# Schedulo Deployment Guide

## Vercel Environment Variables Setup

Copy these environment variables to your Vercel dashboard (replace placeholders with actual values):

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id_here
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret_here

# Production URLs (replace with your actual Vercel domain)
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_BASE_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=generate_a_strong_random_secret_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="your_private_key_here"
```

## Setup Steps:

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to APIs & Services → Credentials
4. Add authorized redirect URIs:
   - `https://your-app-name.vercel.app/api/auth/google-calendar/callback`
5. Add authorized JavaScript origins:
   - `https://your-app-name.vercel.app`

### 2. Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Authentication → Settings → Authorized domains
4. Add your Vercel domain: `your-app-name.vercel.app`

### 3. Vercel Dashboard Setup
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all the environment variables listed above
4. Redeploy your application

## Security Notes:
- Never commit actual credentials to git
- Use strong, unique secrets for production
- Regularly rotate your API keys and secrets
- Keep your Firebase private key secure
