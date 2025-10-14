# Deployment Guide

## Heroku Deployment

This project is now Heroku-ready! Here's how to deploy it:

### Prerequisites
1. Heroku CLI installed
2. Git repository set up
3. AITable API credentials

### Deployment Steps

1. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set VITE_AITABLE_TOKEN=your_aitable_token_here
   heroku config:set VITE_SCAN_HITS_DATASHEET_ID=your_datasheet_id_here
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### Alternative Deployment Options

#### Vercel (Recommended for Static Sites)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

#### Netlify
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Build command: `npm run build`
4. Publish directory: `dist`

### Environment Variables Required
- `VITE_AITABLE_TOKEN`: Your AITable API token
- `VITE_SCAN_HITS_DATASHEET_ID`: Your AITable datasheet ID

### Build Information
- **Build Command**: `npm run build`
- **Start Command**: `npm start` (builds and serves with `serve`)
- **Output Directory**: `dist`
- **Node Version**: >=16.0.0
- **Static Assets**: All assets are properly bundled and optimized
- **Production Server**: Uses `serve` package for optimal static file serving
- **Build Dependencies**: Vite and related build tools are in production dependencies for Heroku compatibility

### Performance Optimizations Included
- Code splitting with vendor chunks
- CSS optimization with Tailwind
- Image optimization
- Gzip compression
- Terser minification
