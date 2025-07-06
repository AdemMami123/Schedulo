import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Schedulo - Smart Scheduling Made Easy',
  description: 'Smart scheduling application with calendar integration and availability management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script async defer src="https://apis.google.com/js/api.js"></script>
        <script async defer src="https://accounts.google.com/gsi/client"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('theme');
                const theme = savedTheme && ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : 'system';
                
                const root = document.documentElement;
                root.classList.remove('light', 'dark');
                
                if (theme === 'system') {
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  root.classList.add(isDark ? 'dark' : 'light');
                } else {
                  root.classList.add(theme);
                }
              } catch (e) {
                // Fallback to light theme if anything goes wrong
                document.documentElement.classList.add('light');
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
