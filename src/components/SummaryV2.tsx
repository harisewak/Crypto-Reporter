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
import { AssetSummary } from '../types';

interface SummaryV2Props {
  version: string;
  summary: Map<string, AssetSummary[]>;
}

export const SummaryV2: React.FC<SummaryV2Props> = ({
  version,
  summary,
}) => {
  if (version !== 'v2' || summary.size === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Trade Summary (V2 - Original)
      </Typography>
      {/* V2 just lists assets grouped by latest date - no need for daily breakdown */}
      {Array.from(summary.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, summariesOnDate]) => (
          <Box key={date} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Latest Sell Date: {date}
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell align="right">Avg INR Price</TableCell>
                    <TableCell align="right">Avg USDT Price</TableCell>
                    <TableCell align="right">Matched Qty</TableCell>
                    <TableCell align="right">USDT Cost (Ratio)</TableCell>
                    <TableCell align="right">USDT Qty (Derived)</TableCell>
                    <TableCell align="right">USDT Cost (INR)</TableCell>
                    <TableCell align="right">TDS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Sort assets alphabetically */}
                  {summariesOnDate.sort((a, b) => a.asset.localeCompare(b.asset)).map((item) => (
                    <TableRow key={`${date}-${item.asset}`}>
                      <TableCell component="th" scope="row">{item.asset}</TableCell>
                      <TableCell align="right">{item.inrPrice.toFixed(4)}</TableCell>
                      <TableCell align="right">{item.usdtPrice.toFixed(4)}</TableCell>
                      <TableCell align="right">{item.coinSoldQty.toFixed(4)}</TableCell>
                      <TableCell align="right">{item.usdtPurchaseCost.toFixed(4)}</TableCell>
                      <TableCell align="right">{item.usdtQuantity.toFixed(4)}</TableCell>
                      <TableCell align="right">{item.usdtPurchaseCostInr.toFixed(2)}</TableCell>
                      <TableCell align="right">{item.tds > 0 ? item.tds.toFixed(2) : '-'}</TableCell>
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