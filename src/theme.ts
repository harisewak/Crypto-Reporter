import { createTheme } from '@mui/material/styles';
import { amber, grey } from '@mui/material/colors';

// Light theme configuration
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Material UI default blue
    },
    secondary: {
      main: '#dc004e', // Material UI default pink
    },
    background: {
      default: grey[100], // Light grey background
      paper: '#ffffff',   // White background for Paper components
    },
  },
});

// Dark theme configuration
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: amber[500], // Amber for primary in dark mode
    },
    secondary: {
      main: '#f48fb1', // Lighter pink for secondary in dark mode
    },
    background: {
      default: grey[900], // Dark grey background
      paper: grey[800],   // Slightly lighter grey for Paper components
    },
    text: {
      primary: '#ffffff',
      secondary: grey[500],
    },
  },
}); 