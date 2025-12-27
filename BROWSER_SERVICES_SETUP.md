# Browser Services Setup for JavaScript-Rendered Pages

The bulk scrape function supports JavaScript-rendered pages through multiple methods:

## Method 1: Puppeteer/Chromium (Default - May Not Work in Netlify)

Puppeteer with `@sparticuz/chromium` is attempted first, but may not work in Netlify Functions due to environment limitations.

## Method 2: External Browser Services (Recommended)

If Puppeteer fails, the function will automatically try external browser services. Configure one of the following:

### Option A: ScrapingBee (Recommended)

1. Sign up at https://www.scrapingbee.com/
2. Get your API key from the dashboard
3. Add to Netlify environment variables:
   ```
   SCRAPINGBEE_API_KEY=your_api_key_here
   ```

**Pricing**: Free tier includes 1,000 API calls/month

### Option B: Browserless

1. Sign up at https://www.browserless.io/
2. Get your API key and URL
3. Add to Netlify environment variables:
   ```
   BROWSERLESS_API_KEY=your_api_key_here
   BROWSERLESS_URL=https://chrome.browserless.io  # Optional, defaults to this
   ```

**Pricing**: Free tier available

### Option C: ScraperAPI

1. Sign up at https://www.scraperapi.com/
2. Get your API key from the dashboard
3. Add to Netlify environment variables:
   ```
   SCRAPERAPI_KEY=your_api_key_here
   ```

**Pricing**: Free tier includes 5,000 API calls/month

## How It Works

1. Function first tries regular fetch (fast, for static pages)
2. If placeholder content detected, tries Puppeteer
3. If Puppeteer fails, automatically tries configured external browser services
4. Returns helpful error if no services are configured

## Testing

To test with a JavaScript-rendered page:
1. Configure one of the services above
2. Try scraping a page that requires JavaScript (like the Clayton Chamber directory)
3. Check logs to see which service was used

## Notes

- External services have rate limits and may incur costs
- For production use, consider caching results
- Static directory pages work without any browser service

