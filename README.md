# Interactive Radial Scan Hits Chart

An interactive radial chart visualization built with React and SVG, designed to display scan hit data from AITable.

## Features

- 🎯 Custom-built radial chart using pure SVG (no chart libraries)
- ⚡ Built with React + Vite for fast development
- 🔄 Real-time data integration with AITable API
- 🎨 Interactive visualizations with hover and click events
- 🪶 Minimal dependencies, lean codebase

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Add your AITable credentials:
     ```
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

## Project Structure

```
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   ├── App.css          # Application styles
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML entry point
└── vite.config.js       # Vite configuration
```

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **SVG** - For chart rendering (no external chart libraries)
- **AITable API** - Data source

## License

MIT License - see LICENSE file for details
