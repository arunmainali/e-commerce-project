import React, { useState, useEffect } from 'react';

interface CountdownProps {
  endTime: string;
  onEnd?: () => void;
  className?: string;
}

export const Countdown: React.FC<CountdownProps> = ({ endTime, onEnd, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isUrgent: boolean;
    isEnded: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isUrgent: false, isEnded: false });

  const [politeAnnouncement, setPoliteAnnouncement] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(endTime).getTime() - Date.now();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isUrgent: false, isEnded: true });
        if (onEnd) onEnd();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      const isUrgent = difference < 60 * 60 * 1000; // < 1 hour

      setTimeLeft({ days, hours, minutes, seconds, isUrgent, isEnded: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    // Polite announcement updater (every 30 seconds)
    const announcementInterval = setInterval(() => {
      const difference = new Date(endTime).getTime() - Date.now();
      if (difference > 0) {
        const hrs = Math.floor(difference / (1000 * 60 * 60));
        const mins = Math.floor((difference / 1000 / 60) % 60);
        setPoliteAnnouncement(`${hrs} hours and ${mins} minutes remaining`);
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(announcementInterval);
    };
  }, [endTime, onEnd]);

  if (timeLeft.isEnded) {
    return <span className={`text-disabled text-xs font-semibold ${className}`}>Ended</span>;
  }

  const parts = [];
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
  if (timeLeft.hours > 0 || timeLeft.days > 0) parts.push(`${timeLeft.hours}h`);
  parts.push(`${timeLeft.minutes}m`);
  parts.push(`${timeLeft.seconds}s`);

  return (
    <span
      className={`text-xs font-semibold inline-block ${
        timeLeft.isUrgent ? 'text-accent' : 'text-secondary'
      } ${className}`}
      title={endTime}
    >
      <span aria-hidden="true">{parts.join(' ')} left</span>
      <span className="sr-only" aria-live="polite">
        {politeAnnouncement}
      </span>
    </span>
  );
};
