# HiAnime Scraping Alternatives Research

## Executive Summary

After testing `aniwatch` npm package, it was found to be **unreliable**:
- ✅ Package loads successfully
- ❌ Search returns empty results
- ❌ getInfo fails with "invalid anime id" errors
- ⚠️ Not recommended for production use

---

## Alternative Solutions

### 1. **Aniwatch API (ghoshRitesh12/aniwatch-api)** ⭐ RECOMMENDED

**GitHub**: https://github.com/ghoshRitesh12/aniwatch-api

**Type**: RESTful API (Node.js/TypeScript)

**Status**: ✅ Actively maintained (656+ commits)

**Features**:
- Search anime
- Get anime info with episodes
- Get episode servers
- Get streaming sources (M3U8 links)
- Built with Express, Cheerio, Axios
- Supports caching and rate limiting
- Can be self-hosted or deployed on Vercel/Render

**Pros**:
- ✅ Well-maintained and documented
- ✅ Specifically designed for hianime.to/hianimez.to
- ✅ TypeScript support
- ✅ Docker support
- ✅ Can deploy your own instance

**Cons**:
- ⚠️ Requires deployment (not a simple npm package)
- ⚠️ Public instances may have rate limiting

**Installation**:
```bash
git clone https://github.com/ghoshRitesh12/aniwatch-api.git
cd aniwatch-api
npm install
npm start
```

**Usage**:
```javascript
// Deploy locally or use public API
const response = await axios.get('http://localhost:3000/api/v1/search?q=naruto');
```

**Recommendation**: ⭐⭐⭐⭐⭐ Best option if you can deploy your own instance

---

### 2. **Hi-API (PacaHat/hi-api)**

**GitHub**: https://github.com/PacaHat/hi-api

**Type**: RESTful API (Node.js)

**Status**: ✅ Active

**Features**:
- Similar to aniwatch-api
- Docker support
- Vercel/Render deployment ready

**Pros**:
- ✅ Alternative to aniwatch-api
- ✅ Docker support
- ✅ Easy deployment

**Cons**:
- ⚠️ Less popular than aniwatch-api
- ⚠️ Requires deployment

**Recommendation**: ⭐⭐⭐⭐ Good alternative if aniwatch-api doesn't work

---

### 3. **Hianime-Mapper (IrfanKhan66/hianime-mapper)**

**GitHub**: https://github.com/IrfanKhan66/hianime-mapper

**Type**: API (Node.js + Hono.js)

**Status**: ✅ Active

**Features**:
- Maps AniList IDs to HiAnime
- Provides video URLs (M3U8)
- Built with Hono.js (lightweight framework)
- Deployed on Vercel: `https://hianime-mapper.vercel.app/`

**Pros**:
- ✅ AniList integration (useful if you use AniList)
- ✅ Already deployed (can use public instance)
- ✅ Lightweight (Hono.js)
- ✅ Provides direct video URLs

**Cons**:
- ⚠️ Focused on AniList mapping (may not be ideal for direct HiAnime scraping)
- ⚠️ Public instance may have rate limits

**API Endpoints**:
```
GET /api/anime/:anilistId
GET /api/episode/:animeId/:episodeNumber
GET /api/servers/:animeId/:episodeNumber
```

**Recommendation**: ⭐⭐⭐⭐ Good if you need AniList integration

---

### 4. **Anime-API (fiskryeziu/anime-api)**

**GitHub**: https://github.com/fiskryeziu/anime-api

**Type**: Express.js API with Cheerio scraping

**Status**: ⚠️ Less actively maintained

**Features**:
- Express.js backend
- Cheerio for HTML parsing
- Basic anime data extraction

**Pros**:
- ✅ Simple implementation
- ✅ Uses standard scraping tools (Cheerio)

**Cons**:
- ⚠️ Less maintained
- ⚠️ Basic features only
- ⚠️ Requires deployment

**Recommendation**: ⭐⭐⭐ Backup option

---

### 5. **Direct HTML Scraping (Current Approach)** ⭐ CURRENT

**Type**: Custom scraper with Cheerio

**Status**: ✅ Already implemented

**Features**:
- Direct HTML parsing with Cheerio
- Full control over selectors
- No external dependencies (except Cheerio)
- Works in proxy server

