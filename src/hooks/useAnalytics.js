/**
 * @fileoverview Analytics and Performance Monitoring Hook
 * 
 * Custom React hook for tracking user interactions, performance metrics,
 * and application analytics.
 * 
 * @author UNICEF/Radial Interactive Team
 * @version 2.0.0
 */

// React imports
import { useEffect, useCallback, useMemo } from 'react';

/**
 * Analytics configuration
 */
const ANALYTICS_CONFIG = {
  // Enable/disable analytics in development
  enabled: import.meta.env.MODE === 'production' || import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
  
  // Analytics service endpoints (placeholder)
  endpoints: {
    events: '/api/analytics/events',
    performance: '/api/analytics/performance',
    errors: '/api/analytics/errors',
  },
  
  // Performance thresholds
  thresholds: {
    slowApiCall: 2000, // 2 seconds
    slowRender: 100, // 100ms
    largeBundle: 1000000, // 1MB
  },
};

/**
 * Custom hook for analytics and performance monitoring
 * @param {Object} options - Analytics options
 * @returns {Object} Analytics functions and utilities
 */
export const useAnalytics = (options = {}) => {
  const config = { ...ANALYTICS_CONFIG, ...options };

  /**
   * Track a custom event
   * @param {string} eventName - Name of the event
   * @param {Object} properties - Event properties
   */
  const trackEvent = useCallback((eventName, properties = {}) => {
    if (!config.enabled) {
      console.log('Analytics (disabled):', eventName, properties);
      return;
    }

    const eventData = {
      event: eventName,
      properties: {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...properties,
      },
    };

    // In a real application, you would send this to your analytics service
    console.log('Analytics Event:', eventData);
    
    // Example: Send to analytics service
    // fetch(config.endpoints.events, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(eventData),
    // }).catch(console.error);
  }, [config]);

  /**
   * Track performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  const trackPerformance = useCallback((operation, duration, metadata = {}) => {
    if (!config.enabled) {
      console.log('Performance (disabled):', operation, `${duration}ms`, metadata);
      return;
    }

    const performanceData = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      metadata: {
        slow: duration > config.thresholds.slowRender,
        ...metadata,
      },
    };

    console.log('Performance Metric:', performanceData);
    
    // In a real application, you would send this to your performance monitoring service
    // fetch(config.endpoints.performance, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(performanceData),
    // }).catch(console.error);
  }, [config]);

  /**
   * Track errors
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  const trackError = useCallback((error, context = {}) => {
    if (!config.enabled) {
      console.log('Error (disabled):', error, context);
      return;
    }

    const errorData = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context: {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context,
      },
    };

    console.error('Error Tracking:', errorData);
    
    // In a real application, you would send this to your error reporting service
    // fetch(config.endpoints.errors, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData),
    // }).catch(console.error);
  }, [config]);

  /**
   * Track user interactions
   * @param {string} interaction - Type of interaction
   * @param {Object} details - Interaction details
   */
  const trackInteraction = useCallback((interaction, details = {}) => {
    trackEvent(`user_interaction_${interaction}`, {
      category: 'user_interaction',
      ...details,
    });
  }, [trackEvent]);

  /**
   * Track page views
   * @param {string} page - Page identifier
   * @param {Object} metadata - Page metadata
   */
  const trackPageView = useCallback((page, metadata = {}) => {
    trackEvent('page_view', {
      page,
      category: 'navigation',
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Measure and track function execution time
   * @param {string} operation - Operation name
   * @param {Function} fn - Function to measure
   * @returns {Function} Wrapped function
   */
  const measureFunction = useCallback((operation, fn) => {
    return async (...args) => {
      const startTime = performance.now();
      
      try {
        const result = await fn(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        trackPerformance(operation, duration, {
          success: true,
          args: args.length,
        });
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        trackPerformance(operation, duration, {
          success: false,
          error: error.message,
        });
        
        trackError(error, {
          operation,
          context: 'function_measurement',
        });
        
        throw error;
      }
    };
  }, [trackPerformance, trackError]);

  /**
   * Track bundle size and performance
   */
  const trackBundleSize = useCallback(() => {
    if (!config.enabled) return;

    // Get bundle size information (if available)
    const bundleInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
      } : null,
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      } : null,
    };

    console.log('Bundle Performance:', bundleInfo);
  }, [config]);

  // Track initial page load
  useEffect(() => {
    if (config.enabled) {
      trackPageView('radial-scan-chart', {
        loadTime: performance.now(),
      });
      
      trackBundleSize();
    }
  }, [trackPageView, trackBundleSize, config.enabled]);

  return {
    trackEvent,
    trackPerformance,
    trackError,
    trackInteraction,
    trackPageView,
    measureFunction,
    trackBundleSize,
    isEnabled: config.enabled,
  };
};

/**
 * Hook specifically for chart interactions
 * @returns {Object} Chart-specific analytics functions
 */
export const useChartAnalytics = () => {
  const { trackEvent, isEnabled } = useAnalytics();

  // Create stable analytics functions that don't recreate on every render
  const analyticsFunctions = useMemo(() => ({
    trackDomainSelection: (domainId, domainLabel) => {
      if (!isEnabled) {
        console.log('Analytics (disabled): user_interaction_domain_selection', {
          domain_id: domainId,
          domain_label: domainLabel,
          timestamp: Date.now(),
        });
        return;
      }

      trackEvent('user_interaction_domain_selection', {
        domain_id: domainId,
        domain_label: domainLabel,
        timestamp: Date.now(),
      });
    },

    trackScanHitClick: (scanHitId, title, domains) => {
      if (!isEnabled) {
        console.log('Analytics (disabled): user_interaction_scan_hit_click', {
          scan_hit_id: scanHitId,
          title: title.substring(0, 50),
          domain_count: domains.length,
          domains: domains,
        });
        return;
      }

      trackEvent('user_interaction_scan_hit_click', {
        scan_hit_id: scanHitId,
        title: title.substring(0, 50), // Truncate for privacy
        domain_count: domains.length,
        domains: domains,
      });
    },

    trackChartRender: (renderTime, scanHitCount) => {
      // Only track if we have meaningful data and haven't tracked recently
      if (renderTime <= 0 || scanHitCount <= 0) return;

      if (!isEnabled) {
        console.log('Analytics (disabled): performance_chart_render', {
          render_time: renderTime,
          scan_hit_count: scanHitCount,
          component: 'RadialScanChart',
        });
        return;
      }

      trackEvent('performance_chart_render', {
        render_time: renderTime,
        scan_hit_count: scanHitCount,
        component: 'RadialScanChart',
      });
    }
  }), [trackEvent, isEnabled]);

  return {
    trackDomainSelection: analyticsFunctions.trackDomainSelection,
    trackScanHitClick: analyticsFunctions.trackScanHitClick,
    trackChartRender: analyticsFunctions.trackChartRender,
  };
};
