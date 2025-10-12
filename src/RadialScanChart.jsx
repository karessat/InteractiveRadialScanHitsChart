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

const CONFIG = {
  centerX: 1000,
  centerY: 1000,
  domainRadii: {
    'teaching-learning': 150,
    'equity-access': 200,
    'curriculum-reform': 250,
    'education-society': 300,
    'technology-digital': 350,
    'investment-governance': 400,
    'teacher-empowerment': 450
  },
  scanHitRadius: 550, // This is the radius of the outermost ring
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
 * Fetches scan hits data from AITable API
 * @returns {Promise<Array>} Array of raw records from AITable
 * @throws {Error} If API request fails
 */
const fetchScanHits = async () => {
  try {
    const response = await axios.get(
      `https://api.aitable.ai/fusion/v1/datasheets/${import.meta.env.VITE_SCAN_HITS_DATASHEET_ID}/records`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_AITABLE_TOKEN}`
        }
      }
    );
    return response.data.data.records;
  } catch (error) {
    console.error('Error fetching scan hits:', error);
    throw error;
  }
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
  
  // State for dynamic positioning
  const [labelPositions, setLabelPositions] = useState({});
  const textRefs = useRef({});

  // ============================================================================
  // OPTIMIZED EVENT HANDLERS & MEMOIZATION
  // ============================================================================
  const handleDomainClick = useCallback((domainId) => {
    setSelectedDomain(prev => prev === domainId ? null : domainId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDomain(null);
  }, []);

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
      }
    };
    
    loadData();
  }, []);

  // Two-pass positioning effect - measure and adjust after initial render
  useEffect(() => {
    if (scanHits.length === 0) return;
    
    // Small delay to ensure DOM is rendered
    const timeoutId = setTimeout(() => {
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
    }, CONFIG.positioning.measurementDelay);
    
    return () => clearTimeout(timeoutId);
  }, [scanHits]);

  // ============================================================================
  // CONDITIONAL RENDERING
  // ============================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scan hits from AITable...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="w-full max-w-[2000px] mx-auto p-8 bg-gray-50 rounded-lg relative">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Futures Scanning Data</h1>
        <p className="text-base text-gray-600">Interactive radial visualization of education domains</p>
      </div>
      
      {/* Clear Selection Button */}
      {selectedDomain && (
        <button
          onClick={clearSelection}
          className="absolute top-8 right-8 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
        >
          Clear Selection
        </button>
      )}
      
      <div className="bg-white rounded-lg p-8 shadow-md flex justify-center items-center">
        <svg 
          viewBox="0 0 2000 2000" 
          className="max-w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Invisible clickable areas for domain rings */}
          <g id="domain-click-areas">
            {DOMAIN_LABELS.map((domain) => {
              const radius = CONFIG.domainRadii[domain.id];
              return (
                <circle
                  key={`click-${domain.id}`}
                  cx={CONFIG.centerX}
                  cy={CONFIG.centerY}
                  r={radius}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="30"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDomainClick(domain.id);
                  }}
                />
              );
            })}
          </g>

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
            x={CONFIG.centerX - 100}
            y={CONFIG.centerY - 100}
            width={200}
            height={200}
            className="transition-all duration-300"
          />

          {/* Domain labels positioned between rings at the bottom center (180 degrees) */}
          {DOMAIN_LABELS.map((domain, index) => {
            // Calculate the midpoint between the previous ring and this domain's ring
            let previousRadius;
            if (index === 0) {
              // First label: between black center circle (50px radius) and first ring
              previousRadius = 50;
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
                  fontSize="10"
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
                >
                  {line1}
                </text>
                {line2 && (
                  <text
                    x={position.x}
                    y={position.y + 8}
                    fontSize="10"
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
                    r={5}
                    fill="#374151"
                    stroke="white"
                    strokeWidth={1.5}
                    opacity={opacity}
                    className="cursor-pointer transition-opacity duration-200 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDomainClick(domainId);
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
              
              // Determine opacity based on selection
              let opacity = 1.0;
              if (selectedDomain) {
                // If a domain is selected, only show labels for scan hits that belong to that domain
                opacity = scanHit.domains.includes(selectedDomain) ? 1.0 : 0.2;
              }
              
              return (
                <text
                  ref={(el) => textRefs.current[`text-${index}`] = el}
                  key={`scan-hit-${scanHit.id || index}`}
                  x={position.x}
                  y={position.y}
                  fontSize="10"
                  fill="#4B5563"
                  textAnchor="middle" // Back to middle since we're positioning precisely
                  dominantBaseline="middle"
                  opacity={opacity}
                  transform={`rotate(${rotation}, ${position.x}, ${position.y})`}
                  className="cursor-pointer transition-all duration-200 select-none hover:fill-gray-800 hover:font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    // If the scan hit has domains, select the first one
                    if (scanHit.domains && scanHit.domains.length > 0) {
                      handleDomainClick(scanHit.domains[0]);
                    }
                  }}
                >
                  {truncatedTitle}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {selectedDomainLabel && (
        <div className="mt-6 p-4 bg-blue-100 rounded-md text-center text-sm text-blue-800 font-medium">
          Showing scan hits for: <strong>{selectedDomainLabel}</strong>
        </div>
      )}
      
      {hoveredDomainLabel && !selectedDomain && (
        <div className="mt-6 p-4 bg-gray-200 rounded-md text-center text-sm text-gray-700 font-medium">
          Currently viewing: {hoveredDomainLabel}
        </div>
      )}
      
    </div>
  );
}

export default RadialScanChart;

