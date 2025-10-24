/**
 * @fileoverview Print-Ready Radial Signals of Change Chart Component
 * 
 * A non-interactive React component that displays a radial visualization of education
 * domain signals of change data for print/export purposes. Uses exact same layout
 * calculations as the interactive version but removes all interactivity.
 * 
 * @author UNICEF/Radial Interactive Team
 * @version 2.0.0
 */

// React imports
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Third-party imports
import axios from 'axios';

// Utility imports
import { axiosWithRetry, withPerformanceMonitoring } from './utils/apiUtils';

// Exact same CONFIG as original RadialScanChart
const CONFIG = {
  centerX: 2500,
  centerY: 2500,
  domainRadii: {
    'teaching-learning': 375,
    'equity-access': 525,
    'curriculum-reform': 675,
    'education-society': 825,
    'technology-digital': 975,
    'investment-governance': 1125,
    'teacher-empowerment': 1275
  },
  scanHitRadius: 1350, // This is the radius of the outermost ring
  ringColor: '#d1d5db',
  ringWidth: 4,
  positioning: {
    desiredGap: 3,
    baseOffset: 75,
    microAdjustment: 2.5,
    measurementDelay: 100
  }
};

// Exact same domain mappings as original
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

// Exact same domain labels as original
const DOMAIN_LABELS = [
  { 
    id: 'teaching-learning', 
    label: 'Teaching & Learning Models',
    description: 'Innovative pedagogical approaches and learning methodologies that transform how knowledge is shared and acquired.',
    futuresContext: 'The futures of African education could shift from teacher-centered instruction to learner-driven experiences where students control their journeys, learn through play and dialogue, and merge academic study with real-world work. Mental health support and climate-adaptive teaching methods could become central, with educators as facilitators guiding self-directed exploration rather than delivering information.'
  },
  { 
    id: 'equity-access', 
    label: 'Equity & Access',
    description: 'Ensuring fair and inclusive educational opportunities for all learners regardless of background or circumstances.',
    futuresContext: 'The futures of educational access could ensure every African child learns in their mother tongue while gaining global skills, with universal design welcoming all abilities. Mobile units could reach nomadic communities, digital tools could serve rural areas equally, and education could become the primary vehicle for closing gender and economic divides.'
  },
  { 
    id: 'curriculum-reform', 
    label: 'Curriculum Reform',
    description: 'Modernizing educational content to reflect contemporary needs, local contexts, and future skills requirements.',
    futuresContext: 'African curricula\'s futures could emphasize preparing students for unknown jobs through flexibility and critical thinking rather than memorization. Environmental literacy and mental health could become core subjects, with students co-designing learning pathways that honor both global competencies and indigenous wisdom.'
  },
  { 
    id: 'education-society', 
    label: 'Education & Society',
    description: 'The interconnected relationship between educational systems and broader societal development and transformation.',
    futuresContext: 'Schools\' futures could see them transform into multi-purpose community hubs serving as peace-building centers, climate shelters, and spaces for intergenerational environmental action. Education systems could adapt quickly to serve climate migrants and economic shifts, graduating young people as environmental leaders ready to build new social contracts.'
  },
  { 
    id: 'technology-digital', 
    label: 'Technology & Digital Learning',
    description: 'Leveraging digital tools and platforms to enhance learning experiences and expand educational reach.',
    futuresContext: 'African classrooms\' futures could feature AI personalizing every lesson, virtual reality bringing concepts to life, and solar-powered devices ensuring universal digital access. Gamification and biometric feedback could make learning feel like discovery, while massive tech investment and thoughtful AI integration could scale quality education to millions.'
  },
  { 
    id: 'investment-governance', 
    label: 'Investment & Governance',
    description: 'Financial resources, policy frameworks, and institutional structures that support educational systems.',
    futuresContext: 'Educational governance futures could shift from political influence to merit-based decisions, with independent evaluation and guaranteed education funding as a basic right. Early childhood education could receive priority investment, while renewable energy infrastructure could enable universal digital learning.'
  },
  { 
    id: 'teacher-empowerment', 
    label: 'Teacher Empowerment',
    description: 'Supporting educators as professionals and change agents in transforming educational outcomes.',
    futuresContext: 'The futures of teaching could feature continuous professional development through large-scale training programs and mental health support making the profession sustainable. Teachers could integrate AI ethically, close urban-rural gaps, and collaborate globally to bring best practices to every African classroom.'
  }
];

