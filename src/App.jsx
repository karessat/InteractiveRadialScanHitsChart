import RadialScanChart from './RadialScanChart';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen flex justify-center items-start py-4">
        <RadialScanChart />
      </div>
    </ErrorBoundary>
  );
}

export default App

