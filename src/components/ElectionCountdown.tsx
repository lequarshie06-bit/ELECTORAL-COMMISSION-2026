import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ElectionConfig } from '../types';

interface ElectionCountdownProps {
  config: ElectionConfig;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export const ElectionCountdown: React.FC<ElectionCountdownProps> = ({
  config,
  className = '',
  showIcon = true,
  compact = false,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    if (!config.electionTimerActive || !config.electionEndTime) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const end = new Date(config.electionEndTime!).getTime();
      const now = Date.now();
      const difference = end - now;

      if (difference <= 0) {
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isExpired: true,
        });
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({
        hours,
        minutes,
        seconds,
        totalSeconds,
        isExpired: false,
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [config.electionTimerActive, config.electionEndTime]);

  if (!config.electionTimerActive || !config.electionEndTime || !timeLeft) {
    return null;
  }

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  if (timeLeft.isExpired) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold font-mono tracking-wider ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>POLLS CLOSED</span>
      </div>
    );
  }

  const isUrgent = timeLeft.totalSeconds < 900; // less than 15 minutes

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold border transition ${
          isUrgent
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        } ${className}`}
      >
        {showIcon && <Clock className="w-3.5 h-3.5" />}
        <span>
          {formatNumber(timeLeft.hours)}:{formatNumber(timeLeft.minutes)}:{formatNumber(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition shadow-xs ${
        isUrgent
          ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
          : 'bg-emerald-50 text-emerald-900 border-emerald-300'
      } ${className}`}
    >
      {showIcon && (
        <Clock
          className={`w-4 h-4 shrink-0 ${
            isUrgent ? 'text-amber-600' : 'text-emerald-600'
          }`}
        />
      )}
      <div className="flex items-center gap-1.5 font-mono">
        <span className="font-bold uppercase tracking-wider text-[11px]">
          {isUrgent ? 'Closing Soon:' : 'Polls Close In:'}
        </span>
        <span className="font-extrabold text-xs">
          {formatNumber(timeLeft.hours)}h {formatNumber(timeLeft.minutes)}m {formatNumber(timeLeft.seconds)}s
        </span>
      </div>
    </div>
  );
};