// Exact same STEEP colors as original
const STEEP_COLORS = {
  'Social': '#00A6FB',
  'Technological': '#7B68EE',
  'Economic': '#FFB800',
  'Environmental': '#00C853',
  'Political & Legal': '#FF5252'
};

// Exact same domain order as original
const DOMAIN_ORDER = [
  'teaching-learning',     // Innermost (300px)
  'equity-access',         // 375px
  'curriculum-reform',     // 450px
  'education-society',     // 525px
  'technology-digital',    // 600px
  'investment-governance', // 675px
  'teacher-empowerment'    // Outermost (750px)
];

// Exact same STEEP order as original
const STEEP_ORDER = [
  'Social',
  'Technological', 
  'Economic',
  'Environmental',
  'Political & Legal'
];

/**
 * Get color for STEEP category - exact same as original
 * @param {string} category - STEEP category name
 * @returns {string} Hex color code
 */
const getSteepColor = (category) => {
  if (!category) return '#374151'; // Default gray if no category
  
  const normalizedCategory = category.trim();
  return STEEP_COLORS[normalizedCategory] || '#374151'; // Default gray if unknown
};

/**
 * Get the innermost domain (smallest radius) for a signal of change - exact same as original
 * @param {Array} domains - Array of domain IDs
 * @returns {string} Innermost domain ID
 */
const getInnermostDomain = (domains) => {
  if (!domains || domains.length === 0) return 'teacher-empowerment';
  
  return domains.reduce((innermost, domain) => {
    const currentIndex = DOMAIN_ORDER.indexOf(innermost);
    const domainIndex = DOMAIN_ORDER.indexOf(domain);
    return domainIndex < currentIndex ? domain : innermost;
  });
};

/**
 * Get the next outermost domain after the innermost one - exact same as original
 * @param {Array} domains - Array of domain IDs
 * @param {string} innermostDomain - The innermost domain
 * @returns {string} Next outermost domain ID
 */
const getNextOutermostDomain = (domains, innermostDomain) => {
  if (!domains || domains.length <= 1) return innermostDomain;
  
  const innermostIndex = DOMAIN_ORDER.indexOf(innermostDomain);
  const remainingDomains = domains.filter(d => d !== innermostDomain);
  
  if (remainingDomains.length === 0) return innermostDomain;
  
  return remainingDomains.reduce((next, domain) => {
    const currentIndex = DOMAIN_ORDER.indexOf(next);
    const domainIndex = DOMAIN_ORDER.indexOf(domain);
    return domainIndex < currentIndex ? domain : next;
  });
};

/**
 * Sort signals of change by STEEP category, then by innermost domain, then by next domain - exact same as original
 * @param {Array} scanHits - Array of signal of change objects
 * @returns {Array} Sorted array of signals of change
 */
const sortScanHits = (scanHits) => {
  return [...scanHits].sort((a, b) => {
    // Primary sort: STEEP Category
    const steepA = a.steepCategory || 'Unknown';
    const steepB = b.steepCategory || 'Unknown';
    
    const steepIndexA = STEEP_ORDER.indexOf(steepA);
    const steepIndexB = STEEP_ORDER.indexOf(steepB);
    
    if (steepIndexA !== steepIndexB) {
      return steepIndexA - steepIndexB;
    }
    
    // Secondary sort: Innermost domain (smallest radius)
    const innermostDomainA = getInnermostDomain(a.domains);
    const innermostDomainB = getInnermostDomain(b.domains);
    
    const domainIndexA = DOMAIN_ORDER.indexOf(innermostDomainA);
    const domainIndexB = DOMAIN_ORDER.indexOf(innermostDomainB);
    
    if (domainIndexA !== domainIndexB) {
      return domainIndexA - domainIndexB;
    }
    
    // Tertiary sort: Next outermost domain
    const nextDomainA = getNextOutermostDomain(a.domains, innermostDomainA);
    const nextDomainB = getNextOutermostDomain(b.domains, innermostDomainB);
    
    const nextIndexA = DOMAIN_ORDER.indexOf(nextDomainA);
    const nextIndexB = DOMAIN_ORDER.indexOf(nextDomainB);
    
    return nextIndexA - nextIndexB;
  });
};

/**
 * Converts polar coordinates to cartesian coordinates - exact same as original
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
 * Creates an SVG arc path between two radii - exact same as original
 * @param {number} centerX - X coordinate of the center point
 * @param {number} centerY - Y coordinate of the center point
 * @param {number} innerRadius - Inner radius of the arc
 * @param {number} outerRadius - Outer radius of the arc
 * @param {number} startAngle - Start angle in degrees (0-360)
 * @param {number} endAngle - End angle in degrees (0-360)
 * @returns {string} SVG path string for the arc
 */
