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
import { DailySellSummary } from '../../types';

interface SellSummaryProps {
  data: Map<string, DailySellSummary>;
}

export const SellSummary: React.FC<SellSummaryProps> = ({ data }) => {
  return (
    <Box sx={{ mt: 4 }}>
      {Array.from(data.entries()).map(([date, dailyData]) => (
        <Box key={date} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{date}</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                  <TableCell align="right">Avg INR Price</TableCell>
                  <TableCell align="right">Avg USDT Price</TableCell>
                  <TableCell align="right">Matched Qty</TableCell>
                  <TableCell align="right">USDT received (Ratio)</TableCell>
                  <TableCell align="right">USDT Qty (Derived)</TableCell>
                  <TableCell align="right">USDT received (INR)</TableCell>
                  <TableCell align="right">TDS</TableCell>
                  <TableCell align="right">BUY IN USDT</TableCell>
                  <TableCell align="right">QNTY</TableCell>
                  <TableCell>ERROR</TableCell>
                  <TableCell align="right">BAL QNTITY</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dailyData.summaries.map((summary, index) => (
                  <TableRow 
                    key={index}
                    sx={{ 
                      backgroundColor: summary.asset === 'TOTAL' ? 'action.hover' : 'inherit',
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell>{summary.asset}</TableCell>
                    <TableCell align="right">{summary.avgInrPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.avgUsdtPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.matchedQty.toFixed(8)}</TableCell>
                    <TableCell align="right">{summary.usdtReceivedRatio.toFixed(8)}</TableCell>
                    <TableCell align="right">{summary.usdtQtyDerived.toFixed(8)}</TableCell>
                    <TableCell align="right">{summary.usdtReceivedInr.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.tds.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.buyInUsdt.toFixed(2)}</TableCell>
                    <TableCell align="right">{summary.quantity.toFixed(8)}</TableCell>
                    <TableCell>{summary.error || ''}</TableCell>
                    <TableCell align="right">{summary.balQuantity.toFixed(8)}</TableCell>
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