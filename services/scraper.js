const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Automatically scrape product data from a URL using common selectors
 * @param {string} url - The product URL to scrape
 * @param {string} stockSelector - CSS selector or div ID for stock status
 * @param {string} nameSelector - CSS selector or div ID for product name
 * @param {string} imageSelector - CSS selector or div ID for product image
 * @returns {Object} Scraped product data
 */
async function scrapeProduct(url, stockSelector = null, nameSelector = null, imageSelector = null) {
  try {
    console.log(`🔍 Scraping: ${url}`);
    
    // Fetch the webpage
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    // Load HTML into Cheerio
    const $ = cheerio.load(response.data);
    
    console.log(`📄 Page loaded successfully, length: ${response.data.length} characters`);
    
    // Extract data using provided selectors or auto-detect
    const stockStatus = stockSelector ? extractText($, stockSelector) : autoDetectStockStatus($);
    const productName = nameSelector ? extractText($, nameSelector) : autoDetectProductName($);
    const imageUrl = imageSelector ? extractImageUrl($, imageSelector, url) : autoDetectProductImage($, url);

    // Try to extract product code using a common selector
    let productCode = null;
    const codeElement = $('#cat-store-product-stock-code');
    if (codeElement.length > 0) {
      productCode = codeElement.text().trim();
    }

    console.log(`✅ Scraped Results:`);
    console.log(`   - Product Name: ${productName}`);
    console.log(`   - Stock Status: ${stockStatus}`);
    console.log(`   - Image URL: ${imageUrl}`);
    if (productCode) console.log(`   - Product Code: ${productCode}`);

    return {
      product_name: productName,
      stock_status: stockStatus,
      image_url: imageUrl,
      product_code: productCode,
      updated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Error scraping ${url}:`, error.message);
    throw new Error(`Failed to scrape ${url}: ${error.message}`);
  }
}

/**
 * Auto-detect product name using common selectors
 * @param {Object} $ - Cheerio object
 * @returns {string} Product name or "Not found"
 */
function autoDetectProductName($) {
  console.log('🔍 Auto-detecting product name...');
  
  const commonSelectors = [
    // User's specific selectors (prioritized)
    '#cat-store-product-title',
    '#product-title',
    '#product-name',
    '#title',
    
    // Meta tags first (most reliable)
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[property="product:name"]',
    'meta[name="title"]',
    'meta[property="og:site_name"]',
    
    // Common product title selectors
    'h1.product-title',
    'h1[class*="product"]',
    'h1[class*="title"]',
    '.product-name',
    '.product-title',
    '.item-name',
    '.product-name h1',
    '.product-title h1',
    '.product h1',
    '.item h1',
    
    // Generic but common
    'h1',
    '.title',
    '[data-testid*="product-name"]',
    '[data-testid*="title"]',
    '[class*="product-name"]',
    '[class*="product-title"]',
    
    // E-commerce specific
    '.product-details h1',
    '.product-info h1',
    '.product-header h1',
    '.product-main h1',
    '.product-content h1',
    
    // Additional common patterns
    '[id*="product"]',
    '[id*="title"]',
    '[id*="name"]',
    '.main-title',
    '.page-title',
    '.product-header .title'
  ];

  for (const selector of commonSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      let text = '';
      
      // Handle meta tags differently
      if (selector.includes('meta')) {
        text = element.attr('content') || '';
      } else {
        text = element.first().text().trim();
      }
      
      if (text && text.length > 0 && text.length < 200) {
        console.log(`✅ Found product name with selector: ${selector}`);
        return text;
      }
    }
  }

  // Fallback: look for any h1 that might be a product name
  const h1s = $('h1');
  for (let i = 0; i < h1s.length; i++) {
    const text = $(h1s[i]).text().trim();
    if (text && text.length > 0 && text.length < 200 && 
        !text.toLowerCase().includes('home') && 
        !text.toLowerCase().includes('welcome') &&
        !text.toLowerCase().includes('login') &&
        !text.toLowerCase().includes('sign in')) {
      console.log(`✅ Found product name in h1: ${text}`);
      return text;
    }
  }

  console.log('❌ No product name found');
  return "Not found";
}

/**
 * Auto-detect stock status using common selectors
 * @param {Object} $ - Cheerio object
 * @returns {string} Stock status or "Not found"
 */
function autoDetectStockStatus($) {
  console.log('🔍 Auto-detecting stock status...');
  
  const commonSelectors = [
    // User's specific selectors (prioritized)
    '#cat-store-product-stock',
    '#product-stock',
    '#stock-status',
    '#availability',
    
    // Common stock status selectors
    '.availability',
    '.stock-status',
    '.stock-indicator',
    '.inventory-status',
    '.product-availability',
    '.product-stock',
    '.stock',
    '.status',
    '.product-status',
    
    // Class-based selectors
    '[class*="stock"]',
    '[class*="availability"]',
    '[class*="inventory"]',
    '[class*="status"]',
    
    // Data attributes
    '[data-testid*="stock"]',
    '[data-testid*="availability"]',
    '[data-testid*="status"]',
    
    // Button and span selectors
    'button[class*="stock"]',
    'span[class*="stock"]',
    'div[class*="stock"]',
    
    // E-commerce specific
    '.add-to-cart',
    '.buy-now',
    '.purchase',
    '.order',
    '.checkout',
    
    // Additional patterns
    '[id*="stock"]',
    '[id*="availability"]',
    '[id*="status"]',
    '.product-actions .stock',
    '.product-info .stock'
  ];

  for (const selector of commonSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      const text = element.first().text().trim();
      if (text && text.length > 0 && text.length < 100) {
        console.log(`✅ Found stock status with selector: ${selector}`);
        console.log(`   Raw text: "${text}"`);
        
        // Clean up the text and return it as-is for proper parsing
        const cleanedText = text.replace(/\s+/g, ' ').trim();
        return cleanedText;
      }
    }
  }

  // Look for stock-related keywords in the entire page
  const stockKeywords = [
    'in stock', 'out of stock', 'available', 'unavailable', 
    'sold out', 'backorder', 'pre-order', 'coming soon',
    'add to cart', 'buy now', 'purchase', 'order now',
    'stock', 'availability', 'quantity', 'inventory'
  ];
  
  const allText = $.text().toLowerCase();
  
  for (const keyword of stockKeywords) {
    if (allText.includes(keyword)) {
      console.log(`✅ Found stock keyword: ${keyword}`);
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }

  // Check for add to cart buttons
  const addToCartButtons = $('button, a, input[type="submit"]');
  for (let i = 0; i < addToCartButtons.length; i++) {
    const button = $(addToCartButtons[i]);
    const text = button.text().toLowerCase();
    const value = button.attr('value') || '';
    const className = button.attr('class') || '';
    const id = button.attr('id') || '';
    
    if (text.includes('add to cart') || text.includes('buy now') || 
        value.includes('add to cart') || value.includes('buy now') ||
        className.includes('add-to-cart') || className.includes('buy-now') ||
        id.includes('add-to-cart') || id.includes('buy-now')) {
      console.log(`✅ Found add to cart button: ${text || value}`);
      return 'In Stock';
    }
  }

  // Check for out of stock indicators
  const outOfStockIndicators = $('*');
  for (let i = 0; i < outOfStockIndicators.length; i++) {
    const element = $(outOfStockIndicators[i]);
    const text = element.text().toLowerCase();
    const className = element.attr('class') || '';
    const id = element.attr('id') || '';
    
    if (text.includes('out of stock') || text.includes('sold out') ||
        className.includes('out-of-stock') || className.includes('sold-out') ||
        id.includes('out-of-stock') || id.includes('sold-out')) {
      console.log(`✅ Found out of stock indicator: ${text}`);
      return 'Out of Stock';
    }
  }

  console.log('❌ No stock status found');
  return "Not found";
}

/**
 * Auto-detect product image using common selectors
 * @param {Object} $ - Cheerio object
 * @param {string} baseUrl - Base URL for relative image URLs
 * @returns {string} Image URL or "Not found"
 */
function autoDetectProductImage($, baseUrl) {
  console.log('🔍 Auto-detecting product image...');
  
  const commonSelectors = [
    // User's specific selector
    '#cat-store-product-main img',
    '#cat-store-product-main',
    
    // Meta tags first (most reliable)
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[property="product:image"]',
    
    // Common product image selectors
    '.product-image img',
    '.product-image img[src]',
    '.main-image img',
    '.product-photo img',
    '.product-img img',
    '.item-image img',
    '.product-thumbnail img',
    '.product-gallery img',
    '.gallery img',
    '.product-picture img',
    
    // Class-based selectors
    'img[class*="product"]',
    'img[class*="main"]',
    'img[class*="primary"]',
    'img[class*="hero"]',
    
    // Alt text based
    'img[alt*="product"]',
    'img[alt*="main"]',
    'img[alt*="primary"]',
    
    // Data attributes
    'img[data-testid*="product"]',
    'img[data-testid*="image"]',
    'img[data-src*="product"]',
    
    // Generic but common
    '.product img',
    '.item img',
    '.main img',
    '.hero img'
  ];

  for (const selector of commonSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      let img = element;
      
      // If the selector doesn't end with img, look for img inside
      if (!selector.endsWith(' img')) {
        img = element.find('img').first();
        if (img.length === 0) {
          img = element; // Use the element itself if no img found
        }
      }
      
      let imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
      
      if (imageUrl) {
        console.log(`✅ Found image with selector: ${selector}`);
        console.log(`   Original URL: ${imageUrl}`);
        
        // Handle PHP thumbnail URLs and convert to direct image URLs
        if (imageUrl.includes('phpThumb') || imageUrl.includes('php')) {
          console.log(`🔧 PHP image detected, extracting original URL`);
          
          // Extract the original filename from PHP thumbnail URLs
          // Example: phpThumb/phpThumb.php?src=..%2Fimages%2Fitems%2Fp248_101_1Y.jpg&w=250&h=200&aoe=1&hash=d124bf9d69167f8784e724eb9bfc80f1
          const srcMatch = imageUrl.match(/src=([^&]+)/);
          if (srcMatch) {
            const encodedSrc = srcMatch[1];
            // Decode URL encoding
            const decodedSrc = decodeURIComponent(encodedSrc);
            console.log(`📝 Decoded src parameter: ${decodedSrc}`);
            
            // Remove the ".." prefix if present
            let cleanSrc = decodedSrc;
            if (decodedSrc.startsWith('..')) {
              cleanSrc = decodedSrc.substring(2);
            }
            
            // Extract domain from baseUrl for constructing direct image URL
            const urlObj = new URL(baseUrl);
            const domain = `${urlObj.protocol}//${urlObj.host}`;
            
            // Construct the direct image URL
            const directImageUrl = `${domain}${cleanSrc}`;
            console.log(`✅ Converted to direct image URL: ${directImageUrl}`);
            return directImageUrl;
          }
        }

        // For non-PHP URLs, convert relative to absolute
        const absoluteUrl = convertToAbsoluteUrl(imageUrl, baseUrl);
        console.log(`✅ Converted to absolute URL: ${absoluteUrl}`);
        return absoluteUrl;
      }
    }
  }

  // Try to find any image that might be the product image
  const images = $('img[src]');
  console.log(`Found ${images.length} total images on page`);
  
  for (let i = 0; i < images.length; i++) {
    const img = $(images[i]);
    const src = img.attr('src');
    const alt = img.attr('alt') || '';
    const className = img.attr('class') || '';
    const width = img.attr('width');
    const height = img.attr('height');
    
    // Skip small images, icons, and decorative images
    if (src && 
        !src.includes('icon') && 
        !src.includes('logo') && 
        !src.includes('banner') &&
        !src.includes('ad') &&
        !className.includes('icon') && 
        !className.includes('logo') &&
        !className.includes('banner') &&
        !className.includes('ad') &&
        alt.length < 100 &&
        !alt.toLowerCase().includes('icon') &&
        !alt.toLowerCase().includes('logo')) {
      
      console.log(`✅ Found suitable image: ${src}`);
      
      // Handle PHP thumbnail URLs
      if (src.includes('phpThumb') || src.includes('php')) {
        console.log(`🔧 PHP image detected, extracting original URL`);
        
        const srcMatch = src.match(/src=([^&]+)/);
        if (srcMatch) {
          const encodedSrc = srcMatch[1];
          const decodedSrc = decodeURIComponent(encodedSrc);
          console.log(`📝 Decoded src parameter: ${decodedSrc}`);
          
          let cleanSrc = decodedSrc;
          if (decodedSrc.startsWith('..')) {
            cleanSrc = decodedSrc.substring(2);
          }
          
          // Extract domain from baseUrl for constructing direct image URL
          const urlObj = new URL(baseUrl);
          const domain = `${urlObj.protocol}//${urlObj.host}`;
          
          const directImageUrl = `${domain}${cleanSrc}`;
          console.log(`✅ Converted to direct image URL: ${directImageUrl}`);
          return directImageUrl;
        }
      }
      
      // For non-PHP URLs, convert relative to absolute
      const absoluteUrl = convertToAbsoluteUrl(src, baseUrl);
      console.log(`✅ Converted to absolute URL: ${absoluteUrl}`);
      return absoluteUrl;
    }
  }

  console.log('❌ No suitable product image found');
  return "Not found";
}

