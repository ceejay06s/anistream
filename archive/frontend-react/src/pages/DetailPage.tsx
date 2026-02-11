import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { animeApi, AnimeInfo, Episode } from '../services/api';
import './DetailPage.css';

export function DetailPage() {
  const [searchParams] = useSearchParams();
  const animeId = searchParams.get('id');
  const [anime, setAnime] = useState<AnimeInfo | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (animeId) {
      loadAnime();
    }
  }, [animeId]);

  const loadAnime = async () => {
    if (!animeId) return;

    try {
      setLoading(true);
      const [info, eps] = await Promise.all([
        animeApi.getInfo(animeId),
        animeApi.getEpisodes(animeId),
      ]);
      setAnime(info);
      setEpisodes(eps);
    } catch (error) {
      console.error('Error loading anime:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="container">
        <div className="error">Anime not found</div>
      </div>
    );
  }

  const animeSlug = anime.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div className="container">
      <div className="anime-detail">
        <div className="anime-header">
          <img src={anime.poster} alt={anime.name} className="anime-poster" />
          <div className="anime-info">
            <h1>{anime.name}</h1>
            {anime.rating && <div className="rating">Rating: {anime.rating}</div>}
            {anime.type && <div className="type">Type: {anime.type}</div>}
            <div className="genres">
              {anime.genres.map((genre, i) => (
                <span key={i} className="genre-tag">{genre}</span>
              ))}
            </div>
            <p className="description">{anime.description}</p>
          </div>
        </div>

        <div className="episodes-section">
          <h2>Episodes</h2>
          <div className="episodes-list">
            {episodes.map((episode) => (
              <Link
                key={episode.episodeId}
                to={`/watch/${animeSlug}?id=${animeId}&episodeId=${episode.episodeId}&ep=${episode.number}`}
                className="episode-item"
              >
                <span className="episode-number">{episode.number}</span>
                <span className="episode-title">{episode.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
