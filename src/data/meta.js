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
];

/**
 * Available genres for filtering
 * Used for genre-based browsing and filtering
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
];

/**
 * AZ List options for alphabetical browsing
 * Used for sorting anime alphabetically
 */
export const azList = [
  'all',
  'other',
  '0-9',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
];

/**
 * Filter options for advanced search and filtering
 * Contains all available filter categories and their values
 * 
 * Note: genres array has empty strings at indices 11, 32, 33
 * due to missing data-id values from hianime API
 */
export const filterOptions = {
  type: ['all', 'movie', 'tv', 'ova', 'special', 'music'],
  status: ['all', 'finished_airing', 'currently_airing', 'not_yet_aired'],
  rated: ['all', 'g', 'pg', 'pg-13', 'r', 'r+', 'rx'],
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
  ],
  season: ['all', 'spring', 'summer', 'fall', 'winter'],
  language: ['all', 'sub', 'dub', 'sub_dub'],
  sort: [
    'default',
    'recently_added',
    'recently_updated',
    'score',
    'name_az',
    'release_date',
    'most_watched',
  ],
  // index 11,32,33 are empty because of missing data-id by hianime
  genres: [
    'action',
    'adventure',
    'cars',
    'comedy',
    'dementia',
    'demons',
    'mystery',
    'drama',
    'ecchi',
    'fantasy',
    'game',
    '', // index 11 - missing data-id
    'historical',
    'horror',
    'kids',
    'magic',
    'martial_arts',
    'mecha',
    'music',
    'parody',
    'samurai',
    'romance',
    'school',
    'sci-fi',
    'shoujo',
    'shoujo_ai',
    'shounen',
    'shounen_ai',
    'space',
    'sports',
    'super_power',
    'vampire',
    '', // index 32 - missing data-id
    '', // index 33 - missing data-id
    'harem',
    'slice_of_life',
    'supernatural',
    'military',
    'police',
    'psychological',
    'thriller',
    'seinen',
    'josei',
    'isekai',
  ],
};

/**
 * Helper function to get genre by index
 * Filters out empty strings from genres array
 */
export const getGenreByIndex = (index) => {
  const genre = filterOptions.genres[index];
  return genre && genre.trim() !== '' ? genre : null;
};

/**
 * Helper function to get all valid genres (excluding empty strings)
 */
export const getValidGenres = () => {
  return filterOptions.genres.filter(genre => genre && genre.trim() !== '');
};

/**
 * Helper function to check if a route is valid
 */
export const isValidRoute = (route) => {
  return exploreRoutes.includes(route);
};

/**
 * Helper function to check if a genre is valid
 */
export const isValidGenre = (genre) => {
  return genres.includes(genre.toLowerCase());
};

/**
 * Helper function to check if an AZ list option is valid
 */
export const isValidAZOption = (option) => {
  return azList.includes(option.toLowerCase());
};

/**
 * Helper function to get filter option values by category
 */
export const getFilterValues = (category) => {
  return filterOptions[category] || [];
};

/**
 * Helper function to check if a filter value is valid for a category
 */
export const isValidFilterValue = (category, value) => {
  const values = filterOptions[category];
  return values && values.includes(value);
};

/**
 * Default export with all meta data
 */
export default {
  exploreRoutes,
  genres,
  azList,
  filterOptions,
  getGenreByIndex,
  getValidGenres,
  isValidRoute,
  isValidGenre,
  isValidAZOption,
  getFilterValues,
  isValidFilterValue,
};
