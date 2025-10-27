export interface Anime {
  id: string;
  title: string;
  coverImage: string;
  bannerImage: string;
  description: string;
  episodes: number;
  rating: number;
  year: number;
  genres: string[];
  status: 'Ongoing' | 'Completed';
  duration: string;
  studio: string;
}

export interface Episode {
  id: string;
  animeId: string;
  episodeNumber: number;
  title: string;
  thumbnail: string;
  duration: string;
  videoUrl: string;
}

export interface WatchHistory {
  animeId: string;
  episodeId: string;
  progress: number;
  lastWatched: Date;
}

export interface Category {
  id: string;
  name: string;
  animes: Anime[];
}