**Pros**:
- ✅ Full control
- ✅ No external API dependencies
- ✅ Already partially working (title, description work)
- ✅ Can debug and fix issues directly

**Cons**:
- ⚠️ Requires maintenance when site structure changes
- ⚠️ Currently not extracting episodes (needs fixing)

**Current Status**:
- ✅ Can fetch anime pages
- ✅ Can extract title, description, genres
- ❌ Episode extraction not working (0 episodes found)

**Recommendation**: ⭐⭐⭐⭐ Fix current implementation (most reliable long-term)

---

## Comparison Table

| Solution | Type | Maintenance | Ease of Use | Reliability | Recommendation |
|----------|------|-------------|-------------|-------------|----------------|
| **Aniwatch API** | API | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ Best |
| **Hi-API** | API | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ Good |
| **Hianime-Mapper** | API | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ Good (if AniList) |
| **Anime-API** | API | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ Backup |
| **Direct Scraping** | Scraper | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ Fix current |

---

## Recommendations

### Option 1: Fix Current HTML Scraping (Recommended for Long-term) ⭐⭐⭐⭐⭐

**Why**: 
- Already partially working
- Full control
- No external dependencies
- Most reliable long-term

**Action Items**:
1. Add debug endpoint to inspect HTML structure
2. Improve episode extraction selectors
3. Test with multiple anime to find patterns
4. Add script tag extraction (already added)

**Effort**: Medium (2-4 hours)

---

### Option 2: Deploy Aniwatch API (Recommended for Quick Solution) ⭐⭐⭐⭐⭐

**Why**:
- Actively maintained
- Well-tested
- Specifically for HiAnime
- Can self-host

**Action Items**:
1. Clone aniwatch-api repository
2. Deploy locally or on Vercel/Render
3. Update proxy server to use API endpoints
4. Test integration

**Effort**: Low (1-2 hours)

**Installation**:
```bash
# Option A: Deploy locally
git clone https://github.com/ghoshRitesh12/aniwatch-api.git
cd aniwatch-api
npm install
npm start  # Runs on port 3000

# Option B: Use public instance (may have rate limits)
# https://aniwatch-api.vercel.app (if available)
```

**Integration**:
```javascript
// In proxy-server.js
const API_BASE_URL = process.env.ANIWATCH_API_URL || 'http://localhost:3000/api/v1';

app.get('/scrape/hianime/info', async (req, res) => {
  try {
    const { animeId } = req.query;
    // Use aniwatch-api instead of scraping
    const response = await axios.get(`${API_BASE_URL}/anime/${animeId}`);
    return res.json({ success: true, data: response.data });
  } catch (error) {
    // Fallback to HTML scraping
  }
});
```

---

### Option 3: Use Hianime-Mapper (If Using AniList) ⭐⭐⭐⭐

**Why**:
- Already deployed
- AniList integration
- Direct video URLs

**Action Items**:
1. Test public API: `https://hianime-mapper.vercel.app`
2. Integrate with proxy server
3. Map AniList IDs to HiAnime

**Effort**: Low (1 hour)

---

## Implementation Priority

1. **Short-term (Today)**: Fix current HTML scraping episode extraction
   - Add debug endpoint
   - Improve selectors
   - Test with real anime

2. **Medium-term (This Week)**: Deploy Aniwatch API as backup
   - Set up local instance
   - Integrate with proxy server
   - Use as fallback if scraping fails

3. **Long-term (Ongoing)**: Maintain direct scraping
   - Monitor for site changes
   - Update selectors as needed
   - Keep Aniwatch API as backup

---

## Next Steps

1. ✅ Research completed
2. ⏳ **Choose approach** (Fix scraping vs Deploy API)
3. ⏳ Implement chosen solution
4. ⏳ Test with real anime
5. ⏳ Deploy and monitor

---

## Resources

- [Aniwatch API GitHub](https://github.com/ghoshRitesh12/aniwatch-api)
- [Hi-API GitHub](https://github.com/PacaHat/hi-api)
- [Hianime-Mapper GitHub](https://github.com/IrfanKhan66/hianime-mapper)
- [Anime-API GitHub](https://github.com/fiskryeziu/anime-api)

---

**Last Updated**: 2024-01-22
**Status**: Research Complete - Ready for Implementation Decision
