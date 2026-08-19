export const extractYoutubeVideoId = (urlOrId?: string | null): string | null => {
  if (!urlOrId || !urlOrId.trim()) return null;
  const str = urlOrId.trim();
  
  // Direct 11-char ID format
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  
  // Standard Youtube Watch or Short URL formats
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
};
