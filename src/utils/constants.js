// --- Layout Constants ---
export const PADDING = 50;
export const PCA_N_COMPONENTS = 2;
export const HDBSCAN_DEFAULT_MIN_CLUSTER_SIZE = 3;
export const HDBSCAN_DEFAULT_MIN_SAMPLES = 2;
export const NOISE_CLUSTER_ID = -1;

// --- Colors ---
export const NOISE_CLUSTER_COLOR = '#AAAAAA';
export const HIGHLIGHT_COLOR = '#FF5A16';
export const LASSO_COLOR = '#6A82FB';

export const DEFAULT_CLUSTER_COLORS = [
  '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
  '#008080', '#e6beff', '#9A6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080',
  '#54A0FF', '#F4D03F', '#1ABC9C', '#E74C3C', '#8E44AD'
];

export const CATEGORY_BASE_COLORS = {
  'genre': '#F44336',
  'style': '#4CAF50',
  'spectral': '#2196F3',
  'mood': '#FF9800',
  'instrument': '#9C27B0',
};

// --- Dark Mode Theme ---
export const DARK_MODE_TEXT_PRIMARY = '#e0e0e0';
export const DARK_MODE_TEXT_SECONDARY = '#b0b0b0';
export const DARK_MODE_SURFACE_ALT = '#3a3a3a';
export const DARK_MODE_BORDER = '#4a4a4a';

// --- Feature Processing ---
export const CATEGORY_WEIGHTS = {
  'genre': 0.2,
  'style': 1,
  'spectral': 0,
  'mood': 0.1,
  'instrument': 0,
  'default': 0,
};

export const SPECTRAL_KEYWORDS = [
  'atonal', 'tonal', 'dark', 'bright', 'percussive', 'smooth', 'lufs'
];

// --- Visualization Modes ---
export const VISUALIZATION_MODES = { 
  SIMILARITY: 'similarity', 
  XY: 'xy' 
};

// --- API ---
export const API_BASE_URL = 'http://localhost:3000'; 