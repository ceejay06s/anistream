# Episode Sources Endpoint Requirements

## ✅ Working Configuration

The episode sources endpoint **WORKS** but requires specific formatting:

### Endpoint
```
GET /api/v2/hianime/episode/sources
```

### Required Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `animeEpisodeId` | string | ✅ Yes | Format: `{animeId}?ep={episodeNumber}` | `road-of-naruto-18220?ep=1` |
| `server` | string | ❌ No | Server name (default: `hd-1`) | `hd-1`, `hd-2`, `hd-3` |
| `category` | string | ❌ No | Episode category (default: `sub`) | `sub`, `dub`, `raw` |

### ⚠️ Important: Episode ID Format

**CORRECT Format:**
```
{animeId}?ep={episodeNumber}
```
Example: `road-of-naruto-18220?ep=1`

**INCORRECT Format:**
```
{animeId}?ep={internalId}  ❌
```
Example: `road-of-naruto-18220?ep=94736` (this is an internal ID, not episode number!)

### The Problem

The `getEpisodes` endpoint returns episode IDs like:
```json
{
  "id": "road-of-naruto-18220?ep=94736",
  "number": 1
}
```

The `ep=94736` is an **internal ID**, not the episode number. You need to use the `number` field instead:

```javascript
// ❌ WRONG - uses internal ID
const episodeId = episode.id; // "road-of-naruto-18220?ep=94736"

// ✅ CORRECT - uses episode number
const episodeId = `${animeId}?ep=${episode.number}`; // "road-of-naruto-18220?ep=1"
```

## Available Servers

Get available servers first using:
```
GET /api/v2/hianime/episode/servers?animeEpisodeId={episodeId}
```

Response format:
```json
{
  "success": true,
  "data": {
    "sub": [
      { "serverName": "hd-1", "serverId": 4 },
      { "serverName": "hd-2", "serverId": 1 }
    ],
    "dub": [],
    "raw": [
      { "serverName": "hd-3", "serverId": 6 }
    ]
  }
}
```

## Working Example

```javascript
// Step 1: Get episodes
const episodesResponse = await axios.get(`${API_URL}/api/v2/hianime/anime/${animeId}/episodes`);
const episodes = episodesResponse.data.data.episodes || episodesResponse.data.data.sub;

// Step 2: Construct correct episode ID
const firstEpisode = episodes[0];
const episodeId = `${animeId}?ep=${firstEpisode.number}`; // Use .number, not .id!

// Step 3: Get available servers
const serversResponse = await axios.get(`${API_URL}/api/v2/hianime/episode/servers`, {
  params: { animeEpisodeId: episodeId }
});
const availableServers = serversResponse.data.data.sub || [];

// Step 4: Get sources with correct server
const sourcesResponse = await axios.get(`${API_URL}/api/v2/hianime/episode/sources`, {
  params: {
    animeEpisodeId: episodeId,
    server: availableServers[0]?.serverName || 'hd-1',
    category: 'sub'
  }
});
```

## Test Results

✅ **Working:**
- `steinsgate-3?ep=230` with `hd-1/sub` → ✅ Success
- `road-of-naruto-18220?ep=1` with `hd-1/sub` → ✅ Success

❌ **Not Working:**
- `road-of-naruto-18220?ep=94736` with any server → ❌ 500 Error (internal ID, not episode number)

## Solution

When integrating into your proxy server:

1. **Get episodes** from `/api/v2/hianime/anime/{animeId}/episodes`
2. **Extract episode number** from `episode.number` (not `episode.id`)
3. **Construct episode ID** as `${animeId}?ep=${episode.number}`
4. **Get available servers** from `/api/v2/hianime/episode/servers`
5. **Get sources** using the correct episode ID format

## Code Fix

```javascript
// Fix episode ID construction
const episodes = episodesResponse.data.data.episodes || [];
const formattedEpisodes = episodes.map(ep => ({
  id: `${animeId}?ep=${ep.number}`, // ✅ Use episode.number
  number: ep.number,
  title: ep.title || `Episode ${ep.number}`,
  // ... other fields
}));
```

## Summary

- ✅ Endpoint works correctly
- ✅ Requires correct episode ID format: `{animeId}?ep={episodeNumber}`
- ❌ Don't use the `id` field from getEpisodes response (contains internal ID)
- ✅ Use the `number` field to construct the episode ID
- ✅ Check available servers first for best compatibility
