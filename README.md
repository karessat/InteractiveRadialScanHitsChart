# Interactive Radial Scan Hits Chart

An interactive radial chart visualization built with React and SVG, designed to display scan hit data from AITable. Features advanced text positioning algorithms for uniform spacing and optimized performance.

## ✨ Features

- 🎯 **Custom-built radial chart** using pure SVG (no external chart libraries)
- ⚡ **High Performance** - Optimized with React hooks, memoization, and efficient rendering
- 🔄 **Real-time data integration** with AITable API
- 🎨 **Interactive visualizations** with hover effects, click events, and smooth transitions
- 📐 **Precise text positioning** - Advanced algorithms for uniform spacing around the circle
- 🪶 **Minimal dependencies** - Lean, efficient codebase
- ♿ **Accessible design** - Keyboard navigation and screen reader support
- 📱 **Responsive layout** - Works on all screen sizes

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Add your AITable credentials:
     ```env
     VITE_AITABLE_TOKEN=your_token_here
     VITE_SCAN_HITS_DATASHEET_ID=your_datasheet_id_here
     ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## Build

To create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## 🛠️ Development Commands

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check
```

### Build & Cleanup
```bash
# Clean build artifacts and cache
npm run clean

# Build for production with optimizations
npm run build
```

## 🏗️ Project Structure

```
├── src/
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Application entry point
│   ├── RadialScanChart.jsx  # Main chart component (optimized)
│   └── index.css            # Global styles with Tailwind
├── graphics/
│   └── mapofafrica.png      # Central Africa map image
├── public/
│   └── vite.svg             # Vite logo
├── .env                     # Environment variables (create from .env.example)
├── .env.example             # Environment template
├── index.html               # HTML entry point
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Tailwind CSS configuration
├── vite.config.js           # Vite build configuration
└── README.md                # This file
```

## 🛠️ Technology Stack

- **React 18** - Modern UI framework with hooks and concurrent features
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework for rapid styling
- **SVG** - Pure SVG rendering for crisp, scalable charts
- **Axios** - HTTP client for API requests
- **AITable API** - Real-time data source integration

## 🚀 Performance Optimizations

This project includes several performance optimizations:

- **React.useCallback** - Prevents unnecessary re-renders of event handlers
- **React.useMemo** - Memoizes expensive calculations
- **Dynamic text positioning** - Advanced algorithms for uniform spacing
- **Two-pass rendering** - Measures and adjusts text positioning for precision
- **Efficient state management** - Optimized state updates and transitions

## 🎨 Key Features Explained

### Dynamic Text Positioning
The chart uses advanced algorithms to ensure all scan hit labels are uniformly spaced around the outer circle:
- **Continuous angle-based adjustments** - Smooth positioning across all quadrants
- **Bounding box measurement** - Precise text dimension calculation
- **Micro-adjustments** - Fine-tuned spacing for perfect visual alignment

### Interactive Domain Filtering
- Click any domain ring to filter scan hits
- Hover effects for visual feedback
- Clear selection button for easy navigation

## License

MIT License - see LICENSE file for details