/**
 * Convert relative URL to absolute URL
 * @param {string} url - The URL to convert
 * @param {string} baseUrl - The base URL
 * @returns {string} Absolute URL
 */
function convertToAbsoluteUrl(url, baseUrl) {
  if (!url) return url;
  
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Protocol-relative
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  
  // Root-relative
  if (url.startsWith('/')) {
    const urlObj = new URL(baseUrl);
    return `${urlObj.protocol}//${urlObj.host}${url}`;
  }
  
  // Relative to current path - handle properly for relative URLs
  try {
    // For relative URLs like "phpThumb/phpThumb.php?src=...", 
    // we need to construct the URL relative to the base URL's directory
    const urlObj = new URL(baseUrl);
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    
    // Remove the last part (filename) to get the directory
    if (pathParts.length > 0) {
      pathParts.pop();
    }
    
    // Construct the full URL
    const relativePath = pathParts.length > 0 ? '/' + pathParts.join('/') + '/' : '/';
    const absoluteUrl = `${urlObj.protocol}//${urlObj.host}${relativePath}${url}`;
    
    console.log(`🔗 Converting relative URL: ${url}`);
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   Relative path: ${relativePath}`);
    console.log(`   Absolute URL: ${absoluteUrl}`);
    
    return absoluteUrl;
  } catch (error) {
    console.error(`Error converting URL "${url}" with base "${baseUrl}":`, error);
    return url;
  }
}

/**
 * Extract text content from an element using CSS selector or div ID
 * @param {Object} $ - Cheerio object
 * @param {string} selector - CSS selector or div ID
 * @returns {string} Extracted text or "Not found"
 */
function extractText($, selector) {
  try {
    // Handle different selector formats
    let actualSelector = selector;
    
    // If it's just an ID without #, add it
    if (selector && !selector.startsWith('#') && !selector.startsWith('.') && !selector.includes(' ')) {
      actualSelector = `#${selector}`;
    }
    
    console.log(`🔍 Trying selector: ${actualSelector}`);
    
    const element = $(actualSelector);
    if (element.length === 0) {
      console.log(`❌ No element found with selector: ${actualSelector}`);
      return "Not found";
    }
    
    // Get text content and clean it up
    let text = element.text().trim();
    
    // Remove extra whitespace and newlines
    text = text.replace(/\s+/g, ' ');
    
    console.log(`✅ Found text: "${text}"`);
    return text || "Not found";
  } catch (error) {
    console.error(`Error extracting text with selector "${selector}":`, error);
    return "Not found";
  }
}

