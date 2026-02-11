import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { animeApi, Anime } from '../services/api';
import './HomePage.css';

interface Category {
  title: string;
  animes: Anime[];
}

export function HomePage() {
  const [featured, setFeatured] = useState<Anime[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const rowRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const carouselIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadHomeData();
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    if (featured.length > 1 && !isPaused) {
      carouselIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % featured.length);
      }, 5000); // Change slide every 5 seconds
    }

    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [featured.length, isPaused]);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const results = await animeApi.getTrending();
      
      if (results.length > 0) {
        // Set first 5 anime as featured carousel
        setFeatured(results.slice(0, 5));
        
        // Create categories
        const newCategories: Category[] = [
          {
            title: 'Trending Now',
            animes: results.slice(0, 10),
          },
          {
            title: 'Top Rated',
            animes: results.slice(1, 11),
          },
          {
            title: 'Recently Added',
            animes: results.slice(2, 12),
          },
          {
            title: 'Popular This Week',
            animes: results.slice(3, 13),
          },
        ];
        
        setCategories(newCategories);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const slugify = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  };

  const scrollRow = (index: number, direction: 'left' | 'right') => {
    const row = rowRefs.current[index];
    if (row) {
      const scrollAmount = 600;
      row.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featured.length);
  };

  if (loading) {
    return (
      <div className="homepage">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading anime...</p>
        </div>
      </div>
    );
  }

  const currentFeatured = featured[currentIndex];

  return (
    <div className="homepage">
      {/* Featured Hero Carousel */}
      {featured.length > 0 && currentFeatured && (
        <div 
          className="featured-section"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="carousel-container">
            {featured.map((anime, index) => (
              <div
                key={anime.id}
                className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.95) 100%), url(${anime.poster})`,
                }}
              >
                <div className="featured-content">
                  <div className="featured-info">
                    <h1 className="featured-title">{anime.name}</h1>
                    <div className="featured-meta">
                      {anime.rating && (
                        <span className="featured-rating-badge">⭐ {anime.rating}</span>
                      )}
                      <span className="featured-year">2024</span>
                      <span className="featured-type">TV Series</span>
                    </div>
                    <p className="featured-description">
                      Experience the ultimate anime adventure with stunning visuals, 
                      compelling storylines, and unforgettable characters.
                    </p>
                    <div className="featured-actions">
                      <Link
                        to={`/detail/${slugify(anime.name)}?id=${anime.id}`}
                        className="btn btn-play"
                      >
                        <span className="btn-icon">▶</span>
                        <span>Play</span>
                      </Link>
                      <Link
                        to={`/detail/${slugify(anime.name)}?id=${anime.id}`}
                        className="btn btn-info"
                      >
                        <span className="btn-icon">ℹ</span>
                        <span>More Info</span>
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="featured-fade-bottom"></div>
              </div>
            ))}
          </div>

          {/* Carousel Navigation */}
          {featured.length > 1 && (
            <>
              <button
                className="carousel-nav carousel-prev"
                onClick={goToPrevious}
                aria-label="Previous slide"
              >
                ‹
              </button>
              <button
                className="carousel-nav carousel-next"
                onClick={goToNext}
                aria-label="Next slide"
              >
                ›
              </button>

              {/* Carousel Indicators */}
              <div className="carousel-indicators">
                {featured.map((_, index) => (
                  <button
                    key={index}
                    className={`carousel-indicator ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Category Rows */}
      <div className="categories-container">
        {categories.map((category, index) => (
          <div key={index} className="category-row">
            <h2 className="category-title">{category.title}</h2>
            <div className="row-wrapper">
              <button
                className="row-nav-button row-nav-left"
                onClick={() => scrollRow(index, 'left')}
                aria-label="Scroll left"
              >
                <span>‹</span>
              </button>
              <div
                ref={(el) => (rowRefs.current[index] = el)}
                className="anime-row"
              >
                {category.animes.map((anime) => (
                  <Link
                    key={anime.id}
                    to={`/detail/${slugify(anime.name)}?id=${anime.id}`}
                    className="anime-card"
                  >
                    <div className="anime-card-image">
                      <img src={anime.poster} alt={anime.name} />
                    <div className="anime-card-overlay">
                      <div className="anime-card-actions">
                        <button 
                          className="card-action-btn card-play"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/detail/${slugify(anime.name)}?id=${anime.id}`);
                          }}
                        >
                          ▶
                        </button>
                        <button 
                          className="card-action-btn card-add"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          +
                        </button>
                        <button 
                          className="card-action-btn card-like"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          👍
                        </button>
                      </div>
                      <div className="anime-card-details">
                        <div className="anime-card-rating">
                          {anime.rating && `⭐ ${anime.rating}`}
                        </div>
                        <div className="anime-card-title">{anime.name}</div>
                      </div>
                    </div>
                    </div>
                  </Link>
                ))}
              </div>
              <button
                className="row-nav-button row-nav-right"
                onClick={() => scrollRow(index, 'right')}
                aria-label="Scroll right"
              >
                <span>›</span>
              </button>
              <div className="row-fade-right"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
