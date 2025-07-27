# Rayspeed Stock Tracker

A full-stack stock tracking application for competitor products with web scraping capabilities.

## Features

- 🔍 **Web Scraping**: Automatically scrape product information from competitor websites
- 📊 **Stock Monitoring**: Track stock status, prices, and availability
- 🔔 **Notifications**: Slack integration for stock alerts
- 🎯 **Smart Detection**: Auto-detect product selectors or use custom ones
- 🔐 **Authentication**: User management with role-based permissions
- 📱 **Responsive UI**: Modern, mobile-friendly interface

## Railway Deployment

This application is configured to run on Railway.app. Follow these steps to deploy:

### 1. Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- Supabase project with the required database schema

### 2. Deploy to Railway

1. **Fork/Clone this repository** to your GitHub account
2. **Connect to Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Set Environment Variables**:
   - In your Railway project dashboard, go to "Variables" tab
   - Add the following environment variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
PORT=3000
NODE_ENV=production

# Authentication - Valid Users (JSON format)
VALID_USERS={"admin":{"password":"your_secure_password","role":"admin","name":"Administrator","permissions":["read","write","delete","settings","users"]}}
```

4. **Deploy**: Railway will automatically build and deploy your application

### 3. Database Setup

Make sure your Supabase database has the required `tracked_urls` table. Run the SQL from `database-setup.sql` in your Supabase SQL editor.

## Local Development

### Prerequisites

- Node.js 20.0.0 or higher
- npm or yarn
- Supabase account and project

### Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd stock-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment setup**:
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your Supabase credentials and other settings.

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Dashboard: http://localhost:3000
   - Test scraping: http://localhost:3000/api/test-scrape?url=YOUR_URL

## API Endpoints

### Products
- `GET /api/products` - Get all tracked products
- `POST /api/products` - Add new product (with automatic scraping)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/scrape` - Re-scrape product

### Testing
- `GET /api/test-scrape?url=URL` - Test scraping without saving

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout

### Notifications
- `POST /api/test-slack` - Test Slack webhook
- `POST /api/notify-slack` - Send Slack notification

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `PORT` | Server port (Railway sets this automatically) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `VALID_USERS` | JSON string of valid users and passwords | Yes |

## Database Schema

The application requires a `tracked_urls` table in Supabase with the following structure:

```sql
CREATE TABLE tracked_urls (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  product_name TEXT,
  stock_status TEXT,
  price TEXT,
  image_url TEXT,
  stock_selector TEXT,
  name_selector TEXT,
  image_selector TEXT,
  beedspeed_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue in this repository
- Contact the development team

---

**Note**: This application is configured for Railway deployment with automatic builds and deployments from your GitHub repository. 