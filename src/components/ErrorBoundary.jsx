/**
 * @fileoverview Error Boundary Component
 * 
 * A React Error Boundary component that catches JavaScript errors anywhere in the
 * component tree and displays a fallback UI instead of crashing the entire app.
 * 
 * @author UNICEF/Radial Interactive Team
 * @version 2.0.0
 */

// React imports
import { Component } from 'react';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in component trees and provides fallback UI.
 * Logs errors for debugging and provides user-friendly error messages.
 * 
 * @class ErrorBoundary
 * @extends {Component}
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  /**
   * Static method to update state when an error occurs
   * @param {Error} error - The error that occurred
   * @returns {Object} New state object
   */
  static getDerivedStateFromError(error) {
    // Generate a unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  /**
   * Lifecycle method called when an error occurs
   * @param {Error} error - The error that occurred
   * @param {Object} errorInfo - Additional error information
   */
  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    this.setState({
      errorInfo,
    });

    // In a real application, you might want to send this to an error reporting service
    // this.reportError(error, errorInfo);
  }

  /**
   * Reset the error boundary state
   */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  /**
   * Report error to external service (placeholder)
   * @param {Error} error - The error that occurred
   * @param {Object} errorInfo - Additional error information
   */
  reportError = (error, errorInfo) => {
    // Placeholder for error reporting service integration
    // Examples: Sentry, LogRocket, Bugsnag, etc.
    console.log('Error reported:', { error, errorInfo, errorId: this.state.errorId });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              We're sorry, but something unexpected happened. The chart couldn't load properly.
            </p>

            {/* Error Details (Development Only) */}
            {import.meta.env.MODE === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-32">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                  <div className="mt-2 text-gray-600">
                    Error ID: {this.state.errorId}
                  </div>
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Reload Page
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 mt-4">
              If the problem persists, please contact support with Error ID: {this.state.errorId}
            </p>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
