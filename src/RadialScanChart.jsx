/**
 * @fileoverview Interactive Radial Signals of Change Chart Component
 * 
 * A React component that displays an interactive radial visualization of education
 * domain signals of change data from AITable. Features dynamic text positioning, domain
 * filtering, and real-time data integration.
 * 
 * @author UNICEF/Radial Interactive Team
 * @version 2.0.0
 */

// React imports
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Third-party imports
import axios from 'axios';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { select as d3Select } from 'd3-selection';

// Utility imports
import { axiosWithRetry, withPerformanceMonitoring } from './utils/apiUtils';
import { useChartAnalytics } from './hooks/useAnalytics';

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

const STEEP_COLORS = {
  'Social': '#00A6FB',
  'Technological': '#7B68EE',
  'Economic': '#FFB800',
  'Environmental': '#00C853',
  'Political & Legal': '#FF5252'
};

const DOMAIN_ORDER = [
  'teaching-learning',     // Innermost (300px)
  'equity-access',         // 375px
  'curriculum-reform',     // 450px
  'education-society',     // 525px
  'technology-digital',    // 600px
  'investment-governance', // 675px
  'teacher-empowerment'    // Outermost (750px)
];

const STEEP_ORDER = [
  'Social',
  'Technological', 
  'Economic',
  'Environmental',
  'Political & Legal'
];

/**
 * Get color for STEEP category
 * @param {string} category - STEEP category name
 * @returns {string} Hex color code
 */
const getSteepColor = (category) => {
  if (!category) return '#374151'; // Default gray if no category
  
  const normalizedCategory = category.trim();
  return STEEP_COLORS[normalizedCategory] || '#374151'; // Default gray if unknown
};

/**
 * Get the innermost domain (smallest radius) for a signal of change
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
 * Get the next outermost domain after the innermost one
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
 * Sort signals of change by STEEP category, then by innermost domain, then by next domain
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
 * Creates an SVG arc path between two radii
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
 * Creates a full circle annulus (ring) path for clickable domain areas
 * @param {number} centerX - X coordinate of the center point
 * @param {number} centerY - Y coordinate of the center point
 * @param {number} innerRadius - Inner radius of the annulus
 * @param {number} outerRadius - Outer radius of the annulus
 * @returns {string} SVG path string for the full circle annulus
 */
const createFullAnnulusPath = (centerX, centerY, innerRadius, outerRadius) => {
  // Create two semicircular arcs to form a complete circle
  // This avoids the degenerate case of a 360-degree arc
  return `
    M ${centerX - outerRadius} ${centerY}
    A ${outerRadius} ${outerRadius} 0 0 1 ${centerX + outerRadius} ${centerY}
    A ${outerRadius} ${outerRadius} 0 0 1 ${centerX - outerRadius} ${centerY}
    Z
    M ${centerX - innerRadius} ${centerY}
    A ${innerRadius} ${innerRadius} 0 0 0 ${centerX + innerRadius} ${centerY}
    A ${innerRadius} ${innerRadius} 0 0 0 ${centerX - innerRadius} ${centerY}
    Z
  `.trim();
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
 * Fetches signals of change data from AITable API with retry logic
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
 * Transforms raw AITable records into structured signal of change objects
 * @param {Array} records - Raw records from AITable
 * @returns {Array} Array of transformed signal of change objects
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
      steepCategory: record.fields['STEEP Category'],
      participantIdentified: record.fields['Participant Identified'] || false,
    };
  });
};

