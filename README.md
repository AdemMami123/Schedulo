# Schedulo - Smart Scheduling App

A modern, intelligent scheduling application built with Next.js, Firebase, and Google Calendar integration.

## 🚀 Features

### Core Features (MVP)
- **User Authentication**: Google OAuth integration via Firebase Auth
- **Profile Management**: Timezone, meeting duration, buffer times, and availability settings
- **Weekly Availability Setup**: Customizable weekly schedule with multiple time slots per day
- **Public Booking Pages**: Shareable links for others to book time with you
- **Real-time Availability**: Dynamic slot generation based on your schedule and existing bookings
- **Booking Management**: View, manage, and track all your appointments

### Advanced Features
- **Google Calendar Integration**: Sync events and prevent double booking
- **Conflict Detection**: Automatic checking against existing calendar events
- **Timezone Support**: Automatic timezone detection and conversion
- **Responsive Design**: Mobile-friendly interface
- **Buffer Time Management**: Customizable buffer time before/after meetings
- **Email Notifications**: Automatic booking confirmations and notifications

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **Calendar Integration**: Google Calendar API
- **UI Components**: Headless UI, Heroicons
- **Styling**: TailwindCSS with custom components

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js 18+ installed
- A Firebase project set up
- Google Calendar API credentials
- Git

## 🚀 Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone <your-repo-url>
cd smart_scheduling_app
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Environment Setup

Create a \`.env.local\` file in the root directory with the following variables:

\`\`\`env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Google Calendar API
NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID=397817564437-3ool57mt7icc5q0vsauigakvgd3u6a5l.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=your-google-calendar-client-secret

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Email Configuration (choose one or both)
NEXT_PUBLIC_RESEND_API_KEY=your-resend-api-key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password

# Firebase Admin SDK (for server-side operations)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-admin-email
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key"
\`\`\`

### 4. Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication and set up Google as a sign-in provider
4. Create a Firestore database
5. Copy your Firebase config to the environment variables

### 5. Google Calendar API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create credentials (OAuth 2.0 Client ID)
5. Add authorized origins and redirect URIs
6. Copy the client ID to your environment variables

### 6. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

\`\`\`
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   │   └── email/          # Email API endpoints
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   └── schedule/          # Public booking pages
│       └── [username]/    # Dynamic user booking pages
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── booking/          # Booking-related components
│   ├── dashboard/        # Dashboard components
│   └── ui/               # Reusable UI components
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
├── hooks/                # Custom React hooks
│   └── useGoogleCalendar.ts
├── lib/                  # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   ├── googleCalendar.ts # Google Calendar service
│   ├── emailService.ts   # Email sending functionality
│   └── utils.ts          # Utility functions
└── types/                # TypeScript type definitions
    └── index.ts
\`\`\`

## 🔧 Key Components

### Authentication
- Google OAuth integration via Firebase Auth
- Automatic user profile creation
- Username generation and management

### Dashboard
- **Overview**: Statistics and recent bookings
- **Availability Settings**: Weekly schedule management
- **Booking Settings**: Public page configuration
- **Booking History**: View and manage all appointments

### Public Booking
- User-friendly booking interface
- Real-time availability checking
- Conflict detection with existing bookings
- Google Calendar integration
- Email confirmations to both guest and host

### Google Calendar Integration
- OAuth 2.0 authentication
- Event creation and management
- Availability checking
- Conflict prevention

## 🎨 Customization

### Styling
The app uses TailwindCSS for styling. You can customize the design by:
- Modifying \`tailwind.config.ts\`
- Updating component styles in \`src/components/\`
- Customizing global styles in \`src/app/globals.css\`

### Features
- Add new dashboard views in \`src/components/dashboard/\`
- Extend booking functionality in \`src/components/booking/\`
- Add new API integrations in \`src/lib/\`

## 📚 API Reference

### Firebase Collections

#### Users
\`\`\`typescript
{
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  timezone: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

#### User Profiles
\`\`\`typescript
{
  userId: string;
  timezone: string;
  defaultMeetingDuration: number;
  bufferTimeBefore: number;
  bufferTimeAfter: number;
  weeklyAvailability: WeeklyAvailability;
  publicBookingEnabled: boolean;
  bookingPageTitle: string;
  bookingPageDescription: string;
  googleCalendarConnected: boolean;
}
\`\`\`

#### Bookings
\`\`\`typescript
{
  userId: string;
  guestName: string;
  guestEmail: string;
  guestNotes?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: BookingStatus;
  timezone: string;
  googleCalendarEventId?: string;
}
\`\`\`

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms
The app can be deployed to any platform that supports Next.js applications.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the awesome React framework
- [Firebase](https://firebase.google.com/) for backend services
- [TailwindCSS](https://tailwindcss.com/) for utility-first CSS
- [Headless UI](https://headlessui.dev/) for accessible components
- [Google Calendar API](https://developers.google.com/calendar) for calendar integration

## 📞 Support

If you have any questions or need help with setup, please create an issue in the repository.
