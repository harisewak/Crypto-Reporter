import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box
} from '@mui/material';
import { AssetSummaryV7 } from '../../types';

interface SellSummaryProps {
  data: Map<string, AssetSummaryV7[]>;
}

export const SellSummary: React.FC<SellSummaryProps> = ({ data }) => {
  return (
    <Box sx={{ mt: 4 }}>
      {Array.from(data.entries()).map(([date, summaries]) => (
        <Box key={date} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{date}</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                  <TableCell align="right">INR Price</TableCell>
                  <TableCell align="right">USDT Price</TableCell>
                  <TableCell align="right">Coin Sold Qty</TableCell>
                  <TableCell align="right">USDT Purchase Cost</TableCell>
                  <TableCell align="right">USDT Quantity</TableCell>
                  <TableCell align="right">USDT Purchase Cost (INR)</TableCell>
                  <TableCell align="right">TDS</TableCell>
                  <TableCell align="right">Total Relevant INR Value</TableCell>
                  <TableCell align="right">Total Relevant INR Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summaries.map((summary, index) => (
                  <TableRow 
                    key={index}
                    sx={{ 
                      backgroundColor: summary.asset === 'TOTAL' ? 'action.hover' : 'inherit',
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell>{summary.asset}</TableCell>
                    <TableCell align="right">{summary.inrPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.usdtPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.coinSoldQty.toFixed(8)}</TableCell>
                    <TableCell align="right">{summary.usdtPurchaseCost.toFixed(8)}</TableCell>
                    <TableCell align="right">{summary.usdtQuantity.toFixed(8)}</TableCell>
                    <TableCell align="right">{summary.usdtPurchaseCostInr.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.tds.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.totalRelevantInrValue.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.totalRelevantInrQuantity.toFixed(8)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
}; 