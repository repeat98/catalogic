/**
 * Adjusts the luminance of a hex color
 * @param {string} hex - Hex color string
 * @param {number} lum - Luminance adjustment (-1 to 1)
 * @returns {string} Adjusted hex color
 */
export const adjustLuminance = (hex, lum = 0) => {
  hex = String(hex).replace(/[^0-9a-f]/gi, '');
  if (hex.length < 6) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  let rgb = "#";
  for (let i = 0; i < 3; i++) {
    const c = parseInt(hex.substr(i * 2, 2), 16);
    const adjustedC = Math.round(Math.min(Math.max(0, c * (1 + lum)), 255));
    rgb += ("00" + adjustedC.toString(16)).substr(adjustedC.toString(16).length);
  }
  return rgb;
};

/**
 * Generates colors for features based on their category
 * @param {Array} features - Array of feature names
 * @param {Array} colors - Array of available colors
 * @returns {Object} Map of feature names to colors
 */
export const generateFeatureColors = (features, colors) => {
  const colorMap = {};
  features.forEach((feature, index) => {
    colorMap[feature] = colors[index % colors.length];
  });
  return colorMap;
}; 