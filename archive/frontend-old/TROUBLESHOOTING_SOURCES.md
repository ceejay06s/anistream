# 🔍 Troubleshooting "Sources Not Found"

## Overview

If you're seeing "sources not found" or "No streaming sources available", this guide will help you diagnose which step is failing.

---

## 📊 **What to Look For in Console**

### Step 1: Search Phase

When you search for an anime, you should see:

```
Searching for streaming sources: Spy x Family Season 3
├─ Searching AniWatch for: Spy x Family Season 3
│  ├─ Search URL: https://aniwatchtv.to/search?keyword=...
│  ├─ Search HTML length: XXXXX
│  ├─ Parsing search results HTML...
│  └─ Found X results from AniWatch
│
├─ (If AniWatch fails) No AniWatch results, trying Shafilm fallback...
│  ├─ Searching Shafilm for: Spy x Family Season 3
│  ├─ Normalized query: spy x family season 3
│  ├─ Fetching Shafilm anime list...
│  └─ Found X matches on Shafilm
│
└─ (If Shafilm fails) No Shafilm results, trying GoGoAnime fallback...
   ├─ Searching GoGoAnime for: Spy x Family Season 3
   ├─ GoGoAnime search URL: https://anitaku.pe/search.html?keyword=...
   ├─ GoGoAnime HTML length: XXXXX
   ├─ Parsing GoGoAnime search results...
   └─ Found X results from GoGoAnime
```

### Step 2: Episode Loading Phase

When you click on an anime, you should see:

```
Found on: [Source] Title: [Anime Title] ID: [anime-id]
Fetching anime info for: [anime-id] Source: [Source]
├─ (If AniWatch) Fetching anime page...
│  └─ Loaded X episodes from AniWatch
│
├─ (If Shafilm) Detected Shafilm source, fetching from file server...
│  ├─ Scraping episodes from: https://prime.shafilm.vip/Series%20Anime/[folder]/
│  └─ Loaded X episodes from Shafilm
│
└─ (If GoGoAnime) Detected GoGoAnime source, fetching from scraper...
   ├─ Fetching GoGoAnime info for: [anime-id]
   ├─ Parsing GoGoAnime anime info...
   ├─ Parsing episodes list for: [anime-id]
   └─ Loaded X episodes from GoGoAnime
```

### Step 3: Video Source Extraction Phase

When you click an episode, you should see:

```
=== Loading Streaming Sources ===
Episode ID: [episode-id]
Episode URL: [episode-url]
Fetching streaming sources for: [episode-id]
Source: [Source] Episode URL: [url]
│
├─ (If AniWatch) Fetching episode page...
│  ├─ Extracted source ID: XXXXX
│  ├─ Calling AJAX API: /ajax/v2/episode/sources?id=XXXXX
│  ├─ Found iframe URL: [url]
│  ├─ Fetching iframe content...
│  └─ Extracted X video sources
│
├─ (If Shafilm) Detected Shafilm direct video URL
│  └─ Returning direct video source
│
└─ (If GoGoAnime) Detected GoGoAnime source, fetching video sources...
   ├─ Fetching video sources for: [episode-id]
   ├─ Episode page HTML length: XXXXX
   ├─ Parsing GoGoAnime video sources...
   ├─ Found X download links
   ├─ Found X iframe sources
   └─ Total sources: X
```

---

## ❌ **Common Issues and Fixes**

### Issue 1: "Found 0 results from AniWatch"

**Symptoms:**
```
Searching AniWatch for: Spy x Family Season 3
Found 0 anime cards in HTML
Found 0 results from AniWatch
No AniWatch results, trying Shafilm fallback...
```

**Cause:** 
- AniWatch HTML structure changed
- AniWatch is blocking requests
- Search query doesn't match any anime

**Fix:**
✅ **Automatic fallback** - App will try Shafilm, then GoGoAnime
✅ **Check console** - Look for Shafilm or GoGoAnime results
✅ **Try different search** - Search for a different anime

---

### Issue 2: "Found 0 matches on Shafilm"

