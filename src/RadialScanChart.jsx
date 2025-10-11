import { useState, useEffect } from 'react';
import axios from 'axios';
import './RadialScanChart.css';

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
  scanHitLabelOffsetFromRing: 15, // Consistent spacing (10px padding + 5px for half font size)
  ringColor: '#d1d5db',
  ringWidth: 1.5,
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

const AFRICA_SILHOUETTE = "M 0,-50 L 8,-48 L 15,-44 L 20,-38 L 23,-30 L 24,-22 L 23,-14 L 20,-6 L 15,0 L 8,4 L 0,6 L -8,6 L -15,4 L -20,0 L -23,-6 L -24,-14 L -23,-22 L -20,-30 L -15,-38 L -8,-44 L 0,-50 M 25,8 L 30,12 L 33,18 L 34,25 L 33,32 L 30,38 L 25,42 L 18,44 L 10,44 L 3,42 L -3,38 L -8,32 L -10,25 L -10,18 L -8,12 L -3,8 Z";

// Utility function to convert polar coordinates to cartesian
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

// Data fetching function
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

// Data transformation function
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

function RadialScanChart() {
  const [scanHits, setScanHits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredDomain, setHoveredDomain] = useState(null);

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

  return (
    <div className="w-full max-w-[2000px] mx-auto p-8 bg-gray-50 rounded-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Futures Scanning Data</h1>
        <p className="text-base text-gray-600">Interactive radial visualization of education domains</p>
      </div>
      
      <div className="bg-white rounded-lg p-8 shadow-md flex justify-center items-center">
        <svg 
          viewBox="0 0 2000 2000" 
          className="max-w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Concentric circles for each domain */}
          {DOMAIN_LABELS.map((domain) => {
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
                className="transition-all duration-300"
              />
            );
          })}

          {/* Simple black circle in the center */}
          <circle
            cx={CONFIG.centerX}
            cy={CONFIG.centerY}
            r={50}
            fill="#1f2937"
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
            
            return (
              <g key={`label-${domain.id}`}>
                <text
                  x={position.x}
                  y={position.y - 3}
                  fontSize="10"
                  fill="#374151"
                  textAnchor="middle"
                  className="cursor-pointer transition-all duration-300 select-none hover:fill-gray-800 hover:font-semibold"
                  onMouseEnter={() => setHoveredDomain(domain.id)}
                  onMouseLeave={() => setHoveredDomain(null)}
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
                    className="cursor-pointer transition-all duration-300 select-none hover:fill-gray-800 hover:font-semibold"
                    onMouseEnter={() => setHoveredDomain(domain.id)}
                    onMouseLeave={() => setHoveredDomain(null)}
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
                
                return (
                  <circle
                    key={`dot-${scanHit.id || index}-${domainId}`}
                    cx={position.x}
                    cy={position.y}
                    r={5}
                    fill="#374151"
                    stroke="white"
                    strokeWidth={1.5}
                    opacity={0.8}
                    className="cursor-pointer transition-opacity duration-200 hover:opacity-100"
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
              
              // Step 2: Calculate position so inner edge is always one space from outer ring
              const desiredGap = 10; // One space (10px) gap from outer ring
              const innerEdgeRadius = CONFIG.scanHitRadius + desiredGap;
              const textCenterRadius = innerEdgeRadius + 5; // Add half font size to position text center
              
              const position = polarToCartesian(
                CONFIG.centerX,
                CONFIG.centerY,
                textCenterRadius,
                angle
              );
              
              // Step 3: Handle text rotation to keep text right-side-up
              let rotation;
              let textAnchor = "middle"; // Center the text on the position
              
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
              
              return (
                <text
                  key={`scan-hit-${scanHit.id || index}`}
                  x={position.x}
                  y={position.y}
                  fontSize="10"
                  fill="#4B5563"
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                  transform={`rotate(${rotation}, ${position.x}, ${position.y})`}
                  className="cursor-pointer transition-all duration-200 select-none hover:fill-gray-800 hover:font-semibold"
                >
                  {truncatedTitle}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {hoveredDomain && (
        <div className="mt-6 p-4 bg-gray-200 rounded-md text-center text-sm text-gray-700 font-medium">
          Currently viewing: {DOMAIN_LABELS.find(d => d.id === hoveredDomain)?.label}
        </div>
      )}
    </div>
  );
}

export default RadialScanChart;

