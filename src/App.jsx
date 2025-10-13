import RadialScanChart from './RadialScanChart';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen flex justify-center items-center">
        <RadialScanChart />
      </div>
    </ErrorBoundary>
  );
}

export default App

