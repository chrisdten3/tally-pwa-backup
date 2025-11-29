# Google Authentication Setup Guide

This guide will help you set up Google OAuth authentication for your Tally application using Supabase.

## Overview

Google authentication has been added to your application with the following features:
- Sign in with Google button on login page
- Sign up with Google button on signup page
- Automatic user profile creation for new Google users
- Session management with cookies

## Files Modified/Created

1. **API Routes Created:**
   - `/src/app/api/auth/google/route.ts` - Initiates Google OAuth flow
   - `/src/app/api/auth/callback/route.ts` - Handles OAuth callback and session creation

2. **Pages Updated:**
   - `/src/app/(auth)/login/page.tsx` - Added Google sign-in button
   - `/src/app/(auth)/signup/page.tsx` - Added Google sign-up button

## Setup Instructions

### 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - Your production domain (e.g., `https://yourdomain.com`)
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback` (for development)
     - `https://yourdomain.com/api/auth/callback` (for production)
     - Your Supabase redirect URI (see next step)
5. Save the **Client ID** and **Client Secret**

### 2. Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to "Authentication" > "Providers"
4. Find "Google" in the list and click to expand
5. Enable Google authentication
6. Enter your Google **Client ID** and **Client Secret**
7. Copy the "Callback URL (for OAuth)" provided by Supabase
8. Go back to Google Cloud Console and add this callback URL to your authorized redirect URIs
9. Save the configuration in Supabase

### 3. Update Your Google Cloud Console

Go back to the Google Cloud Console and add the Supabase callback URL:
- Go to "APIs & Services" > "Credentials"
- Click on your OAuth 2.0 Client ID
- Add the Supabase callback URL to "Authorized redirect URIs"
- Click "Save"

### 4. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page: `http://localhost:3000/login`

3. Click "Continue with Google"

4. You should be redirected to Google's sign-in page

5. After signing in, you should be redirected back to your app at `/home`

## How It Works

### Authentication Flow

1. **User clicks "Continue with Google"**
   - Frontend redirects to `/api/auth/google`
   - API route initiates OAuth flow with Supabase
   - User is redirected to Google's consent screen

2. **User authorizes the app**
   - Google redirects back to `/api/auth/callback` with an authorization code
   - Callback route exchanges the code for a session
   - If user doesn't exist in `users` table, a profile is created automatically

3. **Session is established**
   - Access token and refresh token are stored in HTTP-only cookies
   - User is redirected to `/home`

### User Profile Creation

For new Google users, the callback handler automatically creates a profile in your `users` table with:
- `id`: User's Supabase auth ID
- `first_name`: From Google's `given_name` metadata
- `last_name`: From Google's `family_name` metadata
- `name`: Full name from Google profile
- `email`: Google account email
- `created_at`: Timestamp

## Environment Variables

Make sure you have the following environment variables set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Troubleshooting

### "Invalid OAuth client" error
- Make sure your redirect URIs in Google Cloud Console match exactly (including http/https)
- Check that you've added both your app's callback URL and Supabase's callback URL

### "User not found" or profile not created
- Check that your `users` table has the correct schema
- Verify that `SUPABASE_SERVICE_ROLE_KEY` is set in your environment variables
- Check the server logs for any database errors

### Redirect loops
- Clear your browser cookies and local storage
- Verify that the callback URL is correctly configured in both Google and Supabase

### Error messages on login page
- The app displays OAuth errors as URL parameters
- Check the browser console for detailed error messages
- Verify all configuration steps were completed

## Security Considerations

1. **Never commit credentials**: Keep your `.env.local` file out of version control
2. **Use HTTPS in production**: Always use HTTPS for production OAuth flows
3. **Restrict redirect URIs**: Only add legitimate redirect URIs in Google Cloud Console
4. **Rotate secrets regularly**: Update your OAuth credentials periodically
5. **Monitor usage**: Check Google Cloud Console for unusual API usage

## Production Deployment

Before deploying to production:

1. Add your production domain to Google Cloud Console:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: 
     - `https://yourdomain.com/api/auth/callback`
     - Your Supabase production callback URL

2. Update your Supabase project settings with production URLs

3. Ensure all environment variables are set in your production environment

4. Test the complete OAuth flow in production

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)
