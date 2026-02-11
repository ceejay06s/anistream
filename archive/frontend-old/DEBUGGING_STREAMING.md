# 🔍 Debugging AniWatch Streaming Issues

## Current Issue
**"No streaming sources returned"**

This means episodes load successfully, but video source extraction fails.

---

## 🛠️ Enhanced Debugging Features

### What Was Added

1. **Extensive Logging**
   - HTML preview (first 500 characters)
   - Every parsing attempt is logged
   - Source count at each stage
   - Detailed source information

2. **Multiple Parsing Methods**
   - 5 different patterns for video URLs in JavaScript
   - 3 patterns for data attributes
   - Iframe detection (any iframe, not just specific IDs)
   - Server ID extraction
   - Embed URL detection

3. **Alternative Extraction**
   - Fallback embed URL generation
   - Broad video URL search across entire HTML
   - Script tag content analysis

---

## 📊 What to Look For in Console

### Expected Log Flow

```
1. Fetching stream sources from: https://aniwatchtv.to/watch/anime-name-123?ep=1
2. HTML length: 45678
3. HTML preview: <!DOCTYPE html><html><head>...
4. Parsing video sources from HTML...
5. Found iframe 1: /embed/xyz123
6. Found video URL (pattern 1): https://cdn.example.com/video.m3u8
7. Found server ID: server-123 Type: sub
8. Found embed ID: xyz123
9. Total sources found before filtering: 5
10. Unique sources: 3
11. Source 1: hls - HLS - https://cdn.example.com/video.m3u8
12. Source 2: iframe - Default - https://aniwatchtv.to/embed/xyz123
13. Source 3: api - SUB - https://aniwatchtv.to/ajax/server/server-123
14. Found 3 streaming sources
```

### If No Sources Found

```
1. Fetching stream sources from: https://aniwatchtv.to/watch/anime-name-123?ep=1
2. HTML length: 45678
3. HTML preview: <!DOCTYPE html><html><head>...
4. Parsing video sources from HTML...
5. Total sources found before filtering: 0
6. Unique sources: 0
7. Found 0 streaming sources
8. No sources found with standard parsing, trying alternatives...
9. Trying alternative source extraction methods...
10. Added fallback embed URL: /embed/anime-name-123
11. Found broad video URL: https://...
12. Alternative methods found 2 sources
```

---

## 🔎 Analyzing the Console Output

### 1. Check HTML Preview

**What it shows**: First 500 characters of the fetched HTML

**What to look for**:
```html
<!-- Good: Actual page content -->
<!DOCTYPE html><html><head><title>Anime Name</title>...

<!-- Bad: Error page -->
<html><body><h1>404 Not Found</h1>...

<!-- Bad: Cloudflare/CAPTCHA -->
<html><head><title>Just a moment...</title>...
```

**If you see**:
- **"404 Not Found"** → Episode URL is wrong
- **"Just a moment..."** → Cloudflare is blocking the request
- **"Error"** or **"Access Denied"** → IP blocked or rate limited
- **Actual page content** → Proceed to next step

### 2. Check Parsing Results

**Look at each "Found" log**:

```javascript
// These are good:
Found iframe 1: /embed/abc123
Found video URL (pattern 2): https://cdn.server.com/anime/video.m3u8
Found server ID: srv-456 Type: sub

// These might not work:
Found server ID: undefined Type: unknown  // Missing server data
Found data attribute: /path/to/video     // Relative URL, needs base URL
```

### 3. Check Final Source Count

```
Unique sources: 3  ← Good! Should have at least 1
Unique sources: 0  ← Bad! No sources found
```

### 4. Check Source Types

```
Source 1: hls - HLS - https://...     ← Best! Direct video stream
Source 2: mp4 - Direct - https://...  ← Good! Direct video file
Source 3: iframe - Default - https... ← Maybe works, needs iframe parsing
Source 4: api - SUB - https://...     ← Needs API call to get actual video
```

---

## 🚨 Common Issues & Solutions

### Issue 1: HTML Length is Too Small

```
HTML length: 1234  ← Too small! Should be 20,000+
```

**Cause**: Got an error page, redirect, or CAPTCHA