**Symptoms:**
```
Searching Shafilm for: Some Anime
Normalized query: some anime
Fetching Shafilm anime list...
Found 120 anime folders from Shafilm
Found 0 matches on Shafilm
No Shafilm results, trying GoGoAnime fallback...
```

**Cause:**
- Anime not available on Shafilm file server
- Title mismatch (e.g., searching "My Hero Academia" but folder is "Boku.no.Hero.Academia")

**Fix:**
✅ **Automatic fallback** - App will try GoGoAnime next
✅ **Check Shafilm directory** - Visit https://prime.shafilm.vip/Series%20Anime/ to see available anime
✅ **Try alternative title** - Search using Japanese or English title

---

### Issue 3: "Found 0 results from GoGoAnime"

**Symptoms:**
```
Searching GoGoAnime for: Some Anime
GoGoAnime search URL: https://anitaku.pe/search.html?keyword=...
GoGoAnime HTML length: XXXXX
Parsing GoGoAnime search results...
HTML sample: [shows HTML]
Pattern 1 failed, trying pattern 2...
Pattern 2 failed, trying pattern 3...
Parsed 0 GoGoAnime results
Found 0 results from GoGoAnime
```

**Cause:**
- GoGoAnime HTML structure changed
- Domain changed (anitaku.pe → new domain)
- Proxy/CORS issues
- Anime not on GoGoAnime

**Diagnosis:**
1. **Check HTML sample** - Does it show actual HTML or error page?
2. **Check HTML length** - Very short (< 1000) might indicate error
3. **Look for CAPTCHA** - HTML might contain "cloudflare" or "captcha"

**Fix:**
🔧 **Update domain** - Check if GoGoAnime moved to new domain
🔧 **Update patterns** - Regex patterns may need updating
🔧 **Check proxy** - Verify backend proxy is running
🔧 **Manual test** - Try accessing https://anitaku.pe/search.html?keyword=naruto in browser

---

### Issue 4: "No episodes found"

**Symptoms:**
```
Loaded 0 episodes from [Source]
No episodes available
```

**For AniWatch:**
```
Fetching anime info for: anime-slug
Cannot construct URL...
OR
Parsed 0 episodes
```

**For Shafilm:**
```
Scraping episodes from: [folder URL]
Found 0 episode files
```

**For GoGoAnime:**
```
Parsing episodes list for: anime-id
No episode range found in HTML
Extracted episodes: 0
No episodes found, generating placeholder episode list
Extracted episodes: 12 (placeholders)
```

**Cause:**
- Anime page doesn't exist
- Episode list structure changed
- Network/proxy error

**Fix:**
✅ **GoGoAnime auto-generates** - Creates 12 placeholder episodes
✅ **Try different anime** - Test with popular anime like "Naruto"
✅ **Check URL manually** - Visit the anime page in browser
🔧 **Update parsers** - Episode extraction logic may need update

---

### Issue 5: "No streaming sources found"

**Symptoms:**
```
Fetching streaming sources for: episode-id
Episode URL: [url]
No streaming sources found
OR
Found 0 sources
```

**For AniWatch:**
```
Calling AJAX API: /ajax/v2/episode/sources?id=XXXXX
Returned: {sources: []}
No streaming sources found
```

**For Shafilm:**
```
Detected Shafilm direct video URL
Returning direct video source ✅ (This should work!)
```

**For GoGoAnime:**
```
Parsing GoGoAnime video sources...
HTML length: XXXXX
Found 0 download links
Found 0 iframe sources
No video sources extracted from GoGoAnime page
```

**Cause:**
- Video page structure changed
- Video sources are protected/encrypted
- Episode doesn't actually exist
- AJAX API changed

**Diagnosis:**
1. **Which source?** - AniWatch, Shafilm, or GoGoAnime?
2. **Check HTML preview** - Does it show video player HTML?
3. **Check iframe count** - Even if download links fail, iframes should be found

**Fix:**
- **AniWatch**: AJAX API may have changed, check browser DevTools Network tab
- **Shafilm**: Should always work (direct files), check if URL is valid
- **GoGoAnime**: Update iframe/video extraction patterns

