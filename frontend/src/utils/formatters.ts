/**
 * Centralized formatting utility for truthful course and academy statistics.
 * Rules:
 * 1. If data is 0 or missing, display a truthful empty state (e.g. "Duration unavailable", "No ratings yet", "0 enrolled").
 * 2. Never fabricate numbers, roundings, or suffixes.
 */

export const formatCourseDuration = (totalMinutes?: number | null): string => {
  if (!totalMinutes || totalMinutes <= 0) {
    return 'Duration unavailable';
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    return `${mins} min on-demand`;
  }
  if (mins === 0) {
    return `${hours}h on-demand`;
  }
  return `${hours}h ${mins}m on-demand`;
};

export const formatStatDuration = (totalMinutes?: number | null): string => {
  if (!totalMinutes || totalMinutes <= 0) {
    return '0 min';
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
};

export const formatRatingDisplay = (
  avgRating?: number | null,
  ratingCount?: number | null
): { text: string; hasRating: boolean; score: number; count: number } => {
  const count = ratingCount || 0;
  const score = avgRating && avgRating > 0 ? parseFloat(avgRating.toFixed(1)) : 0;

  if (count === 0 || score === 0) {
    return {
      text: 'No ratings yet',
      hasRating: false,
      score: 0,
      count: 0,
    };
  }

  return {
    text: `★ ${score.toFixed(1)} (${count} ${count === 1 ? 'rating' : 'ratings'})`,
    hasRating: true,
    score,
    count,
  };
};

export const formatEnrollmentDisplay = (count?: number | null): string => {
  const num = count || 0;
  return `${num.toLocaleString()} enrolled`;
};

export const formatStatCount = (count?: number | null, allowPlusAt = 1000): string => {
  const num = count || 0;
  if (num >= 10000) {
    return `${(Math.floor(num / 1000) * 1000).toLocaleString()}+`;
  }
  if (num >= allowPlusAt) {
    return `${num.toLocaleString()}+`;
  }
  return num.toLocaleString();
};

export const formatLessonDuration = (durationMinutes?: number | null, durationSeconds?: number | null): string => {
  if (durationSeconds && durationSeconds > 0) {
    const totalSecs = Math.round(durationSeconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs}s`;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins.toString().padStart(2, '0')}m`;
    }
    return `${mins} min`;
  }

  if (durationMinutes && durationMinutes > 0) {
    if (durationMinutes >= 60) {
      const hrs = Math.floor(durationMinutes / 60);
      const remMins = durationMinutes % 60;
      return `${hrs}h ${remMins.toString().padStart(2, '0')}m`;
    }
    return `${durationMinutes} min`;
  }

  return 'Duration unavailable';
};

export const formatPrice = (price?: number | null, isFree?: boolean, currency: string = 'KSH'): string => {
  if (isFree || price === 0 || price === null || price === undefined) {
    return 'FREE';
  }
  const currLabel = currency === 'KES' || currency === 'KSH' ? 'KSH' : currency;
  return `${price} ${currLabel}`;
};
