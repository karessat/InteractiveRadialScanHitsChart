import RadialScanChart from './RadialScanChart';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen flex justify-center items-start sm:items-center py-4 sm:py-0">
        <RadialScanChart />
      </div>
    </ErrorBoundary>
  );
}

export default App

