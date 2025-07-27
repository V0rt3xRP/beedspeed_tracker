const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { scrapeProduct } = require('./services/scraper');
const { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getProductById 
} = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// GET /api/products - Get all tracked products
app.get('/api/products', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/products - Add new product (automatic scraping)
app.post('/api/products', async (req, res) => {
  try {
    const { url, stock_selector, name_selector, image_selector, beedspeed_code } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing required field: url' 
      });
    }

    // Scrape the product data automatically
    const scrapedData = await scrapeProduct(url, stock_selector, name_selector, image_selector);
    
    // Create product in database with scraped data
    const product = await createProduct({
      url,
      stock_selector: stock_selector || 'auto-detected',
      name_selector: name_selector || 'auto-detected',
      image_selector: image_selector || 'auto-detected',
      beedspeed_code: beedspeed_code || null,
      ...scrapedData
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id - Edit product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { url, stock_selector, name_selector, image_selector, beedspeed_code } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing required field: url' 
      });
    }

    // Scrape the product data with new selectors (or auto-detect if not provided)
    const scrapedData = await scrapeProduct(url, stock_selector, name_selector, image_selector);
    
    // Update product in database
    const product = await updateProduct(id, {
      url,
      stock_selector: stock_selector || 'auto-detected',
      name_selector: name_selector || 'auto-detected',
      image_selector: image_selector || 'auto-detected',
      beedspeed_code: beedspeed_code || null,
      ...scrapedData
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteProduct(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/products/:id/scrape - Re-scrape product
app.post('/api/products/:id/scrape', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get product from database
    const product = await getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Re-scrape the product using stored selectors or auto-detect
    const scrapedData = await scrapeProduct(
      product.url, 
      product.stock_selector !== 'auto-detected' ? product.stock_selector : null,
      product.name_selector !== 'auto-detected' ? product.name_selector : null,
      product.image_selector !== 'auto-detected' ? product.image_selector : null
    );
    
    // Update product with new scraped data
    const updatedProduct = await updateProduct(id, scrapedData);
    
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error re-scraping product:', error);
    res.status(500).json({ error: 'Failed to re-scrape product' });
  }
});

// GET /api/test-scrape - Test scraping without saving to database
app.get('/api/test-scrape', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing required query parameter: url' 
      });
    }

    console.log(`🧪 Testing scrape for: ${url}`);
    
    // Test scrape without saving
    const scrapedData = await scrapeProduct(url);
    
    res.json({
      success: true,
      url: url,
      scraped_data: scrapedData,
      message: 'Test scrape completed successfully'
    });
  } catch (error) {
    console.error('Error in test scrape:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Test scrape failed'
    });
  }
});

// POST /api/settings - Save settings
app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Save settings to database (you can create a settings table)
    // For now, we'll just return success
    console.log('Settings saved:', settings);
    
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// POST /api/test-slack - Test Slack webhook
app.post('/api/test-slack', async (req, res) => {
  try {
    const { webhook, channel, message } = req.body;
    
    if (!webhook) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const slackMessage = {
      text: message || '🧪 Test notification from Stock Tracker!',
      channel: channel || '#general'
    };

    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    });

    if (response.ok) {
      res.json({ message: 'Slack notification sent successfully' });
    } else {
      const errorText = await response.text();
      res.status(400).json({ error: `Slack API error: ${errorText}` });
    }
  } catch (error) {
    console.error('Error testing Slack webhook:', error);
    res.status(500).json({ error: 'Failed to test Slack webhook' });
  }
});

// POST /api/notify-slack - Send Slack notification
app.post('/api/notify-slack', async (req, res) => {
  try {
    const { webhook, channel, product, event } = req.body;
    
    if (!webhook) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    let message = '';
    let color = '#36a64f'; // Green

    switch (event) {
      case 'out_of_stock':
        message = `🚨 *Product Out of Stock*\n*${product.product_name}* is now out of stock!`;
        color = '#ff0000'; // Red
        break;
      case 'back_in_stock':
        message = `✅ *Product Back in Stock*\n*${product.product_name}* is back in stock!`;
        color = '#36a64f'; // Green
        break;
      case 'price_change':
        message = `💰 *Price Change*\n*${product.product_name}* price has changed!`;
        color = '#ffa500'; // Orange
        break;
      default:
        message = `ℹ️ *Product Update*\n*${product.product_name}* has been updated.`;
        color = '#0000ff'; // Blue
    }

    const slackMessage = {
      attachments: [{
        color: color,
        text: message,
        fields: [
          {
            title: 'Product Name',
            value: product.product_name || 'Unknown',
            short: true
          },
          {
            title: 'Stock Status',
            value: product.stock_status || 'Unknown',
            short: true
          },
          {
            title: 'Product Code',
            value: product.product_code || 'N/A',
            short: true
          },
          {
            title: 'Last Updated',
            value: new Date(product.updated_at).toLocaleString(),
            short: true
          }
        ],
        actions: [
          {
            type: 'button',
            text: 'View Product',
            url: product.url,
            style: 'primary'
          }
        ]
      }],
      channel: channel || '#general'
    };

    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(slackMessage)
    });

    if (response.ok) {
      res.json({ message: 'Slack notification sent successfully' });
    } else {
      const errorText = await response.text();
      res.status(400).json({ error: `Slack API error: ${errorText}` });
    }
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    res.status(500).json({ error: 'Failed to send Slack notification' });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get valid users from environment variable
    let validUsers = {};
    try {
      if (process.env.VALID_USERS) {
        validUsers = JSON.parse(process.env.VALID_USERS);
      } else {
        // Fallback for development
        validUsers = {
          'admin': {
            password: 'admin123',
            role: 'admin',
            name: 'Administrator',
            permissions: ['read', 'write', 'delete', 'settings', 'users']
          }
        };
      }
    } catch (error) {
      console.error('Error parsing VALID_USERS environment variable:', error);
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const user = validUsers[username];
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Return user data (without password)
    const userData = {
      username: username,
      role: user.role,
      name: user.name,
      permissions: user.permissions
    };

    res.json({ 
      success: true, 
      user: userData,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
app.get('/api/auth/me', async (req, res) => {
  try {
    // In production, this would validate a JWT token
    // For now, we'll return a placeholder
    res.json({ 
      message: 'Authentication endpoint - implement JWT validation in production'
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', async (req, res) => {
  try {
    // In production, this would invalidate the JWT token
    res.json({ 
      success: true, 
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rayspeed Stock Tracker server running on port ${PORT}`);
  console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
  console.log(`🧪 Test scraping endpoint: http://localhost:${PORT}/api/test-scrape?url=YOUR_URL`);
}); 