---

## 🧪 **Testing Each Source Individually**

### Test AniWatch

```
Search: "Frieren"
Expected:
  ✅ Found X results from AniWatch
  ✅ Found on: AniWatch
  ✅ Loaded Y episodes from AniWatch
  ✅ Video sources extracted
```

### Test Shafilm

```
Search: "Spy x Family"
Expected:
  ❌ Found 0 results from AniWatch
  ✅ Trying Shafilm fallback...
  ✅ Found 1 matches on Shafilm: Spy.X.family
  ✅ Loaded Y episodes from Shafilm
  ✅ Detected Shafilm direct video URL ✅
```

### Test GoGoAnime

```
Search: "One Piece"
Expected:
  ❌ Found 0 results from AniWatch
  ❌ Found 0 matches on Shafilm
  ✅ Trying GoGoAnime fallback...
  ✅ Found X results from GoGoAnime
  ✅ Loaded Y episodes from GoGoAnime
  ✅ Extracted video sources
```

---

## 🔧 **Quick Fixes**

### If ALL sources fail:

1. **Check internet connection**
2. **Check backend proxy** - Is `npm run proxy` running in backend folder?
3. **Check console for errors** - Red error messages indicate network/parsing issues
4. **Try in browser** - Can you access the source sites directly?

### If only AniWatch fails:

✅ **This is OK!** - Shafilm and GoGoAnime should work as fallback
🔧 **Optional**: Update AniWatch domain or scraping logic

### If only Shafilm fails:

✅ **This is OK!** - AniWatch and GoGoAnime should work as fallback
📝 **Note**: Shafilm only has ~100 anime, so this is expected for many titles

### If only GoGoAnime fails:

✅ **This is OK!** - AniWatch and Shafilm should work as fallback
🔧 **Check domain**: GoGoAnime frequently changes domains (gogoanime3.co → anitaku.pe → ?)

---

## 📋 **Console Output Checklist**

Copy this and check off what you see:

**Search Phase:**
- [ ] "Searching for streaming sources: [title]"
- [ ] "Searching AniWatch for: [title]"
- [ ] "Found X results from AniWatch" (OR fallback messages)
- [ ] At least ONE source returned results

**Episode Phase:**
- [ ] "Found on: [Source]"
- [ ] "Fetching anime info for: [id]"
- [ ] "Loaded X episodes from [Source]"
- [ ] X > 0 episodes

**Video Phase:**
- [ ] "=== Loading Streaming Sources ==="
- [ ] "Fetching streaming sources for: [id]"
- [ ] "Episode URL: [url]"
- [ ] "Found X sources" (X > 0)
- [ ] "Loading video from [Source]..."
- [ ] Video plays ✅

---

## 🚀 **Next Steps**

### If you see specific error:

1. **Copy the console output** showing the error
2. **Check which phase failed** (Search, Episode, or Video)
3. **Follow the fix** for that specific issue above

### If you still can't find sources:

1. **Share console output** - Copy everything from search to error
2. **Test with known anime** - Try "Naruto" or "One Piece"
3. **Check backend** - Make sure proxy server is running
4. **Update parsers** - Scraping code may need updates

---

## ✅ **Expected Working Flow**

Here's what a successful flow looks like:

```
🔍 SEARCH
Searching for streaming sources: Spy x Family Season 3
├─ AniWatch: 0 results
└─ Shafilm: 1 result ✅

📺 EPISODES
Found on: Shafilm
Loaded 25 episodes from Shafilm ✅

▶️ VIDEO
Detected Shafilm direct video URL
Video playing from Shafilm ✅
```

**Any deviations from this? Look for the console messages above to diagnose!**

---

## 📞 **Need Help?**

Share this info:
1. ✅ Which anime you searched
2. ✅ Complete console output
3. ✅ Which phase failed (Search/Episodes/Video)
4. ✅ Is backend proxy running?
5. ✅ Can you access source sites in browser?

With this info, we can pinpoint the exact issue! 🎯

