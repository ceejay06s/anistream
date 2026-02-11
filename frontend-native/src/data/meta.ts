/**
 * Meta data for filtering, searching, and categorization
 * Contains routes, genres, AZ list, and filter options for anime browsing
 */

/**
 * Explore routes/categories for browsing anime
 * These correspond to category endpoints in the API
 */
export const exploreRoutes = [
  'top-airing',
  'most-popular',
  'most-favorite',
  'completed',
  'recently-added',
  'recently-updated',
  'top-upcoming',
  'subbed-anime',
  'dubbed-anime',
  'movie',
  'tv',
  'ova',
  'ona',
  'special',
] as const;

export type ExploreRoute = typeof exploreRoutes[number];

/**
 * Route display names for UI
 */
export const routeDisplayNames: Record<ExploreRoute, string> = {
  'top-airing': 'Top Airing',
  'most-popular': 'Most Popular',
  'most-favorite': 'Most Favorite',
  'completed': 'Completed',
  'recently-added': 'Recently Added',
  'recently-updated': 'Recently Updated',
  'top-upcoming': 'Top Upcoming',
  'subbed-anime': 'Subbed Anime',
  'dubbed-anime': 'Dubbed Anime',
  'movie': 'Movies',
  'tv': 'TV Series',
  'ova': 'OVA',
  'ona': 'ONA',
  'special': 'Specials',
};

/**
 * Available genres for filtering
 */
export const genres = [
  'action',
  'adventure',
  'cars',
  'comedy',
  'dementia',
  'demons',
  'drama',
  'ecchi',
  'fantasy',
  'game',
  'harem',
  'historical',
  'horror',
  'isekai',
  'josei',
  'kids',
  'magic',
  'martial arts',
  'mecha',
  'military',
  'music',
  'mystery',
  'parody',
  'police',
  'psychological',
  'romance',
  'samurai',
  'school',
  'sci-fi',
  'seinen',
  'shoujo',
  'shoujo ai',
  'shounen',
  'shounen ai',
  'slice of life',
  'space',
  'sports',
  'super power',
  'supernatural',
  'thriller',
  'vampire',
] as const;

export type Genre = typeof genres[number];

/**
 * AZ List options for alphabetical browsing
 */
export const azList = [
  'all',
  'other',
  '0-9',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
] as const;

export type AZOption = typeof azList[number];

/**
 * Filter options for advanced search and filtering
 */
export const filterOptions = {
  type: ['all', 'movie', 'tv', 'ova', 'special', 'music'] as const,
  status: ['all', 'finished_airing', 'currently_airing', 'not_yet_aired'] as const,
  rated: ['all', 'g', 'pg', 'pg-13', 'r', 'r+', 'rx'] as const,
  score: [
    'all',
    'appalling',
    'horrible',
    'very_bad',
    'bad',
    'average',
    'fine',
    'good',
    'very_good',
    'great',
    'masterpiece',
  ] as const,
  season: ['all', 'spring', 'summer', 'fall', 'winter'] as const,
  language: ['all', 'sub', 'dub', 'sub_dub'] as const,
  sort: [
    'default',
    'recently_added',
    'recently_updated',
    'score',
    'name_az',
    'release_date',
    'most_watched',
  ] as const,
};

export type FilterType = typeof filterOptions.type[number];
export type FilterStatus = typeof filterOptions.status[number];
export type FilterRated = typeof filterOptions.rated[number];
export type FilterScore = typeof filterOptions.score[number];
export type FilterSeason = typeof filterOptions.season[number];
export type FilterLanguage = typeof filterOptions.language[number];
export type FilterSort = typeof filterOptions.sort[number];

/**
 * Filter display names
 */
export const filterDisplayNames = {
  type: {
    all: 'All Types',
    movie: 'Movie',
    tv: 'TV',
    ova: 'OVA',
    special: 'Special',
    music: 'Music',
  },
  status: {
    all: 'All Status',
    finished_airing: 'Finished',
    currently_airing: 'Airing',
    not_yet_aired: 'Upcoming',
  },
  rated: {
    all: 'All Ratings',
    g: 'G',
    pg: 'PG',
    'pg-13': 'PG-13',
    r: 'R',
    'r+': 'R+',
    rx: 'Rx',
  },
  score: {
    all: 'All Scores',
    appalling: 'Appalling',
    horrible: 'Horrible',
    very_bad: 'Very Bad',
    bad: 'Bad',
    average: 'Average',
    fine: 'Fine',
    good: 'Good',
    very_good: 'Very Good',
    great: 'Great',
    masterpiece: 'Masterpiece',
  },
  season: {
    all: 'All Seasons',
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
  },
  language: {
    all: 'All',
    sub: 'Sub',
    dub: 'Dub',
    sub_dub: 'Sub & Dub',
  },
  sort: {
    default: 'Default',
    recently_added: 'Recently Added',
    recently_updated: 'Recently Updated',
    score: 'Score',
    name_az: 'Name (A-Z)',
    release_date: 'Release Date',
    most_watched: 'Most Watched',
  },
};

/**
 * Helper functions
 */
export const isValidRoute = (route: string): route is ExploreRoute => {
  return exploreRoutes.includes(route as ExploreRoute);
};

export const isValidGenre = (genre: string): genre is Genre => {
  return genres.includes(genre.toLowerCase() as Genre);
};

export const isValidAZOption = (option: string): option is AZOption => {
  return azList.includes(option.toLowerCase() as AZOption);
};

export const getRouteDisplayName = (route: ExploreRoute): string => {
  return routeDisplayNames[route] || route;
};

export const capitalizeGenre = (genre: string): string => {
  return genre
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default {
  exploreRoutes,
  routeDisplayNames,
  genres,
  azList,
  filterOptions,
  filterDisplayNames,
  isValidRoute,
  isValidGenre,
  isValidAZOption,
  getRouteDisplayName,
  capitalizeGenre,
};
