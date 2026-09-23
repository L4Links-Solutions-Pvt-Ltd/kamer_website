// Full episode and social clips shown in the "Watch the full episode" section at the bottom of the homepage.
// The inline chapter clips are hard-wired in src/pages/index.astro via the Clip component.
// 'file' entries are self-hosted clips in public/video/ (keep each under ~25 MB).
// Add YouTube links (full URL, youtu.be link, or just the 11-character ID)
// and Instagram post/reel links (full permalink). Order here is display order.
//
// Examples:
//   { type: 'youtube', src: 'https://www.youtube.com/watch?v=XXXXXXXXXXX', title: 'Founder podcast: Srinivas and Siva', caption: '53 min, Telugu' },
//   { type: 'instagram', src: 'https://www.instagram.com/reel/XXXXXXXXXXX/', title: 'Adding a guest in 60 seconds' },

export type Video =
  | { type: 'youtube'; src: string; title: string; caption?: string }
  | { type: 'instagram'; src: string; title: string; caption?: string }
  | { type: 'file'; src: string; poster: string; title: string; caption?: string };

export const videos: Video[] = [];
