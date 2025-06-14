import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { AssetSummaryV1 } from '../../types';

interface SummaryV1Props {
  version: string;
  summary: AssetSummaryV1[];
}

export const SummaryV1: React.FC<SummaryV1Props> = ({
  version,
  summary,
}) => {
  if (version !== 'v1' || summary.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Asset Summary (Version 1)
      </Typography>
      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Asset</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>INR Price</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>USDT Price</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>USDT Range</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>USDT Units</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total INR Qty</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total USDT Qty</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Matched Qty</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summary.map((row) => (
              <TableRow 
                key={row.asset}
                sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}
              >
                <TableCell component="th" scope="row">{row.asset}</TableCell>
                <TableCell align="right">{row.inrPrice.toFixed(8)}</TableCell>
                <TableCell align="right">{row.usdtPrice.toFixed(8)}</TableCell>
                <TableCell align="right">{row.usdtRange.toFixed(8)}</TableCell>
                <TableCell align="right">{row.usdtUnits.toFixed(8)}</TableCell>
                <TableCell align="right">{row.inrQuantity.toFixed(2)}</TableCell>
                <TableCell align="right">{row.usdtQuantity.toFixed(2)}</TableCell>
                <TableCell align="right">{row.matchedQuantity.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}; 