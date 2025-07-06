import { PublicBookingPage } from '@/components/booking/PublicBookingPage';
import { notFound } from 'next/navigation';

interface BookingPageProps {
  params: {
    username: string;
  };
}

export default function BookingPage({ params }: BookingPageProps) {
  const { username } = params;

  if (!username) {
    notFound();
  }

  return <PublicBookingPage username={username} />;
}

export function generateMetadata({ params }: BookingPageProps) {
  const { username } = params;
  
  return {
    title: `Book a meeting with ${username} - Schedulo`,
    description: `Schedule a meeting with ${username} using Schedulo`,
  };
}
