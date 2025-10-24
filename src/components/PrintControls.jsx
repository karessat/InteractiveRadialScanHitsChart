/**
 * @fileoverview Print Controls Component
 * 
 * Controls for selecting poster size and exporting chart as SVG or PNG.
 * Positioned in upper-right corner of print page.
 * 
 * @author UNICEF/Radial Interactive Team
 * @version 2.0.0
 */

import { useState } from 'react';
import { exportAsSVG, exportAsPNG } from '../utils/exportUtils';

const PrintControls = ({ svgRef }) => {
  const [sizeType, setSizeType] = useState('24x36');
  const [customWidth, setCustomWidth] = useState(24);
  const [customHeight, setCustomHeight] = useState(36);
  const [isExporting, setIsExporting] = useState(false);

  const handleSizeChange = (e) => {
    const newSizeType = e.target.value;
    setSizeType(newSizeType);
    
    // Set default custom dimensions based on selected preset
    if (newSizeType === '24x36') {
      setCustomWidth(24);
      setCustomHeight(36);
    } else if (newSizeType === '36x48') {
      setCustomWidth(36);
      setCustomHeight(48);
    }
  };

  const handleSVGExport = async () => {
    if (!svgRef.current) {
      alert('Chart not ready for export. Please wait for the chart to load.');
      return;
    }

    setIsExporting(true);
    try {
      await exportAsSVG(svgRef.current, sizeType, customWidth, customHeight);
    } catch (error) {
      alert(`SVG export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePNGExport = async () => {
    if (!svgRef.current) {
      alert('Chart not ready for export. Please wait for the chart to load.');
      return;
    }

    setIsExporting(true);
    try {
      await exportAsPNG(svgRef.current, sizeType, customWidth, customHeight, 300);
    } catch (error) {
      alert(`PNG export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 z-10">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Print Controls</h3>
      
      {/* Poster Size Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Poster Size
        </label>
        <select
          value={sizeType}
          onChange={handleSizeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="24x36">24" × 36" (Portrait)</option>
          <option value="36x48">36" × 48" (Portrait)</option>
          <option value="custom">Custom Size</option>
        </select>
      </div>

      {/* Custom Size Inputs */}
      {sizeType === 'custom' && (
        <div className="mb-4 space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Width (inches)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={customWidth}
              onChange={(e) => setCustomWidth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Height (inches)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={customHeight}
              onChange={(e) => setCustomHeight(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleSVGExport}
          disabled={isExporting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isExporting ? 'Exporting...' : 'Export SVG'}
        </button>
        
        <button
          onClick={handlePNGExport}
          disabled={isExporting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {isExporting ? 'Exporting...' : 'Export PNG (300 DPI)'}
        </button>
      </div>

      {/* Export Info */}
      <div className="mt-3 text-xs text-gray-500">
        <p>SVG: Vector format, scalable</p>
        <p>PNG: High resolution (300 DPI)</p>
        {sizeType === 'custom' && (
          <p className="mt-1">
            Custom: {customWidth}" × {customHeight}"
          </p>
        )}
      </div>
    </div>
  );
};

export default PrintControls;