/**
 * Interactive Radial Signals of Change Chart Component
 * 
 * Displays an interactive radial visualization of education domain signals of change data.
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
  const [selectedSteepCategory, setSelectedSteepCategory] = useState(null);
  const [showParticipantIdentifiedOnly, setShowParticipantIdentifiedOnly] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [showDefaultModal, setShowDefaultModal] = useState(false);
  const [showModalPanel, setShowModalPanel] = useState(false); // Controls modal panel visibility independently
  const [panelWidth, setPanelWidth] = useState(600); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  
  // State for dynamic positioning
  const [labelPositions, setLabelPositions] = useState({});
  const textRefs = useRef({});
  const performanceTrackedRef = useRef(false);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);

  // Zoom and pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [showNavigationHelp, setShowNavigationHelp] = useState(false);
  const svgRef = useRef(null);
  const zoomBehaviorRef = useRef(null);

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
    
    // Clear any focused signal of change and selected signal of change when clicking domain rings
    setFocusedScanHit(null);
    setSelectedScanHit(null);
    
    setSelectedDomain(prev => prev === domainId ? null : domainId);
    
    // Open modal panel to show domain information
    setShowModalPanel(true);
    
    // Track analytics
    if (isSelecting) {
      trackDomainSelection(domainId, domainLabel);
    }
  }, [selectedDomain, trackDomainSelection, focusedScanHit, debugLog]);

  const clearSelection = useCallback(() => {
    setSelectedDomain(null);
    setSelectedScanHit(null);
    setFocusedScanHit(null);
    setSelectedSteepCategory(null);
    setShowParticipantIdentifiedOnly(false);
    setShowModalPanel(false);
  }, []);

  const closeModal = useCallback(() => {
    // Only close the modal panel, keep selection state
    setShowModalPanel(false);
    setShowDefaultModal(false);
    // Note: selectedScanHit and selectedDomain persist to maintain visual selection
  }, []);

  const toggleNavigationHelp = useCallback(() => {
    setShowNavigationHelp(prev => !prev);
  }, []);

  const closeNavigationHelp = useCallback(() => {
    setShowNavigationHelp(false);
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback((e) => {
    if (e) e.stopPropagation();
    if (svgRef.current && zoomBehaviorRef.current) {
      d3Select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 1.5);
    }
  }, []);

  const handleZoomOut = useCallback((e) => {
    if (e) e.stopPropagation();
    if (svgRef.current && zoomBehaviorRef.current) {
      d3Select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 0.67);
    }
  }, []);

  const handleResetZoom = useCallback((e) => {
    if (e) e.stopPropagation();
    if (svgRef.current && zoomBehaviorRef.current) {
      d3Select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.transform, zoomIdentity);
    }
  }, []);

  const handleScanHitClick = useCallback((scanHit, index) => {
    const scanHitId = scanHit.id || index;
    
    debugLog('Signal of change clicked', { 
      scanHitId, 
      title: scanHit.title, 
      previousSelection: selectedScanHit?.id,
      domains: scanHit.domains 
    });
    
    // Clear domain selection and set the selected signal of change to show in modal
    setSelectedDomain(null);
    setSelectedScanHit(scanHit);
    
    // Open modal panel to show scan hit details
    setShowModalPanel(true);
    
    // Track analytics
    trackScanHitClick(scanHitId, scanHit.title, scanHit.domains);
  }, [trackScanHitClick, selectedScanHit, debugLog]);

  const handleSteepCategoryClick = useCallback((category) => {
    debugLog('STEEP category clicked', { 
      category,
      previousCategory: selectedSteepCategory 
    });
    
    // Clear other selections
    setSelectedDomain(null);
    setSelectedScanHit(null);
    setFocusedScanHit(null);
    setShowParticipantIdentifiedOnly(false);
    
    // Toggle STEEP category selection
    setSelectedSteepCategory(prev => prev === category ? null : category);
    
    // Open modal panel to show STEEP category information
    setShowModalPanel(true);
  }, [selectedSteepCategory, debugLog]);

  const handleParticipantIdentifiedClick = useCallback(() => {
    debugLog('Participant-identified filter clicked', { 
      previousState: showParticipantIdentifiedOnly 
    });
    
    // Clear other selections
    setSelectedDomain(null);
    setSelectedScanHit(null);
    setFocusedScanHit(null);
    setSelectedSteepCategory(null);
    
    // Toggle participant-identified filter
    setShowParticipantIdentifiedOnly(prev => !prev);
    
    // Open modal panel to show participant-identified information
    setShowModalPanel(true);
  }, [showParticipantIdentifiedOnly, debugLog]);

  // Panel resize handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing) return;
    
    // Calculate new width based on mouse position from right edge
    const newWidth = window.innerWidth - e.clientX;
    
    // Constrain between min (300px) and max (80% of viewport width)
    const minWidth = 300;
    const maxWidth = window.innerWidth * 0.8;
    const constrainedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
    
    setPanelWidth(constrainedWidth);
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
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
        const sorted = sortScanHits(transformed);
        setScanHits(sorted);
        setError(null);
        console.log('Fetched signals of change:', sorted);
        console.log('Total records:', sorted.length);
        console.log('Sample record:', sorted[0]);
        console.log('STEEP Categories found:', [...new Set(sorted.map(s => s.steepCategory))]);
        console.log('Participant-identified signals:', sorted.filter(s => s.participantIdentified).length);
      } catch (err) {
        setError('Failed to load signals of change. Please check your API credentials.');
        console.error('Full error:', err);
      } finally {
        setLoading(false);
        setHasInitiallyLoaded(true);
      }
    };
    
    loadData();
  }, []);

  // Initialize d3-zoom behavior - wait for data to be loaded and SVG to be rendered
  useEffect(() => {
    if (!svgRef.current || !hasInitiallyLoaded) {
      return;
    }

    // Create zoom behavior with constraints
    const zoom = d3Zoom()
      .scaleExtent([0.5, 4]) // Min 0.5x, max 4x zoom
      .on('zoom', (event) => {
        // Update transform state
        const { x, y, k } = event.transform;
        setTransform({ x, y, scale: k });
      });

    // Apply zoom behavior to SVG
    const svg = d3Select(svgRef.current);
    svg.call(zoom);

    // Store zoom behavior for programmatic control
    zoomBehaviorRef.current = zoom;

    // Cleanup
    return () => {
      svg.on('.zoom', null);
    };
  }, [hasInitiallyLoaded]); // Wait for data to be loaded

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

  // ESC key listener for closing modals
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showModalPanel) {
          closeModal();
        } else if (showNavigationHelp) {
          closeNavigationHelp();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModalPanel, showNavigationHelp, closeModal, closeNavigationHelp]);

  // Keyboard shortcuts for zoom and pan
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't interfere if user is typing in an input or modal is open
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const PAN_AMOUNT = 100;

      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          handleZoomIn();
          break;
        case '-':
          event.preventDefault();
          handleZoomOut();
          break;
        case '0':
          event.preventDefault();
          handleResetZoom();
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (svgRef.current && zoomBehaviorRef.current) {
            const currentTransform = zoomIdentity
              .translate(transform.x, transform.y + PAN_AMOUNT)
              .scale(transform.scale);
            d3Select(svgRef.current).call(zoomBehaviorRef.current.transform, currentTransform);
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (svgRef.current && zoomBehaviorRef.current) {
            const currentTransform = zoomIdentity
              .translate(transform.x, transform.y - PAN_AMOUNT)
              .scale(transform.scale);
            d3Select(svgRef.current).call(zoomBehaviorRef.current.transform, currentTransform);
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (svgRef.current && zoomBehaviorRef.current) {
            const currentTransform = zoomIdentity
              .translate(transform.x + PAN_AMOUNT, transform.y)
              .scale(transform.scale);
            d3Select(svgRef.current).call(zoomBehaviorRef.current.transform, currentTransform);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (svgRef.current && zoomBehaviorRef.current) {
            const currentTransform = zoomIdentity
              .translate(transform.x - PAN_AMOUNT, transform.y)
              .scale(transform.scale);
            d3Select(svgRef.current).call(zoomBehaviorRef.current.transform, currentTransform);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [transform, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Click outside modal to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showModalPanel && !event.target.closest('.modal-panel')) {
        closeModal();
      }
    };

    if (showModalPanel) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showModalPanel, closeModal]);

  // Panel resize event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      // Prevent text selection while resizing
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

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
          <p className="text-gray-600 mb-4">Fetching signals of change from AITable...</p>
          
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
            Loading signals of change data from AITable API. Please wait.
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
    <div className="w-full max-w-[2400px] mx-auto bg-white rounded-lg shadow-md overflow-x-hidden">
      {/* Integrated Header */}
      <header className="text-center p-4 pb-4 sm:pb-6 lg:pb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 mb-2">UNICEF Youth Foresight Fellows</h1>
        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-600">Interactive Signal of Change Radar</p>
      </header>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-2 sm:gap-4 p-2 sm:p-4 lg:p-8">
        
        {/* STEEP Category Legend - Left column on desktop, below chart on mobile */}
        <div className="order-2 lg:order-1 bg-white p-3 sm:p-4 lg:p-6 rounded-lg shadow-md border border-gray-200 self-start">
          <h3 className="text-sm sm:text-base lg:text-lg xl:text-xl font-semibold text-gray-700 mb-2 sm:mb-3 lg:mb-4">
            STEEP Categories
          </h3>
          <div className="space-y-2 lg:space-y-3">
            {Object.entries(STEEP_COLORS).map(([category, color]) => {
              const isSelected = selectedSteepCategory === category;
              const isOtherSelected = (selectedSteepCategory && selectedSteepCategory !== category) || selectedDomain || showParticipantIdentifiedOnly;
              
              return (
                <button
                  key={category}
                  onClick={() => handleSteepCategoryClick(category)}
                  className={`flex items-center gap-2 lg:gap-3 w-full text-left p-2 rounded-lg transition-all duration-200 cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isSelected ? 'bg-blue-50 ring-2 ring-blue-400' : isOtherSelected ? 'opacity-40' : ''
                  }`}
                  aria-label={`Filter by ${category} category`}
                  aria-pressed={isSelected}
                >
                  <div 
                    className="w-4 h-4 lg:w-6 lg:h-6 rounded-full border border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="text-xs lg:text-sm text-gray-600 font-medium">{category}</span>
                </button>
              );
            })}
          </div>
          
          {/* Participant-identified stars legend */}
          <div className="mt-4 lg:mt-6 pt-3 lg:pt-4 border-t border-gray-200">
            <button
              onClick={handleParticipantIdentifiedClick}
              className={`flex items-center gap-2 lg:gap-3 w-full text-left p-2 rounded-lg transition-all duration-200 cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                showParticipantIdentifiedOnly ? 'bg-blue-50 ring-2 ring-blue-400' : (selectedSteepCategory || selectedDomain) ? 'opacity-40' : ''
              }`}
              aria-label="Filter by participant-identified signals"
              aria-pressed={showParticipantIdentifiedOnly}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="text-yellow-500 flex-shrink-0 lg:w-5 lg:h-5">
                <path 
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                  fill="currentColor"
                />
              </svg>
              <span className="text-xs lg:text-sm text-gray-600 font-medium">Participant-identified signals</span>
            </button>
          </div>
        </div>
        
        {/* Chart Container - Center column */}
        <div className="order-1 lg:order-2 relative">
          {/* Zoom controls - positioned relative to chart container */}
          <div className="absolute top-2 right-2 z-10 flex gap-1 sm:gap-2 items-center">
            {/* Clear Selection Button */}
            {(selectedDomain || selectedSteepCategory || showParticipantIdentifiedOnly) && (
              <button
                onClick={clearSelection}
                className="bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg transition-colors duration-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-label={`Clear selection${selectedDomainLabel ? ` of ${selectedDomainLabel} domain` : selectedSteepCategory ? ` of ${selectedSteepCategory} category` : showParticipantIdentifiedOnly ? ' of participant-identified filter' : ''}`}
              >
                Clear
              </button>
            )}
            
            {/* Zoom Controls */}
            <div className="flex gap-0.5 sm:gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-0.5">
              <button
                onClick={handleZoomIn}
                className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Zoom in"
                title="Zoom in (+)"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              <button
                onClick={handleZoomOut}
                className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Zoom out"
                title="Zoom out (-)"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              
              <button
                onClick={handleResetZoom}
                className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Reset zoom"
                title="Reset view (0)"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            {/* Help Button */}
            <button
              onClick={toggleNavigationHelp}
              className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Show navigation instructions"
              title="Navigation help"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          {/* Chart SVG */}
          <div className="chart-container flex justify-center items-center min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
            <svg 
              ref={svgRef}
              viewBox="0 0 5000 5000" 
              className="w-full h-auto max-h-[70vh] sm:max-h-[75vh] lg:max-h-[80vh]"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-labelledby="chart-title chart-description"
              aria-describedby="chart-instructions"
              style={{ touchAction: 'none', cursor: 'grab' }}
            >
          {/* Hidden descriptive text for screen readers */}
          <title id="chart-title">Interactive Radial Signals of Change Chart</title>
          <desc id="chart-description">
            A radial chart showing education domain signals of change data. The chart displays seven concentric circles representing different education domains, with signal of change labels positioned around the outer perimeter. Each signal of change can belong to multiple domains.
          </desc>
          <desc id="chart-instructions">
            Use your mouse to click on domain labels or signal of change dots to filter and interact with the chart elements.
          </desc>

          {/* Transform group for zoom and pan - all chart content goes inside this */}
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>

          {/* Concentric circles for each domain */}
          {DOMAIN_LABELS.map((domain, index) => {
            const radius = CONFIG.domainRadii[domain.id];
            const isSelected = selectedDomain === domain.id;
            const isOtherSelected = selectedDomain && selectedDomain !== domain.id;
            
            // Check if this ring is the inner boundary of the selected domain
            const selectedDomainIndex = DOMAIN_LABELS.findIndex(d => d.id === selectedDomain);
            const isInnerBoundaryOfSelected = selectedDomainIndex > 0 && index === selectedDomainIndex - 1;
            
            let strokeColor = CONFIG.ringColor;
            let strokeWidth = CONFIG.ringWidth;
            let opacity = 1.0;
            
            if (selectedScanHit) {
              // If a signal of change is selected, dim all domain ring borders
              // (the colored segments will still be highlighted)
              opacity = 0.3;
            } else if (isSelected || isInnerBoundaryOfSelected) {
              strokeColor = '#1f2937'; // Darker gray-800 for selected domain boundaries
              strokeWidth = 6; // Thicker border for selected domain boundaries
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
            x={CONFIG.centerX - 300}
            y={CONFIG.centerY - 300}
            width={600}
            height={600}
            className="transition-all duration-300 cursor-pointer hover:opacity-80"
            role="img"
            aria-label="Map of Africa silhouette"
            alt="Central map of Africa showing the geographic focus of the education domain data"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedScanHit(null);
              setSelectedDomain(null);
              setShowDefaultModal(true);
              setShowModalPanel(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedScanHit(null);
                setSelectedDomain(null);
                setShowDefaultModal(true);
                setShowModalPanel(true);
              }
            }}
            tabIndex={0}
          />

          {/* Single ring between center and first domain */}
          <circle
            cx={CONFIG.centerX}
            cy={CONFIG.centerY}
            r={225}
            fill="none"
            stroke={
              selectedScanHit 
                ? CONFIG.ringColor  // Keep normal color when scan hit is selected
                : (selectedDomain === 'teaching-learning' ? '#1f2937' : CONFIG.ringColor)
            }
            strokeWidth={
              selectedScanHit
                ? CONFIG.ringWidth  // Keep normal width when scan hit is selected
                : (selectedDomain === 'teaching-learning' ? 6 : CONFIG.ringWidth)
            }
            opacity={
              selectedScanHit 
                ? 0.3  // Dim all ring borders when scan hit is selected
                : (selectedDomain && selectedDomain !== 'teaching-learning' ? 0.3 : 1.0)
            }
            className="transition-all duration-300"
          />

          {/* Radiating segment boundary lines */}
          <g id="segment-boundaries">
            {scanHits.map((scanHit, index) => {
              const anglePerHit = 360 / scanHits.length;
              const segmentStartAngle = (index / scanHits.length) * 360;
              
              // Calculate line endpoints from center to outer ring
              const innerPoint = polarToCartesian(CONFIG.centerX, CONFIG.centerY, 0, segmentStartAngle);
              const outerPoint = polarToCartesian(CONFIG.centerX, CONFIG.centerY, CONFIG.scanHitRadius, segmentStartAngle);
              
              // Determine opacity for radiating lines
              let lineOpacity = 0.7; // Default opacity
              if (selectedScanHit) {
                // If a signal of change is selected, only show the line for that signal of change
                lineOpacity = (scanHit.id || index) === (selectedScanHit.id || scanHits.findIndex(hit => hit.id === selectedScanHit.id)) ? 0.7 : 0.1;
              } else if (selectedSteepCategory) {
                // If a STEEP category is selected, only show lines for signals of change that belong to that category
                lineOpacity = scanHit.steepCategory === selectedSteepCategory ? 0.7 : 0.1;
              } else if (showParticipantIdentifiedOnly) {
                // If participant-identified filter is active, only show participant-identified signals
                lineOpacity = scanHit.participantIdentified ? 0.7 : 0.1;
              } else if (selectedDomain) {
                // If a domain is selected, only show lines for signals of change that belong to that domain
                lineOpacity = scanHit.domains.includes(selectedDomain) ? 0.7 : 0.1;
              }
              
              return (
                <line
                  key={`boundary-${scanHit.id || index}`}
                  x1={innerPoint.x}
                  y1={innerPoint.y}
                  x2={outerPoint.x}
                  y2={outerPoint.y}
                  stroke="#e5e7eb"
                  strokeWidth="3"
                  opacity={lineOpacity}
                  className="transition-opacity duration-300"
                />
              );
            })}
          </g>

          {/* Colored arc segments - show which domains each signal of change belongs to */}
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
                // Find the previous domain radius or use center/intermediate rings
                let innerRadius;
                if (domainId === 'teaching-learning') {
                  innerRadius = 225; // Second intermediate ring
                } else {
                  const domainIndex = DOMAIN_ORDER.indexOf(domainId);
                  const previousDomainId = DOMAIN_ORDER[domainIndex - 1];
                  innerRadius = CONFIG.domainRadii[previousDomainId];
                }
                
                const outerRadius = domainRadius;
                
                // Determine opacity based on selection
                let opacity = 0.6; // Semi-transparent by default
                
                if (selectedScanHit) {
                  // If a signal of change is selected, only show segments for that specific signal of change
                  opacity = (scanHit.id || index) === (selectedScanHit.id || scanHits.findIndex(hit => hit.id === selectedScanHit.id)) ? 1.0 : 0.1;
                } else if (selectedSteepCategory) {
                  // Show segments for the selected STEEP category at full opacity
                  opacity = scanHit.steepCategory === selectedSteepCategory ? 1.0 : 0.1;
                } else if (showParticipantIdentifiedOnly) {
                  // Show segments for participant-identified signals at full opacity
                  opacity = scanHit.participantIdentified ? 1.0 : 0.1;
                } else if (selectedDomain) {
                  // Show segments for the selected domain ring at full opacity
                  // Dim segments for other domain rings
                  opacity = domainId === selectedDomain ? 1.0 : 0.2;
                }
                
                return (
                  <path
                    key={`segment-${scanHit.id || index}-${domainId}`}
                    d={createArcPath(CONFIG.centerX, CONFIG.centerY, innerRadius, outerRadius, startAngle, endAngle)}
                    fill={getSteepColor(scanHit.steepCategory)}
                    stroke="#ffffff"
                    strokeWidth="3"
                    opacity={opacity}
                    className="transition-opacity duration-200"
                  />
                );
              });
            })}
          </g>

          {/* Invisible clickable rings for each domain band - larger click targets */}
          <g id="domain-clickable-areas">
            {DOMAIN_LABELS.map((domain, index) => {
              // Calculate inner and outer radius for this domain band
              let innerRadius;
              if (index === 0) {
                innerRadius = 225; // Start from second intermediate ring
              } else {
                const previousDomainId = DOMAIN_LABELS[index - 1].id;
                innerRadius = CONFIG.domainRadii[previousDomainId];
              }
              const outerRadius = CONFIG.domainRadii[domain.id];
              
              // Create a full circle annulus path using the helper function
              const ringPath = createFullAnnulusPath(
                CONFIG.centerX, 
                CONFIG.centerY, 
                innerRadius, 
                outerRadius
              );
              
              return (
                <path
                  key={`clickable-${domain.id}`}
                  d={ringPath}
                  fill="transparent"
                  stroke="none"
                  fillRule="evenodd"
                  className="cursor-pointer transition-all duration-200 focus:outline-none"
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
                  aria-label={`Select ${domain.label} domain`}
                  aria-pressed={selectedDomain === domain.id}
                />
              );
            })}
          </g>

          {/* Signal of change labels around the outer perimeter */}
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
              const cleanTitle = scanHit.title.trim(); // Remove leading/trailing spaces
              const truncatedTitle = cleanTitle.length > 55 
                ? cleanTitle.substring(0, 52) + "..."
                : cleanTitle;
              
              // Determine opacity and styling based on selection and focus state
              let opacity = 1.0;
              let fillColor = "#4B5563";
              
              if (selectedScanHit) {
                // If a signal of change is selected, dim all other signals of change
                opacity = (scanHit.id || index) === (selectedScanHit.id || scanHits.findIndex(hit => hit.id === selectedScanHit.id)) ? 1.0 : 0.2;
              } else if (selectedSteepCategory) {
                // If a STEEP category is selected, only show labels for signals of change that belong to that category
                opacity = scanHit.steepCategory === selectedSteepCategory ? 1.0 : 0.2;
              } else if (showParticipantIdentifiedOnly) {
                // If participant-identified filter is active, only show participant-identified signals
                opacity = scanHit.participantIdentified ? 1.0 : 0.2;
              } else if (selectedDomain) {
                // If a domain is selected, only show labels for signals of change that belong to that domain
                opacity = scanHit.domains.includes(selectedDomain) ? 1.0 : 0.2;
              }
              
              // Check if this signal of change is focused
              const isFocused = focusedScanHit === (scanHit.id || index);
              if (isFocused) {
                fillColor = "#1D4ED8"; // Blue color for focused signal of change
                opacity = 1.0;
              }
              
              // Determine star position based on text rotation
              // Text on right side (0° to 180°): star at END (so it's on the outside)
              // Text on left side (180° to 360°): star at BEGINNING (so it's on the outside)
              const isRightSide = segmentCenterAngle >= 0 && segmentCenterAngle <= 180;
              const showStar = scanHit.participantIdentified;
              
              return (
                <text
                  ref={(el) => textRefs.current[`text-${index}`] = el}
                  key={`scan-hit-${scanHit.id || index}`}
                  x={position.x}
                  y={position.y}
                  fontSize="40"
                  fill={fillColor}
                  fontWeight="normal"
                  textAnchor="middle" // Back to middle since we're positioning precisely
                  dominantBaseline="middle"
                  opacity={opacity}
                  transform={`rotate(${rotation}, ${position.x}, ${position.y})`}
                  className="cursor-pointer transition-all duration-200 select-none hover:fill-gray-800 hover:opacity-80 focus:outline-none focus:fill-blue-600"
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
                  aria-label={`Signal of change: ${truncatedTitle}${scanHit.domains.length > 1 ? ` (belongs to ${scanHit.domains.length} domains)` : ''}`}
                  aria-pressed={isFocused}
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


          {/* Domain labels positioned between rings at the bottom center (180 degrees) - Rendered last to appear on top */}
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
            let position = polarToCartesian(
              CONFIG.centerX, 
              CONFIG.centerY, 
              labelRadius, 
              180
            );
            
            // If a scan hit is selected and this domain is associated with it, move label near the scan hit's segment
            if (selectedScanHit && selectedScanHit.domains && selectedScanHit.domains.includes(domain.id)) {
              // Find the scan hit's index to get its angle
              const scanHitIndex = scanHits.findIndex(hit => hit.id === selectedScanHit.id);
              if (scanHitIndex !== -1) {
                const anglePerHit = 360 / scanHits.length;
                const segmentStartAngle = (scanHitIndex / scanHits.length) * 360;
                const segmentCenterAngle = segmentStartAngle + (anglePerHit / 2);
                
                // Position label near the scan hit's segment but offset slightly to avoid overlapping colored segments
                // Use a small offset angle to position the label adjacent to the segment
                const offsetAngle = segmentCenterAngle + (segmentCenterAngle > 180 ? -15 : 15); // 15 degree offset
                
                position = polarToCartesian(
                  CONFIG.centerX,
                  CONFIG.centerY,
                  labelRadius,
                  offsetAngle
                );
              }
            }
            
            
            // Split long labels into multiple lines
            const splitLabel = domain.label.split(' ');
            const midPoint = Math.ceil(splitLabel.length / 2);
            const line1 = splitLabel.slice(0, midPoint).join(' ');
            const line2 = splitLabel.slice(midPoint).join(' ');
            
            // Determine visual state based on selection
            const isSelected = selectedDomain === domain.id;
            const isOtherSelected = selectedDomain && selectedDomain !== domain.id;
            
            let opacity = 1.0;
            
            if (selectedScanHit) {
              // If a signal of change is selected, check if this domain is associated with it
              const isAssociatedDomain = selectedScanHit.domains && selectedScanHit.domains.includes(domain.id);
              opacity = isAssociatedDomain ? 1.0 : 0.2;
            } else if (selectedSteepCategory) {
              // If a STEEP category is selected, check if this domain has signals in that category
              const hasCategorySignals = scanHits.some(hit => 
                hit.steepCategory === selectedSteepCategory && hit.domains.includes(domain.id)
              );
              opacity = hasCategorySignals ? 1.0 : 0.2;
            } else if (showParticipantIdentifiedOnly) {
              // If participant filter is active, check if this domain has participant-identified signals
              const hasParticipantSignals = scanHits.some(hit => 
                hit.participantIdentified && hit.domains.includes(domain.id)
              );
              opacity = hasParticipantSignals ? 1.0 : 0.2;
            } else if (isSelected) {
              opacity = 1.0;
            } else if (isOtherSelected) {
              opacity = 0.3;
            }
            
            return (
              <g key={`label-${domain.id}`}>
                <text
                  x={position.x}
                  y={position.y - 3}
                  fontSize="42"
                  fill="#374151"
                  textAnchor="middle"
                  opacity={opacity}
                  fontWeight="bold"
                  className="cursor-pointer transition-all duration-500 ease-in-out select-none hover:fill-gray-800 focus:outline-none focus:fill-blue-600"
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
                    y={position.y + 46}
                    fontSize="42"
                    fill="#374151"
                    textAnchor="middle"
                    opacity={opacity}
                    fontWeight="bold"
                    className="cursor-pointer transition-all duration-500 ease-in-out select-none hover:fill-gray-800"
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

          {/* Clickable center circle to show About modal - rendered last to be on top */}
          <circle
            cx={CONFIG.centerX}
            cy={CONFIG.centerY}
            r={225}
            fill="transparent"
            stroke="none"
            className="cursor-pointer transition-all duration-200 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedScanHit(null);
              setSelectedDomain(null);
              setShowDefaultModal(true);
              setShowModalPanel(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setSelectedScanHit(null);
                setSelectedDomain(null);
                setShowDefaultModal(true);
                setShowModalPanel(true);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Click center to view About the Futures of Education in Africa"
          />

          {/* End of transform group */}
          </g>
            </svg>
          </div>
        </div>
        
      </div>

      {/* Status Messages with proper ARIA live regions */}
      <div className="px-2 sm:px-4 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
        {selectedDomainLabel && (
          <div 
            className="mb-4 p-3 sm:p-4 bg-blue-100 rounded-md text-center text-xs sm:text-sm text-blue-800 font-medium"
            role="status"
            aria-live="polite"
            aria-label={`Domain filter applied`}
          >
            Showing signals of change for: <strong>{selectedDomainLabel}</strong>
          </div>
        )}
        
        {selectedSteepCategory && (
          <div 
            className="mb-4 p-3 sm:p-4 bg-purple-100 rounded-md text-center text-xs sm:text-sm text-purple-800 font-medium"
            role="status"
            aria-live="polite"
            aria-label={`STEEP category filter applied`}
          >
            Showing signals of change for: <strong>{selectedSteepCategory}</strong> category
          </div>
        )}
        
        {showParticipantIdentifiedOnly && (
          <div 
            className="mb-4 p-3 sm:p-4 bg-yellow-100 rounded-md text-center text-xs sm:text-sm text-yellow-800 font-medium"
            role="status"
            aria-live="polite"
            aria-label={`Participant-identified filter applied`}
          >
            Showing <strong>participant-identified</strong> signals of change only
          </div>
        )}
        
        <div className="min-h-[3rem] sm:min-h-[3.5rem] flex items-center justify-center transition-all duration-200">
          {hoveredDomainLabel && !selectedDomain && !selectedSteepCategory && !showParticipantIdentifiedOnly && (
            <div 
              className="p-3 sm:p-4 bg-gray-200 rounded-md text-center text-xs sm:text-sm text-gray-700 font-medium"
              role="status"
              aria-live="polite"
              aria-label={`Hovering over domain`}
            >
              Currently viewing: {hoveredDomainLabel}
            </div>
          )}
        </div>
      </div>

      {/* Information Modal - Side Panel */}
      {showModalPanel && (selectedScanHit || selectedDomain || selectedSteepCategory || showParticipantIdentifiedOnly || showDefaultModal) && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Modal Content - Full screen on mobile, right panel on desktop */}
          <div 
            className="modal-panel fixed inset-0 lg:absolute lg:right-0 lg:top-0 lg:inset-auto h-full bg-white shadow-2xl lg:border-l border-gray-200 pointer-events-auto overflow-hidden"
            style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${panelWidth}px` : '100%' }}
          >
            {/* Resize Handle - Desktop Only */}
            <div
              className="hidden lg:block absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors duration-150 group"
              onMouseDown={handleResizeStart}
              style={{ 
                borderLeft: isResizing ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              {/* Visual indicator on hover */}
              <div className="absolute inset-y-0 left-0 w-1 bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            </div>
            
            {/* Header with close button */}
            <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 pr-4 sm:pr-8 leading-tight">
                {selectedScanHit ? selectedScanHit.title : 
                 selectedDomain ? DOMAIN_LABELS.find(d => d.id === selectedDomain)?.label :
                 selectedSteepCategory ? `${selectedSteepCategory} Category` :
                 showParticipantIdentifiedOnly ? 'Participant-Identified Signals' :
                 'About the Futures of Education in Africa'}
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
            <div className="p-4 sm:p-6 overflow-y-auto h-[calc(100vh-80px)] sm:h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)]">
              {selectedScanHit ? (
                // Signal of Change Details Content
                <>
                  {/* Associated Domains */}
                  {selectedScanHit.domains && selectedScanHit.domains.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-700 mb-3">Associated Domains</h3>
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

                  {/* STEEP Category */}
                  {selectedScanHit.steepCategory && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">STEEP Category</h3>
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                        style={{ 
                          backgroundColor: getSteepColor(selectedScanHit.steepCategory) + '20',
                          color: getSteepColor(selectedScanHit.steepCategory),
                          borderColor: getSteepColor(selectedScanHit.steepCategory)
                        }}
                      >
                        {selectedScanHit.steepCategory}
                      </span>
                    </div>
                  )}

                  {/* Source */}
                  {selectedScanHit.source && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Source</h3>
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
                      <h3 className="text-lg font-semibold text-gray-700 mb-3">Description</h3>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {selectedScanHit.description}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : selectedSteepCategory ? (
                // STEEP Category Information Content
                (() => {
                  const categoryScanHits = scanHits.filter(hit => hit.steepCategory === selectedSteepCategory);
                  const domainBreakdown = categoryScanHits.reduce((acc, hit) => {
                    hit.domains.forEach(domainId => {
                      acc[domainId] = (acc[domainId] || 0) + 1;
                    });
                    return acc;
                  }, {});
                  const participantCount = categoryScanHits.filter(hit => hit.participantIdentified).length;

                  return (
                    <>
                      {/* Category Overview */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Category Overview</h3>
                        <div 
                          className="p-4 rounded-lg border-l-4"
                          style={{ 
                            backgroundColor: getSteepColor(selectedSteepCategory) + '20',
                            borderColor: getSteepColor(selectedSteepCategory)
                          }}
                        >
                          <p className="text-gray-700 leading-relaxed">
                            This category represents <strong>{selectedSteepCategory}</strong> signals of change in the futures of African education.
                          </p>
                        </div>
                      </div>

                      {/* Signals of Change Count */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Signals of Change</h3>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-2xl font-bold text-blue-800 mb-1">{categoryScanHits.length}</p>
                          <p className="text-sm text-blue-600">signals of change in this category</p>
                        </div>
                      </div>

                      {/* Participant-identified count */}
                      {participantCount > 0 && (
                        <div className="mb-6">
                          <div className="bg-yellow-50 p-4 rounded-lg flex items-center gap-3">
                            <svg width="24" height="24" viewBox="0 0 24 24" className="text-yellow-500 flex-shrink-0">
                              <path 
                                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                                fill="currentColor"
                              />
                            </svg>
                            <div>
                              <p className="text-lg font-bold text-yellow-800">{participantCount}</p>
                              <p className="text-sm text-yellow-700">participant-identified signals</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Domain Distribution */}
                      {Object.keys(domainBreakdown).length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-700 mb-3">Domain Distribution</h3>
                          <div className="space-y-2">
                            {Object.entries(domainBreakdown)
                              .sort(([, a], [, b]) => b - a)
                              .map(([domainId, count]) => {
                                const domainLabel = DOMAIN_LABELS.find(d => d.id === domainId)?.label;
                                return (
                                  <div key={domainId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-700 font-medium">{domainLabel}</span>
                                    <span className="text-gray-600 font-semibold">{count}</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : showParticipantIdentifiedOnly ? (
                // Participant-Identified Signals Content
                (() => {
                  const participantScanHits = scanHits.filter(hit => hit.participantIdentified);
                  const steepBreakdown = participantScanHits.reduce((acc, hit) => {
                    const category = hit.steepCategory || 'Unknown';
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                  }, {});
                  const domainBreakdown = participantScanHits.reduce((acc, hit) => {
                    hit.domains.forEach(domainId => {
                      acc[domainId] = (acc[domainId] || 0) + 1;
                    });
                    return acc;
                  }, {});

                  return (
                    <>
                      {/* Overview */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Overview</h3>
                        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                          <p className="text-gray-700 leading-relaxed">
                            These signals of change were identified by Youth Foresight Fellows during the participatory scanning process, 
                            representing insights directly from young people across Africa about the futures of education.
                          </p>
                        </div>
                      </div>

                      {/* Signals Count */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Participant-Identified Signals</h3>
                        <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
                          <svg width="32" height="32" viewBox="0 0 24 24" className="text-yellow-500 flex-shrink-0">
                            <path 
                              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                              fill="currentColor"
                            />
                          </svg>
                          <div>
                            <p className="text-2xl font-bold text-blue-800">{participantScanHits.length}</p>
                            <p className="text-sm text-blue-600">signals identified by participants</p>
                          </div>
                        </div>
                      </div>

                      {/* STEEP Category Breakdown */}
                      {Object.keys(steepBreakdown).length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-700 mb-3">STEEP Category Distribution</h3>
                          <div className="space-y-2">
                            {Object.entries(steepBreakdown)
                              .sort(([, a], [, b]) => b - a)
                              .map(([category, count]) => (
                                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: getSteepColor(category) }}
                                    />
                                    <span className="text-gray-700 font-medium">{category}</span>
                                  </div>
                                  <span className="text-gray-600 font-semibold">{count}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Domain Distribution */}
                      {Object.keys(domainBreakdown).length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-700 mb-3">Domain Distribution</h3>
                          <div className="space-y-2">
                            {Object.entries(domainBreakdown)
                              .sort(([, a], [, b]) => b - a)
                              .map(([domainId, count]) => {
                                const domainLabel = DOMAIN_LABELS.find(d => d.id === domainId)?.label;
                                return (
                                  <div key={domainId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-700 font-medium">{domainLabel}</span>
                                    <span className="text-gray-600 font-semibold">{count}</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              ) : selectedDomain ? (
                // Domain Information Content
                (() => {
                  const domain = DOMAIN_LABELS.find(d => d.id === selectedDomain);
                  const domainScanHits = scanHits.filter(hit => hit.domains.includes(selectedDomain));
                  const steepBreakdown = domainScanHits.reduce((acc, hit) => {
                    const category = hit.steepCategory || 'Unknown';
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                  }, {});

                  return (
                    <>
                      {/* Domain Description */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Domain Overview</h3>
                        <p className="text-gray-600 leading-relaxed mb-4">
                          {domain?.description}
                        </p>
                      </div>

                      {/* Futures Context */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Futures of Education in Africa</h3>
                        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                          <p className="text-gray-700 leading-relaxed">
                            {domain?.futuresContext}
                          </p>
                        </div>
                      </div>

                      {/* Signals of Change Count */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Signals of Change</h3>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-2xl font-bold text-blue-800 mb-1">{domainScanHits.length}</p>
                          <p className="text-sm text-blue-600">signals of change in this domain</p>
                        </div>
                      </div>

                      {/* STEEP Category Breakdown */}
                      {Object.keys(steepBreakdown).length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-700 mb-3">STEEP Category Distribution</h3>
                          <div className="space-y-2">
                            {Object.entries(steepBreakdown).map(([category, count]) => (
                              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: getSteepColor(category) }}
                                  />
                                  <span className="text-gray-700 font-medium">{category}</span>
                                </div>
                                <span className="text-gray-600 font-semibold">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </>
                  );
                })()
              ) : (
                // Default About Content
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Overview</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      This interactive radar visualization presents key insights from UNICEF's Youth Foresight Fellows Scanning initiative, 
                      exploring emerging trends and potential futures of education across Africa. The visualization maps signals of change 
                      across seven critical education domains, categorized by STEEP analysis (Social, Technological, Economic, 
                      Environmental, Political & Legal factors).
                    </p>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Signals of Change Overview</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-2xl font-bold text-blue-800 mb-1">{scanHits.length}</p>
                      <p className="text-sm text-blue-600">signals of change selected from a total of 141 signals of change submitted by Youth Foresight Fellows</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">How to Use This Tool</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Click domain rings</strong> to filter signals of change and learn about each education domain</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Click signal of change labels</strong> to view detailed information about specific trends</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Use zoom and pan controls</strong> to explore the visualization in detail</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span><strong>Refer to STEEP categories</strong> to understand the nature of each trend</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">About Futures Thinking</h3>
                    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                      <p className="text-gray-700 leading-relaxed">
                        Futures thinking recognizes that the future is not predetermined but shaped by our choices today. 
                        By exploring multiple potential futures of education in Africa, we can better prepare for uncertainty, 
                        identify opportunities for positive change, and make more informed decisions about educational policy 
                        and practice. Each signal of change represents an emerging trend that could influence how education evolves 
                        across the continent.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Help Modal */}
      {showNavigationHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          {/* Modal Content */}
          <div className="modal-panel bg-white rounded-lg shadow-2xl max-w-full sm:max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Navigation Guide</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Learn how to explore the chart</p>
              </div>
              <button
                onClick={closeNavigationHelp}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close navigation help"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-100px)] sm:max-h-[calc(90vh-120px)]">
              {/* Mouse Controls */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Mouse Controls
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Scroll wheel:</strong> Zoom in and out (centers on cursor position)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Click and drag:</strong> Pan around the chart</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Click domain rings:</strong> Filter signals of change by domain</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Click signal of change labels:</strong> View detailed information</span>
                  </li>
                </ul>
              </div>

              {/* Touch Controls */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                  </svg>
                  Touch Controls (Mobile/Tablet)
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Pinch:</strong> Zoom in and out</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Swipe:</strong> Pan around the chart</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Tap:</strong> Select domains or signals of change</span>
                  </li>
                </ul>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Keyboard Shortcuts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">+</kbd>
                    <span className="text-sm text-gray-600">Zoom in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">-</kbd>
                    <span className="text-sm text-gray-600">Zoom out</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">0</kbd>
                    <span className="text-sm text-gray-600">Reset view</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">↑↓←→</kbd>
                    <span className="text-sm text-gray-600">Pan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">Esc</kbd>
                    <span className="text-sm text-gray-600">Close modals</span>
                  </div>
                </div>
              </div>

              {/* Button Controls */}
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  Toolbar Buttons
                </h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>+ button:</strong> Zoom in</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>- button:</strong> Zoom out</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>⟲ button:</strong> Reset to original view</span>
                  </li>
                </ul>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Zoom centers on your cursor position for precise exploration</li>
                  <li>• Use the reset button if you get lost</li>
                  <li>• All interactions work together with domain filtering</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default RadialScanChart;


