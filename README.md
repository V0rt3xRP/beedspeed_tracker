# 🚀 Rayspeed Stock Tracker

A full-stack web application for tracking competitor product availability in real-time using web scraping and Supabase.

## ✨ Features

- **Add competitor product URLs** to track
- **Custom CSS selectors** for stock status, product name, and images
- **Real-time web scraping** using Cheerio
- **Beautiful dashboard** with modern UI
- **CRUD operations** - Create, Read, Update, Delete products
- **Individual and bulk refresh** capabilities
- **Responsive design** for all devices
- **Toast notifications** for user feedback
- **Error handling** and graceful fallbacks

## 🛠 Tech Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Web Scraping**: Cheerio + Axios
- **Frontend**: Vanilla JavaScript + HTML + CSS
- **Styling**: Modern CSS with gradients and animations

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd stock-tracker
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project dashboard
3. Navigate to **SQL Editor**
4. Run the following SQL to create the required table:

```sql
CREATE TABLE tracked_urls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    product_name TEXT,
    image_url TEXT,
    stock_status TEXT,
    stock_selector TEXT NOT NULL,
    name_selector TEXT NOT NULL,
    image_selector TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE tracked_urls ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for development)
CREATE POLICY "Allow all operations" ON tracked_urls FOR ALL USING (true);
```

### 3. Configure Environment Variables

1. Copy the environment example file:
```bash
cp env.example .env
```

2. Edit `.env` and add your Supabase credentials:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3000
NODE_ENV=development
```

You can find these values in your Supabase project settings under **API**.

### 4. Start the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## 📖 Usage Guide

### Adding a New Product

1. **Find the product URL** you want to track
2. **Inspect the page** to find CSS selectors for:
   - Stock status (e.g., `.availability`, `#stock-status`)
   - Product name (e.g., `.product-title`, `h1`)
   - Product image (e.g., `.product-image img`, `.main-image`)
3. **Fill out the form** with the URL and selectors
4. **Click "Add Product"** - the system will automatically scrape the data

### CSS Selector Examples

| Element | Example Selectors |
|---------|-------------------|
| Stock Status | `.availability`, `#stock-status`, `.stock-indicator` |
| Product Name | `.product-title`, `h1`, `.item-name` |
| Product Image | `.product-image img`, `.main-image`, `img[alt*="product"]` |

### Managing Products

- **Refresh**: Click the "Refresh" button to re-scrape a single product
- **Edit**: Modify URL or selectors for better data extraction
- **Delete**: Remove products you no longer want to track
- **Refresh All**: Update all products at once

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | Get all tracked products |
| `POST` | `/api/products` | Add new product |
| `PUT` | `/api/products/:id` | Update product |
| `DELETE` | `/api/products/:id` | Delete product |
| `POST` | `/api/products/:id/scrape` | Re-scrape product data |

## 📁 Project Structure

```
stock-tracker/
├── public/                 # Frontend files
│   ├── index.html         # Main dashboard
│   ├── styles.css         # Styling
│   └── script.js          # Frontend logic
├── services/              # Backend services
│   ├── database.js        # Supabase operations
│   └── scraper.js         # Web scraping logic
├── server.js              # Express server
├── package.json           # Dependencies
├── env.example            # Environment template
└── README.md              # This file
```

## 🎨 Features in Detail

### Web Scraping
- Uses **Cheerio** for HTML parsing
- Supports **CSS selectors** (classes, IDs, attributes)
- Handles **relative URLs** automatically
- **Error handling** with fallback values
- **User-Agent** spoofing to avoid blocks

### Database
- **Supabase** PostgreSQL backend
- **UUID** primary keys
- **Timestamps** for tracking updates
- **Row Level Security** ready

### Frontend
- **Responsive design** for mobile and desktop
- **Real-time updates** without page refresh
- **Modal dialogs** for edit/delete operations
- **Toast notifications** for user feedback
- **Loading states** and error handling

## 🚨 Troubleshooting

### Common Issues

1. **"Not found" values**: Check your CSS selectors - they might be incorrect
2. **Scraping fails**: Some sites block automated requests - try different selectors
3. **Database connection**: Verify your Supabase credentials in `.env`
4. **CORS errors**: The server includes CORS middleware for cross-origin requests

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## 🔒 Security Considerations

- **Environment variables** for sensitive data
- **Input validation** on all endpoints
- **Error handling** to prevent information leakage
- **Rate limiting** recommended for production
- **HTTPS** required for production deployment

## 🚀 Deployment

### Heroku
```bash
# Add Heroku remote
heroku create your-app-name

# Set environment variables
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_ANON_KEY=your_key

# Deploy
git push heroku main
```

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section
2. Review the console logs for errors
3. Verify your Supabase configuration
4. Open an issue with detailed error information

---

**Built with ❤️ by Rayspeed Team** 