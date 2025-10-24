/**
 * @fileoverview Export Utilities for Print Chart
 * 
 * Utility functions for exporting SVG and PNG formats at high resolution
 * for print-ready poster generation.
 * 
 * @author UNICEF/Radial Interactive Team
 * @version 2.0.0
 */

/**
 * Convert inches to pixels at specified DPI
 * @param {number} inches - Size in inches
 * @param {number} dpi - Dots per inch (default 300)
 * @returns {number} Size in pixels
 */
const inchesToPixels = (inches, dpi = 300) => {
  return Math.round(inches * dpi);
};

/**
 * Serialize SVG element to string with inline styles
 * @param {SVGElement} svgElement - The SVG element to serialize
 * @returns {string} SVG string
 */
export const serializeSVG = (svgElement) => {
  if (!svgElement) {
    throw new Error('SVG element is required');
  }

  // Clone the SVG to avoid modifying the original
  const clonedSvg = svgElement.cloneNode(true);
  
  // Get computed styles and inline them
  const allElements = clonedSvg.querySelectorAll('*');
  allElements.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    const styleProps = [
      'fill', 'stroke', 'stroke-width', 'font-size', 'font-family', 
      'font-weight', 'text-anchor', 'dominant-baseline', 'opacity',
      'transform', 'transform-origin'
    ];
    
    let inlineStyle = '';
    styleProps.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'initial' && value !== 'inherit') {
        inlineStyle += `${prop}: ${value}; `;
      }
    });
    
    if (inlineStyle) {
      element.setAttribute('style', inlineStyle);
    }
  });

  // Serialize to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(clonedSvg);
};

/**
 * Download SVG file
 * @param {string} svgString - SVG content as string
 * @param {string} filename - Filename for download
 */
export const downloadSVG = (svgString, filename = 'radial-chart.svg') => {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Convert SVG to PNG using Canvas API
 * @param {SVGElement} svgElement - The SVG element to convert
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @param {number} dpi - DPI for scaling (default 300)
 * @returns {Promise<Blob>} PNG blob
 */
export const svgToPNG = async (svgElement, width, height, dpi = 300) => {
  if (!svgElement) {
    throw new Error('SVG element is required');
  }

  return new Promise((resolve, reject) => {
    try {
      // Calculate scale factor for DPI
      const scaleFactor = dpi / 96; // 96 is browser default DPI
      const scaledWidth = Math.round(width * scaleFactor);
      const scaledHeight = Math.round(height * scaleFactor);

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Set high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Create image from SVG
      const svgString = serializeSVG(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        try {
          // Draw image to canvas
          ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
          
          // Convert to PNG blob
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(svgUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create PNG blob'));
            }
          }, 'image/png', 1.0);
        } catch (error) {
          URL.revokeObjectURL(svgUrl);
          reject(error);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Failed to load SVG image'));
      };
      
      img.src = svgUrl;
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Download PNG file
 * @param {Blob} pngBlob - PNG blob
 * @param {string} filename - Filename for download
 */
export const downloadPNG = (pngBlob, filename = 'radial-chart.png') => {
  const url = URL.createObjectURL(pngBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Calculate dimensions for poster sizes
 * @param {string} sizeType - Size type: '24x36', '36x48', or 'custom'
 * @param {number} customWidth - Custom width in inches (for custom size)
 * @param {number} customHeight - Custom height in inches (for custom size)
 * @param {number} dpi - DPI for calculation (default 300)
 * @returns {Object} Object with width, height, and aspect ratio
 */
export const calculatePosterDimensions = (sizeType, customWidth = 0, customHeight = 0, dpi = 300) => {
  let widthInches, heightInches;
  
  switch (sizeType) {
    case '24x36':
      widthInches = 24;
      heightInches = 36;
      break;
    case '36x48':
      widthInches = 36;
      heightInches = 48;
      break;
    case 'custom':
      widthInches = customWidth;
      heightInches = customHeight;
      break;
    default:
      throw new Error(`Unknown size type: ${sizeType}`);
  }
  
  if (widthInches <= 0 || heightInches <= 0) {
    throw new Error('Invalid dimensions: width and height must be positive');
  }
  
  const widthPixels = inchesToPixels(widthInches, dpi);
  const heightPixels = inchesToPixels(heightInches, dpi);
  const aspectRatio = widthInches / heightInches;
  
  return {
    widthInches,
    heightInches,
    widthPixels,
    heightPixels,
    aspectRatio,
    dpi
  };
};

/**
 * Calculate viewBox for SVG based on poster dimensions
 * @param {Object} dimensions - Dimensions object from calculatePosterDimensions
 * @param {number} originalSize - Original SVG size (default 5000)
 * @returns {string} ViewBox string
 */
export const calculateViewBox = (dimensions, originalSize = 5000) => {
  const { aspectRatio } = dimensions;
  
  // If poster is square or landscape, use original square layout
  if (aspectRatio >= 1) {
    return `0 0 ${originalSize} ${originalSize}`;
  }
  
  // For portrait posters, adjust viewBox to maintain aspect ratio
  const adjustedHeight = originalSize / aspectRatio;
  return `0 0 ${originalSize} ${adjustedHeight}`;
};

/**
 * Export chart as SVG
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {string} sizeType - Poster size type
 * @param {number} customWidth - Custom width (for custom size)
 * @param {number} customHeight - Custom height (for custom size)
 */
export const exportAsSVG = (svgElement, sizeType, customWidth = 0, customHeight = 0) => {
  try {
    const dimensions = calculatePosterDimensions(sizeType, customWidth, customHeight);
    const viewBox = calculateViewBox(dimensions);
    
    // Update SVG viewBox
    svgElement.setAttribute('viewBox', viewBox);
    
    // Serialize and download
    const svgString = serializeSVG(svgElement);
    const filename = `radial-chart-${sizeType}-${dimensions.widthInches}x${dimensions.heightInches}.svg`;
    
    downloadSVG(svgString, filename);
    
    // Restore original viewBox
    svgElement.setAttribute('viewBox', '0 0 5000 5000');
    
  } catch (error) {
    console.error('SVG export failed:', error);
    throw error;
  }
};

/**
 * Export chart as PNG
 * @param {SVGElement} svgElement - The SVG element to export
 * @param {string} sizeType - Poster size type
 * @param {number} customWidth - Custom width (for custom size)
 * @param {number} customHeight - Custom height (for custom size)
 * @param {number} dpi - DPI for PNG (default 300)
 */
export const exportAsPNG = async (svgElement, sizeType, customWidth = 0, customHeight = 0, dpi = 300) => {
  try {
    const dimensions = calculatePosterDimensions(sizeType, customWidth, customHeight, dpi);
    const viewBox = calculateViewBox(dimensions);
    
    // Update SVG viewBox temporarily
    svgElement.setAttribute('viewBox', viewBox);
    
    // Convert to PNG
    const pngBlob = await svgToPNG(svgElement, dimensions.widthPixels, dimensions.heightPixels, dpi);
    const filename = `radial-chart-${sizeType}-${dimensions.widthInches}x${dimensions.heightInches}-${dpi}dpi.png`;
    
    downloadPNG(pngBlob, filename);
    
    // Restore original viewBox
    svgElement.setAttribute('viewBox', '0 0 5000 5000');
    
  } catch (error) {
    console.error('PNG export failed:', error);
    throw error;
  }
};
