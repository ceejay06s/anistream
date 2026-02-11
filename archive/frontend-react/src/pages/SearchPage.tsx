import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { animeApi, Anime, SearchFilters } from '../services/api';
import { filterOptions, exploreRoutes, getValidGenres } from '../data/meta';
import './SearchPage.css';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const categoryParam = searchParams.get('category');
  
  // Filter states
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    status: 'all',
    rated: 'all',
    score: 'all',
    season: 'all',
    language: 'all',
    sort: 'default',
    genres: [],
  });

  // Load category on mount if category param exists
  useEffect(() => {
    if (categoryParam) {
      loadCategory(categoryParam);
    }
  }, [categoryParam]);

  const loadCategory = async (category: string) => {
    try {
      setLoading(true);
      const data = await animeApi.getByCategory(category);
      setResults(data);
      setQuery(''); // Clear search query when browsing category
    } catch (error) {
      console.error('Category load error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Clear category param when searching
    setSearchParams({});

    try {
      setLoading(true);
      const data = await animeApi.search(query, filters);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' || value === 'default' ? undefined : value,
    }));
  };

  const handleGenreToggle = (genre: string) => {
    setFilters(prev => {
      const currentGenres = Array.isArray(prev.genres) ? prev.genres : prev.genres ? [prev.genres] : [];
      const isSelected = currentGenres.includes(genre);
      
      return {
        ...prev,
        genres: isSelected 
          ? currentGenres.filter(g => g !== genre)
          : [...currentGenres, genre],
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      status: 'all',
      rated: 'all',
      score: 'all',
      season: 'all',
      language: 'all',
      sort: 'default',
      genres: [],
    });
  };

  const hasActiveFilters = () => {
    const activeGenres = Array.isArray(filters.genres) ? filters.genres.length > 0 : filters.genres;
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'genres') return activeGenres;
      return value && value !== 'all' && value !== 'default' && (!Array.isArray(value) || value.length > 0);
    });
  };

  return (
    <div className="search-page">
      <div className="search-hero">
        <div className="search-hero-content">
          <h1 className="search-title">Discover Your Next Favorite Anime</h1>
          <p className="search-subtitle">Search from thousands of anime titles</p>
          
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for anime..."
                className="search-input"
              />
              <button type="submit" className="search-button" disabled={loading}>
                {loading ? (
                  <span className="search-spinner"></span>
                ) : (
                  <span>🔍</span>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`filter-toggle ${showFilters ? 'active' : ''} ${hasActiveFilters() ? 'has-filters' : ''}`}
            >
              <span>⚙️</span>
              <span>Filters</span>
              {hasActiveFilters && <span className="filter-badge"></span>}
            </button>
          </form>
        </div>
      </div>

      {/* Category Quick Links */}
      <div className="category-section">
        <h2 className="section-title">Browse by Category</h2>
        <div className="category-buttons">
          {exploreRoutes.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSearchParams({ category });
                loadCategory(category);
              }}
              className={`category-button ${categoryParam === category ? 'active' : ''}`}
            >
              {category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filters-header">
            <h3>Advanced Filters</h3>
            {hasActiveFilters() && (
              <button onClick={clearFilters} className="clear-filters">
                Clear All
              </button>
            )}
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label>Category</label>
              <select
                value={filters.type || 'all'}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                {filterOptions.type.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                {filterOptions.status.map(status => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Rating</label>
              <select
                value={filters.rated || 'all'}
                onChange={(e) => handleFilterChange('rated', e.target.value)}
              >
                {filterOptions.rated.map(rated => (
                  <option key={rated} value={rated}>
                    {rated.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Score</label>
              <select
                value={filters.score || 'all'}
                onChange={(e) => handleFilterChange('score', e.target.value)}
              >
                {filterOptions.score.map(score => (
                  <option key={score} value={score}>
                    {score.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Season</label>
              <select
                value={filters.season || 'all'}
                onChange={(e) => handleFilterChange('season', e.target.value)}
              >
                {filterOptions.season.map(season => (
                  <option key={season} value={season}>
                    {season.charAt(0).toUpperCase() + season.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Language</label>
              <select
                value={filters.language || 'all'}
                onChange={(e) => handleFilterChange('language', e.target.value)}
              >
                {filterOptions.language.map(lang => (
                  <option key={lang} value={lang}>
                    {lang.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Sort By</label>
              <select
                value={filters.sort || 'default'}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
              >
                {filterOptions.sort.map(sort => (
                  <option key={sort} value={sort}>
                    {sort.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group tags-group">
            <label>Tags / Genres {Array.isArray(filters.genres) && filters.genres.length > 0 && `(${filters.genres.length} selected)`}</label>
            <div className="tags-container">
              {getValidGenres().map((genre) => {
                const isSelected = Array.isArray(filters.genres) 
                  ? filters.genres.includes(genre)
                  : filters.genres === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreToggle(genre)}
                    className={`tag ${isSelected ? 'active' : ''}`}
                  >
                    {genre.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Searching...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <h2 className="results-title">
              {categoryParam 
                ? categoryParam.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                : 'Search Results'
              }
            </h2>
            <p className="results-count">{results.length} {results.length === 1 ? 'result' : 'results'} found</p>
          </div>
          <div className="anime-grid">
            {results.map((anime) => (
              <Link
                key={anime.id}
                to={`/detail/${anime.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}?id=${anime.id}`}
                className="anime-card"
              >
                <div className="anime-card-image">
                  <img src={anime.poster} alt={anime.name} />
                  <div className="anime-card-overlay">
                    {anime.rating && (
                      <div className="anime-card-rating">⭐ {anime.rating}</div>
                    )}
                  </div>
                </div>
                <div className="anime-card-info">
                  <h3>{anime.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && !categoryParam && query && results.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No results found</h3>
          <p>We couldn't find any anime matching "{query}"</p>
          <p className="hint">Try adjusting your search terms or filters</p>
        </div>
      )}

      {!loading && !query && !categoryParam && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🎌</div>
          <h3>Start Your Search</h3>
          <p>Search for anime by name or browse by category above</p>
        </div>
      )}
    </div>
  );
}
