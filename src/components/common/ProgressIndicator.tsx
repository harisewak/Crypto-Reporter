import React, { useEffect, useState } from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Paper,
} from '@mui/material';

interface ProgressIndicatorProps {
  isVisible: boolean;
  phase: string;
  current: number;
  total: number;
  percentage: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isVisible,
  phase,
  current,
  total,
  percentage,
}) => {
  const [showCompletion, setShowCompletion] = useState(false);

  // Show completion message when processing is done
  useEffect(() => {
    if (isVisible && percentage === 100) {
      setShowCompletion(true);
      // Hide after 2 seconds to show completion
      const timer = setTimeout(() => {
        setShowCompletion(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (!isVisible) {
      setShowCompletion(false);
    }
  }, [isVisible, percentage]);

  if (!isVisible && !showCompletion) {
    return null;
  }

  const isComplete = percentage === 100;

  return (
    <Paper sx={{ p: 2, mb: 2, backgroundColor: 'background.default' }}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {isComplete ? 'Processing Complete' : phase}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {percentage}% ({current.toLocaleString()} / {total.toLocaleString()})
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={percentage} 
          sx={{ 
            height: 8, 
            borderRadius: 4,
            '& .MuiLinearProgress-bar': {
              backgroundColor: isComplete ? 'success.main' : 'primary.main'
            }
          }}
        />
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {isComplete 
              ? 'Processing completed successfully!' 
              : `Processing ${phase.toLowerCase()}... Please wait.`
            }
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}; 