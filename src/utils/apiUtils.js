/**
 * @fileoverview API Utility Functions
 * 
 * Utility functions for API calls with retry logic, error handling,
 * and performance monitoring.
 * 
 * @author UNICEF/Radial Interactive Team
 * @version 2.0.0
 */

/**
 * Retry configuration for API calls
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @param {number} multiplier - Backoff multiplier
 * @returns {number} Calculated delay in milliseconds
 */
const calculateBackoffDelay = (attempt, baseDelay, maxDelay, multiplier) => {
  const delay = baseDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
};

/**
 * Enhanced fetch function with retry logic and error handling
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} retryConfig - Retry configuration
 * @returns {Promise<Response>} Fetch response
 * @throws {Error} If all retry attempts fail
 */
export const fetchWithRetry = async (url, options = {}, retryConfig = RETRY_CONFIG) => {
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = retryConfig;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const startTime = performance.now();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log performance metrics
      console.log(`API call to ${url} completed in ${duration.toFixed(2)}ms (attempt ${attempt + 1})`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      
      console.warn(`API call attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay, backoffMultiplier);
      
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All retry attempts failed
  console.error(`API call to ${url} failed after ${maxRetries + 1} attempts:`, lastError);
  throw new Error(`Failed to fetch data after ${maxRetries + 1} attempts: ${lastError.message}`);
};

/**
 * Axios instance with retry logic
 * @param {string} url - URL to fetch
 * @param {Object} config - Axios configuration
 * @returns {Promise} Axios response
 */
export const axiosWithRetry = async (url, config = {}) => {
  const { maxRetries = RETRY_CONFIG.maxRetries, baseDelay = RETRY_CONFIG.baseDelay } = config;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const startTime = performance.now();
      
      // Import axios dynamically to avoid bundling issues
      const axios = (await import('axios')).default;
      
      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        ...config,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`API call to ${url} completed in ${duration.toFixed(2)}ms (attempt ${attempt + 1})`);
      
      return response;
    } catch (error) {
      lastError = error;
      
      console.warn(`API call attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay for next attempt
      const delay = calculateBackoffDelay(attempt, baseDelay, RETRY_CONFIG.maxDelay, RETRY_CONFIG.backoffMultiplier);
      
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All retry attempts failed
  console.error(`API call to ${url} failed after ${maxRetries + 1} attempts:`, lastError);
  throw new Error(`Failed to fetch data after ${maxRetries + 1} attempts: ${lastError.message}`);
};

/**
 * Check if error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is retryable
 */
export const isRetryableError = (error) => {
  // Network errors
  if (!error.response) {
    return true;
  }

  // HTTP status codes that are retryable
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  return retryableStatuses.includes(error.response.status);
};

/**
 * Performance monitoring for API calls
 * @param {string} operation - Operation name
 * @param {Function} apiCall - API call function
 * @returns {Promise} API call result with performance metrics
 */
export const withPerformanceMonitoring = async (operation, apiCall) => {
  const startTime = performance.now();
  
  try {
    const result = await apiCall();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Performance: ${operation} completed in ${duration.toFixed(2)}ms`);
    
    // In a real application, you might send this to an analytics service
    // analytics.track('api_performance', { operation, duration });
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.error(`Performance: ${operation} failed after ${duration.toFixed(2)}ms`);
    
    // In a real application, you might send this to an analytics service
    // analytics.track('api_error', { operation, duration, error: error.message });
    
    throw error;
  }
};