const createArcPath = (centerX, centerY, innerRadius, outerRadius, startAngle, endAngle) => {
  const startAngleRad = (startAngle - 90) * Math.PI / 180;
  const endAngleRad = (endAngle - 90) * Math.PI / 180;
  
  const x1 = centerX + innerRadius * Math.cos(startAngleRad);
  const y1 = centerY + innerRadius * Math.sin(startAngleRad);
  const x2 = centerX + outerRadius * Math.cos(startAngleRad);
  const y2 = centerY + outerRadius * Math.sin(startAngleRad);
  const x3 = centerX + outerRadius * Math.cos(endAngleRad);
  const y3 = centerY + outerRadius * Math.sin(endAngleRad);
  const x4 = centerX + innerRadius * Math.cos(endAngleRad);
  const y4 = centerY + innerRadius * Math.sin(endAngleRad);
  
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
  return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1} ${y1} Z`;
};

/**
 * Calculates precise text positioning for radial chart labels - exact same as original
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
 * Fetch scan hits from AITable - exact same as original
 * @returns {Promise<Array>} Array of scan hit records
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
 * Cleans text by removing multiple consecutive spaces and normalizing whitespace
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text with single spaces
 */
const cleanText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Replace multiple consecutive spaces (2 or more) with single space
  // Also trim leading/trailing whitespace
  return text.trim().replace(/\s{2,}/g, ' ');
};

/**
 * Transform raw AITable data to chart format - exact same as original
 * @param {Array} records - Raw records from AITable
 * @returns {Array} Transformed scan hits
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
      title: cleanText(record.fields['Title']),
      description: cleanText(record.fields['English Description']),
      domains: domains,
      date: record.fields['Horizon'],
      source: record.fields['Link'],
      recNumber: record.fields['RecNumber'],
      steepCategory: cleanText(record.fields['STEEP Category']),
      participantIdentified: record.fields['Participant Identified'] === true || record.fields['Participant Identified'] === 'Yes',
      impact: record.fields['Impact'] || '',
      timeframe: record.fields['Timeframe'] || '',
      confidence: record.fields['Confidence'] || ''
    };
  });
};

/**
 * Print-Ready Radial Chart Component
 * Non-interactive version of RadialScanChart for print/export purposes
 */
const PrintRadialChart = React.forwardRef((props, ref) => {
  // State management - simplified, no interactive state
  const [scanHits, setScanHits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // State for dynamic positioning - keep this for exact layout reproduction
  const [labelPositions, setLabelPositions] = useState({});
  const textRefs = useRef({});
  const lastRenderTimeRef = useRef(0);

  // Use forwarded ref for export
  const svgRef = ref || useRef(null);

  // Data loading - exact same as original
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const records = await fetchScanHits();
        console.log('Raw records from API:', records.length, records[0]);
        const transformed = transformData(records);
        console.log('Transformed data:', transformed.length, transformed[0]);
        const sorted = sortScanHits(transformed);
        setScanHits(sorted);
        setError(null);
        console.log('Fetched signals of change for print:', sorted.length, sorted[0]);
      } catch (err) {
        setError('Failed to load signals of change. Please check your API credentials.');
        console.error('Print chart error:', err);
      } finally {
        setLoading(false);
        setHasInitiallyLoaded(true);
      }
    };
    
    loadData();
  }, []);

  // Two-pass positioning effect - exact same as original for precise layout
  useEffect(() => {
    if (scanHits.length === 0) return;
    
    // Small delay to ensure DOM is rendered
    const timeoutId = setTimeout(() => {
      const currentTime = performance.now();
      
      // Only track if enough time has passed since last render (throttling)
      if (currentTime - lastRenderTimeRef.current > 100) {
        const newPositions = {};
        
        scanHits.forEach((scanHit, index) => {
          const textElement = textRefs.current[`text-${index}`];
          if (textElement) {
            try {
              // Measure actual text dimensions and calculate precise position
              const bbox = textElement.getBBox();
              const anglePerHit = 360 / scanHits.length;
              const segmentStartAngle = (index / scanHits.length) * 360;
              const segmentCenterAngle = segmentStartAngle + (anglePerHit / 2);
              const position = calculateTextPosition(bbox, segmentCenterAngle);
              
              newPositions[index] = position;
            } catch (error) {
              // Fallback to original positioning if measurement fails
              const anglePerHit = 360 / scanHits.length;
              const segmentStartAngle = (index / scanHits.length) * 360;
              const segmentCenterAngle = segmentStartAngle + (anglePerHit / 2);
              const adjustedRadius = (CONFIG.scanHitRadius + CONFIG.positioning.desiredGap) - CONFIG.positioning.baseOffset;
              const position = polarToCartesian(
                CONFIG.centerX,
                CONFIG.centerY,
                adjustedRadius,
                segmentCenterAngle
              );
              newPositions[index] = position;
            }
          }
        });
        
        setLabelPositions(newPositions);
        lastRenderTimeRef.current = currentTime;
      }
    }, CONFIG.positioning.measurementDelay);
    
    return () => clearTimeout(timeoutId);
  }, [scanHits]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Chart</h2>
          <p className="text-gray-600">Preparing print-ready visualization...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto p-6">
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
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Chart</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Main chart rendering - exact same layout as original but without interactivity
  return (
    <div className="w-full h-full flex justify-center items-center bg-white">
      <svg 
        ref={svgRef}
        viewBox="0 0 5000 5000" 
        className="w-full h-auto max-h-[90vh]"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby="chart-title chart-description"
      >
        {/* Hidden descriptive text for screen readers */}
        <title id="chart-title">Print-Ready Radial Signals of Change Chart</title>
        <desc id="chart-description">
          A radial chart showing education domain signals of change data. The chart displays seven concentric circles representing different education domains, with signal of change labels positioned around the outer perimeter. Each signal of change can belong to multiple domains.
        </desc>

        {/* Concentric circles for each domain - exact same as original */}
        {DOMAIN_LABELS.map((domain, index) => {
          const radius = CONFIG.domainRadii[domain.id];
          
          return (
            <circle
              key={domain.id}
              cx={CONFIG.centerX}
              cy={CONFIG.centerY}
              r={radius}
              fill="none"
              stroke={CONFIG.ringColor}
              strokeWidth={CONFIG.ringWidth}
              opacity={1.0}
            />
          );
        })}

        {/* Map of Africa in the center - exact same as original */}
        <image
          href="/graphics/mapofafrica.png"
          x={CONFIG.centerX - 300}
          y={CONFIG.centerY - 300}
          width={600}
          height={600}
          role="img"
          aria-label="Map of Africa silhouette"
          alt="Central map of Africa showing the geographic focus of the education domain data"
        />

        {/* Single ring between center and first domain - exact same as original */}
        <circle
          cx={CONFIG.centerX}
          cy={CONFIG.centerY}
          r={225}
          fill="none"
          stroke={CONFIG.ringColor}
          strokeWidth={CONFIG.ringWidth}
          opacity={1.0}
        />

        {/* Radiating segment boundary lines - exact same as original */}
        <g id="segment-boundaries">
          {scanHits.map((scanHit, index) => {
            const anglePerHit = 360 / scanHits.length;
            const segmentStartAngle = (index / scanHits.length) * 360;
            
            // Calculate line endpoints from center to outer ring
            const innerPoint = polarToCartesian(CONFIG.centerX, CONFIG.centerY, 0, segmentStartAngle);
            const outerPoint = polarToCartesian(CONFIG.centerX, CONFIG.centerY, CONFIG.scanHitRadius, segmentStartAngle);
            
            return (
              <line
                key={`boundary-${scanHit.id || index}`}
                x1={innerPoint.x}
                y1={innerPoint.y}
                x2={outerPoint.x}
                y2={outerPoint.y}
                stroke="#e5e7eb"
                strokeWidth="3"
                opacity={0.7}
              />
            );
          })}
        </g>

        {/* Colored arc segments - exact same as original */}
        <g id="domain-segments">
          {scanHits.map((scanHit, index) => {
            // Calculate the angle and width for this signal of change
            const anglePerHit = 360 / scanHits.length;
            const startAngle = (index / scanHits.length) * 360;
            const endAngle = startAngle + anglePerHit;
            
            // Create a segment for each domain this signal of change belongs to
            return scanHit.domains.map((domainId) => {
              // Get the radius for this domain
              const domainRadius = CONFIG.domainRadii[domainId];
              
              // Calculate inner and outer radii for the segment
              let innerRadius;
              if (domainId === 'teaching-learning') {
                innerRadius = 225; // Second intermediate ring
              } else {
                const domainIndex = DOMAIN_ORDER.indexOf(domainId);
                const previousDomainId = DOMAIN_ORDER[domainIndex - 1];
                innerRadius = CONFIG.domainRadii[previousDomainId];
              }
              
              const outerRadius = domainRadius;
              
              return (
                <path
                  key={`segment-${scanHit.id || index}-${domainId}`}
                  d={createArcPath(CONFIG.centerX, CONFIG.centerY, innerRadius, outerRadius, startAngle, endAngle)}
                  fill={getSteepColor(scanHit.steepCategory)}
                  stroke="#ffffff"
                  strokeWidth="3"
                  opacity={0.6}
                />
              );
            });
          })}
        </g>

        {/* Signal of change labels around the outer perimeter - exact same positioning as original */}
        <g id="signal-labels">
          {scanHits.map((scanHit, index) => {
            // Step 1: Calculate angle for segment center (not start)
            const anglePerHit = 360 / scanHits.length;
            const segmentStartAngle = (index / scanHits.length) * 360;
            const segmentCenterAngle = segmentStartAngle + (anglePerHit / 2);
            
            // Step 2: Use calculated position if available, otherwise use initial estimate
            const position = labelPositions[index] || 
              polarToCartesian(
                CONFIG.centerX,
                CONFIG.centerY,
                (CONFIG.scanHitRadius + CONFIG.positioning.desiredGap) - CONFIG.positioning.baseOffset,
                segmentCenterAngle
              );
            
            // Step 3: Handle text rotation to keep text right-side-up
            let rotation;
            
            // Calculate base rotation (perpendicular to radius)
            rotation = segmentCenterAngle + 90;
            
            // Normalize rotation to keep text right-side-up (between -90 and 90 degrees)
            while (rotation > 90) {
              rotation -= 180;
            }
            while (rotation < -90) {
              rotation += 180;
            }
            
            // Step 4: Truncate title to 50-55 characters and trim whitespace
            const cleanTitle = scanHit.title.trim();
            const truncatedTitle = cleanTitle.length > 55 
              ? cleanTitle.substring(0, 52) + "..."
              : cleanTitle;
            
            // Determine star position based on text rotation
            const isRightSide = segmentCenterAngle >= 0 && segmentCenterAngle <= 180;
            const showStar = scanHit.participantIdentified;
            
            return (
              <text
                ref={(el) => textRefs.current[`text-${index}`] = el}
                key={`scan-hit-${scanHit.id || index}`}
                x={position.x}
                y={position.y}
                fontSize="40"
                fill="#4B5563"
                fontWeight="normal"
                textAnchor="middle"
                dominantBaseline="middle"
                opacity={1.0}
                transform={`rotate(${rotation}, ${position.x}, ${position.y})`}
              >
                {showStar && !isRightSide && (
                  <tspan fontSize="48" fill="#FFD700" dx="0" dy="0">
                    ⭐
                  </tspan>
                )}
                <tspan dx={showStar && !isRightSide ? "8" : "0"}>
                  {truncatedTitle}
                </tspan>
                {showStar && isRightSide && (
                  <tspan fontSize="48" fill="#FFD700" dx="8" dy="0">
                    ⭐
                  </tspan>
                )}
              </text>
            );
          })}
        </g>

        {/* Domain labels positioned between rings at the bottom center (180 degrees) - exact same as original */}
        {DOMAIN_LABELS.map((domain, index) => {
          // Calculate the midpoint between the previous ring and this domain's ring
          let previousRadius;
          if (index === 0) {
            // First label: between second intermediate ring (225px) and first domain ring (300px)
            previousRadius = 225;
          } else {
            // Use the previous domain's radius
            const previousDomainId = DOMAIN_LABELS[index - 1].id;
            previousRadius = CONFIG.domainRadii[previousDomainId];
          }
          
          const currentRadius = CONFIG.domainRadii[domain.id];
          
          // Position label at the midpoint between previous ring and current ring
          const labelRadius = previousRadius + (currentRadius - previousRadius) / 2;
          
          // Default position at bottom center (180 degrees)
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
          
          return (
            <g key={`label-${domain.id}`}>
              <text
                x={position.x}
                y={position.y - 3}
                fontSize="42"
                fill="#374151"
                textAnchor="middle"
                opacity={1.0}
                fontWeight="bold"
              >
                {line1}
                {line2 && (
                  <tspan x={position.x} dy="1.2em">
                    {line2}
                  </tspan>
                )}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

PrintRadialChart.displayName = 'PrintRadialChart';

export default PrintRadialChart;