**Solutions**:
1. Check if CORS proxy is working
2. Verify episode URL is correct
3. Try accessing the URL in a browser

### Issue 2: HTML Preview Shows Error Page

```
HTML preview: <html><body><h1>404 Not Found</h1>...
```

**Cause**: Episode doesn't exist on AniWatch

**Solutions**:
1. Anime might not be on AniWatch
2. Episode number might be wrong
3. Try searching for anime again

### Issue 3: No iframes or video URLs Found

```
Total sources found before filtering: 0
```

**Causes**:
1. **JavaScript-loaded player**: Video URLs loaded dynamically after page load
2. **API-based player**: Video URLs fetched via AJAX
3. **Different HTML structure**: AniWatch changed their layout

**Solutions**:
1. Alternative extraction will try fallback methods
2. Check if embed URLs work
3. May need to inspect actual AniWatch page structure

### Issue 4: Sources Found But "No streaming sources returned"

```
Unique sources: 3
...
No streaming sources returned  ← Error in streamingApi
```

**Cause**: Sources found but not returned correctly

**Solutions**:
1. Check `src/services/streamingApi.ts` - might be filtering sources
2. Check source format - might not match expected structure
3. Verify sources are being passed to VideoPlayerScreen

---

## 🧪 Testing Steps

### 1. Pick a Test Anime

Choose a **very popular anime** that's definitely on AniWatch:
- One Piece
- Naruto
- My Hero Academia
- Attack on Titan

### 2. Open Console

Make sure browser console is open to see all logs.

### 3. Navigate to Episode

1. Search for the anime
2. Click on it
3. Wait for episodes to load
4. Click an episode (Episode 1 recommended)

### 4. Watch Console Output

Look for the log sequence described above.

### 5. Take Screenshots

If something fails, screenshot:
- The console output
- The error message
- The HTML preview line

---

## 🔧 Manual Testing

If you want to test AniWatch scraping manually:

### Test Episode URL

Try this URL in your browser:
```
https://aniwatchtv.to/watch/alma-chan-wants-to-have-a-family-19888?ep=1
```

**Check**:
1. Does the page load?
2. Does a video player appear?
3. Right-click page → "View Page Source"
4. Search for: `iframe`, `.m3u8`, `.mp4`, `data-id`

### Expected Patterns

You should find things like:
```html
<!-- Iframe embed -->
<iframe src="/embed/xyz123" ...></iframe>

<!-- Video URL in JavaScript -->
<script>
  var sources = [{file: "https://cdn.../video.m3u8"}];
</script>

<!-- Server selection -->
<div data-id="server-456" class="server-item" data-type="sub">
```

---

## 📝 What Each Source Type Means

### 1. HLS/M3U8 (`type: 'hls'`)
```
Source 1: hls - HLS - https://cdn.example.com/anime/ep1/index.m3u8
```

**What it is**: HLS streaming playlist (best quality, adaptive)

**Will it work?**: ✅ Yes, if URL is valid

**How to test**: Open URL in browser, should download .m3u8 file

---

### 2. MP4 Direct (`type: 'mp4'`)
```
Source 2: mp4 - Direct - https://cdn.example.com/anime/ep1.mp4
```

**What it is**: Direct MP4 video file

**Will it work?**: ✅ Yes, if URL is valid and not geo-blocked

**How to test**: Open URL in browser, should start playing/downloading

---

### 3. Iframe Embed (`type: 'iframe'`)
```
Source 3: iframe - Default - https://aniwatchtv.to/embed/xyz123
```

**What it is**: Embedded player URL

**Will it work?**: ⚠️ Maybe - needs iframe content parsing

**How to test**: Open URL in browser, should show video player

**Note**: `expo-av` Video component might not render iframes. This would need additional parsing.

---

### 4. API Endpoint (`type: 'api'`)
```
Source 4: api - SUB - https://aniwatchtv.to/ajax/server/server-123
```

**What it is**: API endpoint that returns video URL

**Will it work?**: ⚠️ Needs extra API call

**How to test**: Open URL in browser, should return JSON with video URL

**Note**: Would need to implement API call in `streamingApi.ts`

---

