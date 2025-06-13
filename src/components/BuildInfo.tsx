import { Box, Typography } from '@mui/material';

export const BuildInfo = () => {
  return (
    (import.meta.env.VITE_GIT_COMMIT_HASH || import.meta.env.VITE_BUILD_TIMESTAMP) && (
      <Box sx={{ 
        position: 'fixed', 
        bottom: 8, 
        right: 8, 
        px: 1, 
        py: 0.5, 
        backgroundColor: 'rgba(128, 128, 128, 0.1)', 
        borderRadius: 1, 
        textAlign: 'right' 
      }}>
        {import.meta.env.VITE_GIT_COMMIT_HASH && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Build: {import.meta.env.VITE_GIT_COMMIT_HASH}
          </Typography>
        )}
        {import.meta.env.VITE_BUILD_TIMESTAMP && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Updated: {new Date(import.meta.env.VITE_BUILD_TIMESTAMP).toLocaleString()}
          </Typography>
        )}
      </Box>
    )
  );
}; 