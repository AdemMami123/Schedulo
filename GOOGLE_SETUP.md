# Google Cloud Console Setup Guide

## Step 1: Create/Configure Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your existing project
3. Make sure billing is enabled (required for OAuth)

## Step 2: Enable APIs

1. Go to "APIs & Services" > "Library"
2. Search for and enable:
   - **Google+ API** (for basic profile info)
   - **Google Calendar API** (for calendar integration)

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - **App name**: Schedulo
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **App domain**: Leave blank for now
   - **Authorized domains**: Add `localhost` for development

4. **Scopes**: Add the following scopes:
   - `email`
   - `profile`
   - `openid`
   - (Calendar scopes will be added later)

5. **Test users**: Add your email address as a test user

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Configure:
   - **Name**: Schedulo Web Client
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000`
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000`
     - `https://yourdomain.com` (for production)

5. Copy the Client ID (you already have this: 397817564437-3ool57mt7icc5q0vsauigakvgd3u6a5l.apps.googleusercontent.com)

## Step 5: Firebase Authentication Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `smart-scheduling-app-a94b1`
3. Go to "Authentication" > "Sign-in method"
4. Enable "Google" provider
5. Use the same OAuth 2.0 Client ID from Google Cloud Console
6. Add authorized domains:
   - `localhost`
   - Your production domain

## Step 6: Test Basic Authentication

After completing the above steps, try logging in again. You should only see basic profile permissions requested.

## Step 7: Add Calendar Scopes (Later)

Once basic authentication works:

1. Update OAuth consent screen to include calendar scopes
2. Uncomment the calendar scopes in `src/lib/firebase.ts`
3. Test calendar integration

## Troubleshooting

### "App not verified" error
- Make sure your app is in "Testing" mode in OAuth consent screen
- Add your email as a test user
- For production, you'll need to submit for verification

### "redirect_uri_mismatch" error
- Check that your redirect URIs match exactly in Google Cloud Console
- Include both HTTP and HTTPS versions if needed

### Domain verification issues
- For development, use `localhost` not `127.0.0.1`
- Make sure authorized domains include your domain without protocol
