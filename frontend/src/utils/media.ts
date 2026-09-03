export const DEFAULT_COURSE_THUMBNAIL =
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80';

export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80';

/**
 * Resolves local relative upload paths (e.g. /uploads/thumbnails/...) or full URLs
 */
export const resolveMediaUrl = (url?: string | null, fallback: string = DEFAULT_COURSE_THUMBNAIL): string => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallback;
  }

  const trimmed = url.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `http://localhost:5001${cleanPath}`;
};
