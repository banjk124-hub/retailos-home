import { useEffect, useMemo, useState } from 'react';

export function useHomeCalendarDates(calendarNow: Date, calendarMonth: Date) {
  const calendarWeek = useMemo(() => {
    const today = new Date(calendarNow.getFullYear(), calendarNow.getMonth(), calendarNow.getDate());
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        date,
        weekday: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()],
        day: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
      };
    });
  }, [calendarNow]);

  const calendarMonthDays = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [calendarMonth]);

  return { calendarWeek, calendarMonthDays };
}

export function useHomeCalendarClock() {
  const [calendarNow, setCalendarNow] = useState(() => new Date());

  useEffect(() => {
    const syncCalendarDate = () => {
      const now = new Date();
      setCalendarNow((current) => current.toDateString() === now.toDateString() ? current : now);
    };
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = window.setTimeout(syncCalendarDate, Math.max(1, nextMidnight.getTime() - now.getTime()));
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncCalendarDate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [calendarNow]);

  return calendarNow;
}
