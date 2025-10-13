/**
 * @fileoverview Interactive Radial Scan Hits Chart Component
 * 
 * A React component that displays an interactive radial visualization of education
 * domain scan hits data from AITable. Features dynamic text positioning, domain
 * filtering, and real-time data integration.
 * 
 * @author UNICEF/Radial Interactive Team
 * @version 2.0.0
 */

// React imports
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Third-party imports
import axios from 'axios';

// Utility imports
import { axiosWithRetry, withPerformanceMonitoring } from './utils/apiUtils';
import { useChartAnalytics } from './hooks/useAnalytics';

const CONFIG = {
  centerX: 1500,
  centerY: 1500,
  domainRadii: {
    'teaching-learning': 225,
    'equity-access': 300,
    'curriculum-reform': 375,
    'education-society': 450,
    'technology-digital': 525,
    'investment-governance': 600,
    'teacher-empowerment': 675
  },
  scanHitRadius: 825, // This is the radius of the outermost ring
  ringColor: '#d1d5db',
  ringWidth: 1.5,
  positioning: {
    desiredGap: 3,
    baseOffset: 75,
    microAdjustment: 2.5,
    measurementDelay: 100
  }
};

const DOMAIN_NAME_MAPPING = {
  // Standardized domain mappings - exact match to AITable values
  'teaching & learning models': 'teaching-learning',
  'equity & access': 'equity-access',
  'curriculum reform': 'curriculum-reform',
  'education & society': 'education-society',
  'technology & digital learning': 'technology-digital',
  'investment & governance': 'investment-governance',
  'teacher empowerment': 'teacher-empowerment',
};

const DOMAIN_LABELS = [
  { id: 'teaching-learning', label: 'Teaching & Learning Models' },
  { id: 'equity-access', label: 'Equity & Access' },
  { id: 'curriculum-reform', label: 'Curriculum Reform' },
  { id: 'education-society', label: 'Education & Society' },
  { id: 'technology-digital', label: 'Technology & Digital Learning' },
  { id: 'investment-governance', label: 'Investment & Governance' },
  { id: 'teacher-empowerment', label: 'Teacher Empowerment' }
];

/**
 * Converts polar coordinates to cartesian coordinates
 * @param {number} centerX - X coordinate of the center point
 * @param {number} centerY - Y coordinate of the center point
 * @param {number} radius - Distance from center
 * @param {number} angleInDegrees - Angle in degrees (0-360)
 * @returns {Object} Object with x and y cartesian coordinates
 */
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

/**
 * Calculates precise text positioning for radial chart labels
 * Uses continuous angle-based micro-adjustments for uniform spacing
 * @param {Object} bbox - Text bounding box from getBBox()
 * @param {number} angle - Angle in degrees (0-360)
 * @param {number} baseOffset - Base offset from proven positioning approach
 * @returns {Object} Object with x and y coordinates for text positioning
 */
const calculateTextPosition = (bbox, angle, baseOffset = CONFIG.positioning.baseOffset) => {
  const angleInRadians = (angle * Math.PI) / 180;
  const rotationFactor = Math.abs(Math.sin(angleInRadians * 2)); // Double frequency for 360° coverage
  const baselineShift = rotationFactor * CONFIG.positioning.microAdjustment;
  
  const textHalfWidth = bbox.width / 2;
  const adjustedRadius = CONFIG.scanHitRadius + CONFIG.positioning.desiredGap - baseOffset + textHalfWidth - baselineShift;
  
  return polarToCartesian(CONFIG.centerX, CONFIG.centerY, adjustedRadius, angle);
};


/**
 * Fetches scan hits data from AITable API with retry logic
 * @returns {Promise<Array>} Array of raw records from AITable
 * @throws {Error} If API request fails after all retry attempts
 */