/**
 * Extract image URL from element
 * @param {Object} $ - Cheerio object
 * @param {string} selector - CSS selector
 * @param {string} baseUrl - Base URL for relative URLs
 * @returns {string} Image URL or "Not found"
 */
function extractImageUrl($, selector, baseUrl) {
  console.log(`🔍 Extracting image URL with selector: ${selector}`);
  
  // Handle ID-only selectors (e.g., "my-id" becomes "#my-id")
  const actualSelector = selector.startsWith('#') ? selector : `#${selector}`;
  const element = $(actualSelector);
  
  if (element.length === 0) {
    console.log(`❌ No element found with selector: ${actualSelector}`);
    return "Not found";
  }
  
  // First try to find img tag inside the selected element
  let imgElement = element.find('img').first();
  
  // If no img found inside, check if the element itself is an img
  if (imgElement.length === 0 && element.is('img')) {
    imgElement = element;
  }
  
  if (imgElement.length === 0) {
    console.log(`❌ No image found in element: ${actualSelector}`);
    return "Not found";
  }
  
  // Prioritize src attribute over other attributes
  let imageUrl = imgElement.attr('src');
  
  // Only fall back to data attributes if src is not available
  if (!imageUrl) {
    imageUrl = imgElement.attr('data-src') || imgElement.attr('data-original');
  }
  
  // Ignore onclick attributes - we want the actual image src
  console.log(`📸 Image src attribute: ${imgElement.attr('src')}`);
  console.log(`📸 Image onclick attribute: ${imgElement.attr('onclick')}`);
  
  if (!imageUrl) {
    console.log(`❌ No image URL found in element: ${actualSelector}`);
    return "Not found";
  }

  console.log(`📸 Original image URL: ${imageUrl}`);

  // Handle PHP thumbnail URLs and convert to direct image URLs
  if (imageUrl.includes('phpThumb') || imageUrl.includes('php')) {
    console.log(`🔧 PHP image detected, extracting original URL`);
    
    // Extract the original filename from PHP thumbnail URLs
    // Example: phpThumb/phpThumb.php?src=..%2Fimages%2Fitems%2Fp248_101_1Y.jpg&w=250&h=200&aoe=1&hash=d124bf9d69167f8784e724eb9bfc80f1
    const srcMatch = imageUrl.match(/src=([^&]+)/);
    if (srcMatch) {
      const encodedSrc = srcMatch[1];
      // Decode URL encoding
      const decodedSrc = decodeURIComponent(encodedSrc);
      console.log(`📝 Decoded src parameter: ${decodedSrc}`);
      
      // Remove the ".." prefix if present
      let cleanSrc = decodedSrc;
      if (decodedSrc.startsWith('..')) {
        cleanSrc = decodedSrc.substring(2);
      }
      
      // Extract domain from baseUrl for constructing direct image URL
      const urlObj = new URL(baseUrl);
      const domain = `${urlObj.protocol}//${urlObj.host}`;
      
      // Construct the direct image URL
      const directImageUrl = `${domain}${cleanSrc}`;
      console.log(`✅ Converted to direct image URL: ${directImageUrl}`);
      return directImageUrl;
    }
  }

  // For non-PHP URLs, convert relative to absolute
  const absoluteUrl = convertToAbsoluteUrl(imageUrl, baseUrl);
  console.log(`✅ Converted to absolute URL: ${absoluteUrl}`);

  return absoluteUrl;
}

module.exports = {
  scrapeProduct
}; 