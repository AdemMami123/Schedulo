# Copilot Instructions for Schedulo

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Context
This is a smart scheduling application called "Schedulo" built with:
- **Frontend**: Next.js 15 with App Router and TypeScript
- **Styling**: TailwindCSS with Headless UI components
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **Authentication**: Google OAuth via Firebase Auth
- **External APIs**: Google Calendar API for calendar integration

## Key Features
- User authentication with Google
- User profile management (timezone, availability, buffer times)
- Weekly availability scheduling
- Public booking pages with shareable links
- Calendar integration and conflict detection
- Email notifications and reminders
- Time zone handling and conversion

## Code Style Guidelines
- Use TypeScript for all components and functions
- Follow React best practices with hooks and functional components
- Use TailwindCSS classes for styling
- Implement proper error handling and loading states
- Use Firebase hooks for real-time data
- Follow Next.js App Router conventions
- Use proper TypeScript interfaces and types
- Implement responsive design for mobile and desktop

## Project Structure
- `/src/app` - Next.js App Router pages and layouts
- `/src/components` - Reusable UI components
- `/src/lib` - Utility functions and Firebase configuration
- `/src/types` - TypeScript type definitions
- `/src/hooks` - Custom React hooks
- `/src/utils` - Helper functions and utilities