const fetchScanHits = async () => {
  const url = `https://api.aitable.ai/fusion/v1/datasheets/${import.meta.env.VITE_SCAN_HITS_DATASHEET_ID}/records`;
  const config = {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_AITABLE_TOKEN}`
    }
  };

  return withPerformanceMonitoring('fetchScanHits', async () => {
    const response = await axiosWithRetry(url, config);
    return response.data.data.records;
  });
};

/**
 * Transforms raw AITable records into structured scan hit objects
 * @param {Array} records - Raw records from AITable
 * @returns {Array} Array of transformed scan hit objects
 */
const transformData = (records) => {
  return records.map(record => {
    // Get the domain string and split by pipe (|) if multiple domains
    const domainString = record.fields['Domain'] || '';
    // Split by pipe and trim all whitespace (handles spaces before/after pipe)
    const domainNames = domainString.split('|').map(d => d.trim()).filter(d => d.length > 0);
    
    // Map each domain name to its CONFIG key
    const domains = domainNames
      .map(name => {
        const normalizedName = name.toLowerCase();
        const mappedDomain = DOMAIN_NAME_MAPPING[normalizedName];
        
        if (!mappedDomain) {
          console.warn(`Unknown domain name: "${name}" - skipping`);
          return null;
        }
        return mappedDomain;
      })
      .filter(d => d !== null); // Remove any unmapped domains
    
    return {
      id: record.fields['ID'],
      title: record.fields['Title'],
      description: record.fields['English Description'],
      domains: domains,
      date: record.fields['Horizon'],
      source: record.fields['Link'],
      recNumber: record.fields['RecNumber'],
    };
  });
};

/**
 * Interactive Radial Scan Hits Chart Component
 * 
 * Displays an interactive radial visualization of education domain scan hits data.
 * Features include:
 * - Dynamic text positioning with uniform spacing around the outer ring
 * - Interactive domain selection and filtering
 * - Real-time data fetching from AITable API
 * - Responsive design with hover effects and transitions
 * 
 * @returns {JSX.Element} The rendered radial chart component
 */
function RadialScanChart() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [scanHits, setScanHits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredDomain, setHoveredDomain] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [focusedScanHit, setFocusedScanHit] = useState(null);
  const [selectedScanHit, setSelectedScanHit] = useState(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // State for dynamic positioning
  const [labelPositions, setLabelPositions] = useState({});
  const textRefs = useRef({});
  const performanceTrackedRef = useRef(false);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);

  // Analytics hook
  const { trackDomainSelection, trackScanHitClick, trackChartRender } = useChartAnalytics();

  // Debug logging utility
  const debugLog = useCallback((message, data) => {
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_DEBUG_LOGGING === 'true') {
      console.log(`[RadialScanChart] ${message}`, data);
    }
  }, []);

  // ============================================================================
  // OPTIMIZED EVENT HANDLERS & MEMOIZATION
  // ============================================================================
  const handleDomainClick = useCallback((domainId) => {
    const domainLabel = DOMAIN_LABELS.find(d => d.id === domainId)?.label;
    const isSelecting = selectedDomain !== domainId;
    
    debugLog('Domain clicked', { 
      domainId, 
      domainLabel, 
      isSelecting,
      previousFocus: focusedScanHit,
      previousDomain: selectedDomain 
    });
    
    // Clear any focused scan hit when clicking domain rings
    setFocusedScanHit(null);
    
    setSelectedDomain(prev => prev === domainId ? null : domainId);
    
    // Track analytics
    if (isSelecting) {
      trackDomainSelection(domainId, domainLabel);
    }
  }, [selectedDomain, trackDomainSelection, focusedScanHit, debugLog]);

  const clearSelection = useCallback(() => {
    setSelectedDomain(null);
    setFocusedScanHit(null);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedScanHit(null);
  }, []);

  const handleScanHitClick = useCallback((scanHit, index) => {
    const scanHitId = scanHit.id || index;
    
    debugLog('Scan hit clicked', { 
      scanHitId, 
      title: scanHit.title, 
      previousSelection: selectedScanHit?.id,
      domains: scanHit.domains 
    });
    
    // Set the selected scan hit to show in modal
    setSelectedScanHit(scanHit);
    
    // Track analytics
    trackScanHitClick(scanHitId, scanHit.title, scanHit.domains);
  }, [trackScanHitClick, selectedScanHit, debugLog]);

  // Memoize domain labels lookup to avoid recalculation on every render
  const selectedDomainLabel = useMemo(() => {
    return selectedDomain ? DOMAIN_LABELS.find(d => d.id === selectedDomain)?.label : null;
  }, [selectedDomain]);

  const hoveredDomainLabel = useMemo(() => {
    return hoveredDomain ? DOMAIN_LABELS.find(d => d.id === hoveredDomain)?.label : null;
  }, [hoveredDomain]);

  // ============================================================================
  // EFFECTS & DATA LOADING
  // ============================================================================
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const records = await fetchScanHits();
        const transformed = transformData(records);
        setScanHits(transformed);
        setError(null);
        console.log('Fetched scan hits:', transformed);
        console.log('Total records:', transformed.length);
        console.log('Sample record:', transformed[0]);
      } catch (err) {
        setError('Failed to load scan hits. Please check your API credentials.');
        console.error('Full error:', err);
      } finally {
        setLoading(false);
        setHasInitiallyLoaded(true);
      }
    };
    
    loadData();
  }, []);

  // Two-pass positioning effect - measure and adjust after initial render
  useEffect(() => {
    if (scanHits.length === 0) return;
    
    // Small delay to ensure DOM is rendered
    const timeoutId = setTimeout(() => {
      const currentTime = performance.now();
      
      // Only track if enough time has passed since last render (throttling)
      if (currentTime - lastRenderTimeRef.current > 100) {
        const renderStartTime = performance.now();
        const newPositions = {};
        
        scanHits.forEach((scanHit, index) => {
          const textElement = textRefs.current[`text-${index}`];
          if (textElement) {
            try {
              // Measure actual text dimensions and calculate precise position
              const bbox = textElement.getBBox();
              const angle = (index / scanHits.length) * 360;
              const position = calculateTextPosition(bbox, angle);
              
              newPositions[index] = position;
            } catch (error) {
              // Fallback to original positioning if measurement fails
              const angle = (index / scanHits.length) * 360;
              const adjustedRadius = (CONFIG.scanHitRadius + CONFIG.positioning.desiredGap) - CONFIG.positioning.baseOffset;
              const position = polarToCartesian(
                CONFIG.centerX,
                CONFIG.centerY,
                adjustedRadius,
                angle
              );
              newPositions[index] = position;
            }
          }
        });
        
        setLabelPositions(newPositions);
        
        // Track chart render performance only once per data load
        if (renderCountRef.current === 0) {
          const renderEndTime = performance.now();
          const renderTime = renderEndTime - renderStartTime;
          trackChartRender(renderTime, scanHits.length);
          renderCountRef.current++;
        }
        
        lastRenderTimeRef.current = currentTime;
      }
    }, CONFIG.positioning.measurementDelay);
    
    return () => clearTimeout(timeoutId);
  }, [scanHits, trackChartRender]);

  // ESC key listener for closing modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && selectedScanHit) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedScanHit, closeModal]);

  // Click outside modal to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectedScanHit && !event.target.closest('.modal-panel')) {
        closeModal();
      }
    };

    if (selectedScanHit) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [selectedScanHit, closeModal]);

  // ============================================================================
  // CONDITIONAL RENDERING
  // ============================================================================
  if (loading && !hasInitiallyLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          {/* Enhanced loading spinner */}
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse h-6 w-6 bg-blue-600 rounded-full"></div>
            </div>
          </div>
          
          {/* Loading messages */}
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Futures Data</h2>
          <p className="text-gray-600 mb-4">Fetching scan hits from AITable...</p>
          
          {/* Progress indicators */}
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center justify-center">
              <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
              Connecting to API
            </div>
            <div className="flex items-center justify-center">
              <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full mr-2" style={{ animationDelay: '0.2s' }}></div>
              Processing data
            </div>
            <div className="flex items-center justify-center">
              <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full mr-2" style={{ animationDelay: '0.4s' }}></div>
              Preparing visualization
            </div>
          </div>
          
          {/* Accessibility */}
          <div className="sr-only" role="status" aria-live="polite">
            Loading scan hits data from AITable API. Please wait.
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          {/* Error icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg
              className="h-8 w-8 text-red-600"
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
          
          {/* Error messages */}
          <h2 className="text-xl font-semibold text-red-800 mb-2">Unable to Load Data</h2>
          <p className="text-red-600 mb-4">{error}</p>
          
          {/* Retry button */}
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Retry Loading
          </button>
          
          {/* Help text */}
          <p className="text-sm text-gray-500 mt-4">
            If the problem persists, please check your internet connection and API credentials.
          </p>
          
          {/* Accessibility */}
          <div className="sr-only" role="alert" aria-live="assertive">
            Error loading data: {error}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="w-full max-w-[2000px] mx-auto bg-white rounded-lg shadow-md relative">
      {/* Integrated Header */}
      <header className="text-center p-4 pb-2">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Futures Scanning Data</h1>
        <p className="text-base text-gray-600">Interactive radial visualization of education domains</p>
        <p className="text-sm text-gray-500 mt-2">
          Use your mouse or keyboard to interact with the chart. Click on domain labels or scan hit dots to filter scan hits.
        </p>
      </header>
      
      {/* Clear Selection Button */}
      {selectedDomain && (
        <button
          onClick={clearSelection}
          className="absolute top-8 right-8 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          aria-label={`Clear selection of ${selectedDomainLabel} domain`}
        >
          Clear Selection
        </button>
      )}
      
      {/* Chart Container */}
      <div className="p-4 pt-2 flex justify-center items-center">
        <svg 
          viewBox="0 0 3000 3000" 
          className="max-w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-labelledby="chart-title chart-description"
          aria-describedby="chart-instructions"
        >
          {/* Hidden descriptive text for screen readers */}
          <title id="chart-title">Interactive Radial Scan Hits Chart</title>
          <desc id="chart-description">
            A radial chart showing education domain scan hits data. The chart displays seven concentric circles representing different education domains, with scan hit labels positioned around the outer perimeter. Each scan hit can belong to multiple domains.
          </desc>
          <desc id="chart-instructions">
            Use your mouse to click on domain labels or scan hit dots to filter and interact with the chart elements.
          </desc>

          {/* Concentric circles for each domain */}
          {DOMAIN_LABELS.map((domain) => {
            const radius = CONFIG.domainRadii[domain.id];
            const isSelected = selectedDomain === domain.id;
            const isOtherSelected = selectedDomain && selectedDomain !== domain.id;
            
            let strokeColor = CONFIG.ringColor;
            let strokeWidth = CONFIG.ringWidth;
            let opacity = 1.0;
            
            if (isSelected) {
              strokeColor = '#374151';
              strokeWidth = 3;
              opacity = 1.0;
            } else if (isOtherSelected) {
              opacity = 0.3;
            }
            
            return (
              <circle
                key={domain.id}
                cx={CONFIG.centerX}
                cy={CONFIG.centerY}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Map of Africa in the center */}
          <image
            href="/graphics/mapofafrica.png"
            x={CONFIG.centerX - 150}
            y={CONFIG.centerY - 150}
            width={300}
            height={300}
            className="transition-all duration-300"
            role="img"
            aria-label="Map of Africa silhouette"
            alt="Central map of Africa showing the geographic focus of the education domain data"
          />

          {/* Domain labels positioned between rings at the bottom center (180 degrees) */}
          {DOMAIN_LABELS.map((domain, index) => {
            // Calculate the midpoint between the previous ring and this domain's ring
            let previousRadius;
            if (index === 0) {
              // First label: between black center circle (75px radius) and first ring
              previousRadius = 75;
            } else {
              // Use the previous domain's radius
              const previousDomainId = DOMAIN_LABELS[index - 1].id;
              previousRadius = CONFIG.domainRadii[previousDomainId];
            }
            
            const currentRadius = CONFIG.domainRadii[domain.id];
            
            // Position label at the midpoint between previous ring and current ring
            const labelRadius = previousRadius + (currentRadius - previousRadius) / 2;
            
            const position = polarToCartesian(
              CONFIG.centerX, 
              CONFIG.centerY, 
              labelRadius, 
              180
            );
            
            // Split long labels into multiple lines
            const splitLabel = domain.label.split(' ');
            const midPoint = Math.ceil(splitLabel.length / 2);
            const line1 = splitLabel.slice(0, midPoint).join(' ');
            const line2 = splitLabel.slice(midPoint).join(' ');
            
            // Determine visual state based on selection
            const isSelected = selectedDomain === domain.id;
            const isOtherSelected = selectedDomain && selectedDomain !== domain.id;
            
            let opacity = 1.0;
            let fontWeight = 'normal';
            
            if (isSelected) {
              opacity = 1.0;
              fontWeight = 'bold';
            } else if (isOtherSelected) {
              opacity = 0.3;
            }
            
            return (
              <g key={`label-${domain.id}`}>
                <text
                  x={position.x}
                  y={position.y - 3}
                  fontSize="20"
                  fill="#374151"
                  textAnchor="middle"
                  opacity={opacity}
                  fontWeight={fontWeight}
                  className="cursor-pointer transition-all duration-300 select-none hover:fill-gray-800 hover:font-semibold focus:outline-none focus:fill-blue-600 focus:font-semibold"
                  onMouseEnter={() => setHoveredDomain(domain.id)}
                  onMouseLeave={() => setHoveredDomain(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDomainClick(domain.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDomainClick(domain.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${domain.label} domain`}
                  aria-pressed={selectedDomain === domain.id}
                >
                  {line1}
                </text>
                {line2 && (
                  <text
                    x={position.x}
                    y={position.y + 25}
                    fontSize="20"
                    fill="#374151"
                    textAnchor="middle"
                    opacity={opacity}
                    fontWeight={fontWeight}
                    className="cursor-pointer transition-all duration-300 select-none hover:fill-gray-800 hover:font-semibold"
                    onMouseEnter={() => setHoveredDomain(domain.id)}
                    onMouseLeave={() => setHoveredDomain(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDomainClick(domain.id);
                    }}
                    aria-hidden="true"
                  >
                    {line2}
                  </text>
                )}
              </g>
            );
          })}

          {/* Domain dots - show which domains each scan hit belongs to */}
          <g id="domain-dots">
            {scanHits.map((scanHit, index) => {
              // Calculate the same angle as the scan hit label
              const angle = (index / scanHits.length) * 360;
              
              // Create a dot for each domain this scan hit belongs to
              return scanHit.domains.map((domainId) => {
                // Get the radius for this domain
                const domainRadius = CONFIG.domainRadii[domainId];
                
                // Calculate position at the domain's radius and scan hit's angle
                const position = polarToCartesian(
                  CONFIG.centerX,
                  CONFIG.centerY,
                  domainRadius,
                  angle
                );
                
                // Determine opacity based on selection
                let opacity = 0.8;
                if (selectedDomain) {
                  // Show dots for the selected domain ring at full opacity
                  // Dim dots for other domain rings
                  opacity = domainId === selectedDomain ? 0.8 : 0.2;
                }
                
                return (
                  <circle
                    key={`dot-${scanHit.id || index}-${domainId}`}
                    cx={position.x}
                    cy={position.y}
                    r={10}
                    fill="#374151"
                    stroke="white"
                    strokeWidth={1.5}
                    opacity={opacity}
                    className="cursor-pointer transition-opacity duration-200 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDomainClick(domainId);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Scan hit ${scanHit.title} in ${DOMAIN_LABELS.find(d => d.id === domainId)?.label} domain`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDomainClick(domainId);
                      }
                    }}
                  />
                );
              });
            })}
          </g>

          {/* Scan hit labels around the outer perimeter */}
          <g id="scan-hit-labels">
            {scanHits.map((scanHit, index) => {
              // Step 1: Calculate angle for even spacing
              const angle = (index / scanHits.length) * 360;
              
              // Step 2: Use calculated position if available, otherwise use initial estimate
              const position = labelPositions[index] || 
                polarToCartesian(
                  CONFIG.centerX,
                  CONFIG.centerY,
                  (CONFIG.scanHitRadius + CONFIG.positioning.desiredGap) - CONFIG.positioning.baseOffset,
                  angle
                );
              
              // Step 3: Handle text rotation to keep text right-side-up
              let rotation;
              
              // Calculate base rotation (perpendicular to radius)
              rotation = angle + 90;
              
              // Normalize rotation to keep text right-side-up (between -90 and 90 degrees)
              while (rotation > 90) {
                rotation -= 180;
              }
              while (rotation < -90) {
                rotation += 180;
              }
              
              // Step 4: Truncate title to 50-55 characters and trim whitespace
              const cleanTitle = scanHit.title.trim(); // Remove leading/trailing spaces
              const truncatedTitle = cleanTitle.length > 55 
                ? cleanTitle.substring(0, 52) + "..."
                : cleanTitle;
              
              // Determine opacity and styling based on selection and focus state
              let opacity = 1.0;
              let fillColor = "#4B5563";
              let fontWeight = "normal";
              
              if (selectedDomain) {
                // If a domain is selected, only show labels for scan hits that belong to that domain
                opacity = scanHit.domains.includes(selectedDomain) ? 1.0 : 0.2;
              }
              
              // Check if this scan hit is focused
              const isFocused = focusedScanHit === (scanHit.id || index);
              if (isFocused) {
                fillColor = "#1D4ED8"; // Blue color for focused scan hit
                fontWeight = "semibold";
                opacity = 1.0;
              }
              
              return (
                <text
                  ref={(el) => textRefs.current[`text-${index}`] = el}
                  key={`scan-hit-${scanHit.id || index}`}
                  x={position.x}
                  y={position.y}
                  fontSize="20"
                  fill={fillColor}
                  fontWeight={fontWeight}
                  textAnchor="middle" // Back to middle since we're positioning precisely
                  dominantBaseline="middle"
                  opacity={opacity}
                  transform={`rotate(${rotation}, ${position.x}, ${position.y})`}
                  className="cursor-pointer transition-all duration-200 select-none hover:fill-gray-800 hover:font-semibold hover:underline focus:outline-none focus:fill-blue-600 focus:font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScanHitClick(scanHit, index);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleScanHitClick(scanHit, index);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Scan hit: ${truncatedTitle}${scanHit.domains.length > 1 ? ` (belongs to ${scanHit.domains.length} domains)` : ''}`}
                  aria-pressed={isFocused}
                >
                  {truncatedTitle}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Status Messages with proper ARIA live regions */}
      {selectedDomainLabel && (
        <div 
          className="mx-8 mb-8 p-4 bg-blue-100 rounded-md text-center text-sm text-blue-800 font-medium"
          role="status"
          aria-live="polite"
          aria-label={`Domain filter applied`}
        >
          Showing scan hits for: <strong>{selectedDomainLabel}</strong>
        </div>
      )}
      
      {hoveredDomainLabel && !selectedDomain && (
        <div 
          className="mx-8 mb-8 p-4 bg-gray-200 rounded-md text-center text-sm text-gray-700 font-medium"
          role="status"
          aria-live="polite"
          aria-label={`Hovering over domain`}
        >
          Currently viewing: {hoveredDomainLabel}
        </div>
      )}

      {/* Scan Hit Details Modal - Side Panel */}
      {selectedScanHit && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Modal Content - Positioned to the right */}
          <div className="modal-panel absolute right-0 top-0 h-full bg-white shadow-2xl border-l border-gray-200 w-96 max-w-[90vw] pointer-events-auto overflow-hidden">
            {/* Header with close button */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 pr-8 leading-tight">
                {selectedScanHit.title}
              </h2>
              <button
                onClick={closeModal}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto h-[calc(100vh-120px)]">
              {/* Associated Domains */}
              {selectedScanHit.domains && selectedScanHit.domains.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Associated Domains</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedScanHit.domains.map((domainId) => {
                      const domainLabel = DOMAIN_LABELS.find(d => d.id === domainId)?.label;
                      return (
                        <span
                          key={domainId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {domainLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date */}
              {selectedScanHit.date && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Horizon</h3>
                  <p className="text-gray-600">{selectedScanHit.date}</p>
                </div>
              )}

              {/* Source */}
              {selectedScanHit.source && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Source</h3>
                  <a
                    href={selectedScanHit.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    {selectedScanHit.source}
                  </a>
                </div>
              )}

              {/* Description */}
              {selectedScanHit.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Description</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {selectedScanHit.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default RadialScanChart;


