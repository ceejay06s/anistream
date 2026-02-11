/**
 * TypeScript declarations for meta.js
 */

export declare const exploreRoutes: string[];
export declare const genres: string[];
export declare const azList: string[];

export interface FilterOptions {
  type: string[];
  status: string[];
  rated: string[];
  score: string[];
  season: string[];
  language: string[];
  sort: string[];
  genres: string[];
}

export declare const filterOptions: FilterOptions;

export declare function getGenreByIndex(index: number): string | null;
export declare function getValidGenres(): string[];
export declare function isValidRoute(route: string): boolean;
export declare function isValidGenre(genre: string): boolean;
export declare function isValidAZOption(option: string): boolean;
export declare function getFilterValues(category: keyof FilterOptions): string[];
export declare function isValidFilterValue(category: keyof FilterOptions, value: string): boolean;

declare const meta: {
  exploreRoutes: string[];
  genres: string[];
  azList: string[];
  filterOptions: FilterOptions;
  getGenreByIndex: (index: number) => string | null;
  getValidGenres: () => string[];
  isValidRoute: (route: string) => boolean;
  isValidGenre: (genre: string) => boolean;
  isValidAZOption: (option: string) => boolean;
  getFilterValues: (category: keyof FilterOptions) => string[];
  isValidFilterValue: (category: keyof FilterOptions, value: string) => boolean;
};

export default meta;
