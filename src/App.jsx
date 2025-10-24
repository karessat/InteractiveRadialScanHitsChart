import { useState, useEffect } from 'react';
import RadialScanChart from './RadialScanChart';
import PrintPage from './PrintPage';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [currentRoute, setCurrentRoute] = useState('print'); // Default to print version

  // Simple hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'print') {
        setCurrentRoute('print');
      } else {
        setCurrentRoute('interactive');
      }
    };

    // Set initial route
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToPrint = () => {
    window.location.hash = 'print';
  };

  const navigateToInteractive = () => {
    window.location.hash = '';
  };

  return (
    <ErrorBoundary>
      {currentRoute === 'print' ? (
        <PrintPage />
      ) : (
        <div className="w-full min-h-screen flex justify-center items-start py-4">
          {/* Navigation to Print Version */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={navigateToPrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Print Version
            </button>
          </div>
          
          <RadialScanChart />
        </div>
      )}
    </ErrorBoundary>
  );
}

export default App