## 🎯 Next Steps Based on Results

### If You See Video URLs (HLS/MP4)

```
Source 1: hls - HLS - https://cdn.example.com/video.m3u8
```

**This should work!** If it still fails:
1. Check if `streamingApi.ts` is filtering these out
2. Verify sources are reaching `VideoPlayerScreen`
3. Test the URL directly in browser

---

### If You Only See Iframes

```
Source 1: iframe - Default - https://aniwatchtv.to/embed/xyz123
```

**Need iframe parsing**:
1. Fetch the iframe URL
2. Parse its HTML for video sources
3. Extract actual video URL
4. Return that URL

**Quick fix**: Add this to `aniwatchScraper.ts`:
```typescript
// If iframe URL found, fetch it and parse
if (iframeUrl) {
  const iframeHtml = await fetchWithCache(iframeUrl);
  const iframeSources = parseAniwatchSources(iframeHtml, iframeUrl);
  sources.push(...iframeSources);
}
```

---

### If You Only See API Endpoints

```
Source 1: api - SUB - https://aniwatchtv.to/ajax/server/server-123
```

**Need API implementation**:
1. Make API call to the endpoint
2. Parse JSON response
3. Extract video URL from response
4. Return video URL

---

### If You See Nothing

```
Total sources found before filtering: 0
Unique sources: 0
```

**Possible reasons**:
1. **CAPTCHA/Cloudflare**: Check HTML preview
2. **Different structure**: AniWatch changed their HTML
3. **JavaScript-rendered**: Player loads after page load
4. **Geo-blocked**: Your IP is blocked

**Solutions**:
1. Use a CORS proxy with a different IP
2. Inspect actual AniWatch page to see new structure
3. Consider using an official API if available

---

## 📚 Understanding AniWatch's Video System

### How Most Anime Sites Work

```
1. User visits episode page
2. Page contains:
   - Server selection buttons (SUB, DUB, etc.)
   - Each server has a data-id
3. When user clicks a server:
   - JavaScript makes AJAX call to /ajax/server/{id}
   - Server returns iframe URL or video URL
4. Video player loads with that URL
```

### What This Scraper Does

```
1. Fetches episode page HTML
2. Looks for:
   - Video URLs directly in HTML/JavaScript
   - iframe URLs in HTML
   - Server IDs for later API calls
3. Returns all found sources
4. Video player tries to play them
```

### The Challenge

- Most sites don't put video URLs directly in HTML
- They load them via JavaScript/AJAX after page loads
- This scraper can't execute JavaScript
- So it looks for patterns that exist in initial HTML

---

## 🚀 Recommended Actions

### 1. **Run the App with Console Open**

```bash
npm start
# or
npx expo start
```

Open in web browser with console visible.

### 2. **Test with Popular Anime**

Try "One Piece" or "Naruto" - these are definitely on AniWatch.

### 3. **Share Console Output**

If it fails, share:
- HTML length
- HTML preview
- Parsing results
- Source count

### 4. **Test URLs Manually**

Copy any found URLs and test them directly in browser.

---

## 💡 Tips for Success

1. **Use Web Browser First**: Easier to debug than mobile
2. **Check Network Tab**: See what requests are being made
3. **Compare with AniWatch**: Visit actual site to see how it works
4. **Test One Episode**: Don't test multiple episodes at once
5. **Clear Cache**: Sometimes cached data causes issues

---

## 🎓 Learning Opportunities

This debugging process will help you understand:
- How web scraping works
- How video streaming sites are structured
- Why some sites are harder to scrape than others
- The difference between static HTML and dynamic content
- How to analyze and debug parsing logic

---

## 📞 What to Report

If you need help, provide:

1. **Console logs** (full output from clicking episode)
2. **Anime title** you're testing
3. **Episode number**
4. **HTML preview** (first line)
5. **Source count** (how many found)
6. **Any error messages**

Example report:
```
Testing: One Piece Episode 1
HTML length: 45678
HTML preview: <!DOCTYPE html><html><head><title>...
Sources found: 0
Error: No streaming sources returned
```

---

**Good luck debugging!** 🐛🔧

The enhanced logging will help us understand exactly what's happening.

