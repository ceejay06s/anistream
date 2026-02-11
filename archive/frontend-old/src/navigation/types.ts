import { Anime } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  Browse: undefined;
  Search: undefined;
  Profile: undefined;
  AnimeDetail: { animeId: string; anime?: Anime };
  VideoPlayer: { 
    animeId: string; 
    episodeId: string; 
    animeTitle?: string; 
    episodeNumber?: number;
    episodeUrl?: string;       // Direct URL to episode page or video URL
    source?: string;           // Source of the episode (HiAnime, etc.)
  };
};

export type BottomTabParamList = {
  Home: undefined;
  Browse: undefined;
  Search: undefined;
  Profile: undefined;
};

