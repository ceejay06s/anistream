import { useRouter } from 'expo-router';

const slugify = (value?: string) => {
  if (!value) return 'anime';
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'anime';
};

const toQueryParams = (params: Record<string, unknown>) => {
  const query: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query[key] = String(value);
  });
  return query;
};

export const useNavigationAdapter = () => {
  const router = useRouter();

  const navigate = (name: string, params?: any) => {
    switch (name) {
      case 'Home':
        router.push('/home');
        return;
      case 'Search':
        router.push('/search');
        return;
      case 'Browse':
        router.push('/browse');
        return;
      case 'Profile':
        router.push('/profile');
        return;
      case 'AnimeDetail': {
        const animeId = params?.animeId || params?.id;
        const title = params?.anime?.title || params?.animeTitle || params?.title || animeId;
        const animeName = slugify(title);
        router.push({
          pathname: `/detail/${animeName}`,
          params: toQueryParams({ 
            id: animeId,
            title: title, // Pass title for better searching when ID lookup fails
          }),
        });
        return;
      }
      case 'VideoPlayer': {
        const animeId = params?.animeId || params?.id;
        const title = params?.animeTitle || params?.title || params?.anime?.title || animeId;
        const animeName = slugify(title);
        router.push({
          pathname: `/watch/${animeName}`,
          params: toQueryParams({
            id: animeId,
            episodeId: params?.episodeId,
            ep: params?.episodeNumber,
            episodeUrl: params?.episodeUrl,
            title,
            source: params?.source,
          }),
        });
        return;
      }
      default:
        return;
    }
  };

  return {
    navigate,
    goBack: () => router.back(),
  };
};

export const getEpisodeIdFromParams = (params: Record<string, unknown>) => {
  const episodeId = typeof params.episodeId === 'string' ? params.episodeId : '';
  if (episodeId) return episodeId;

  const animeId = typeof params.id === 'string' ? params.id : '';
  const ep = typeof params.ep === 'string' ? params.ep : '';
  if (animeId && ep) {
    return `${animeId}?ep=${ep}`;
  }

  return '';
};

export const getStringParam = (value: unknown) => {
  return typeof value === 'string' ? value : '';
};
