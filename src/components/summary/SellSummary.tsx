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
  Box,
  IconButton,
  Button,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { AssetSummaryV7 } from '../../types';
import { exportSellSummaryToCSV, exportSkippedTradesV7ToCSV } from '../../exports/exportUtils';

interface SellSummaryProps {
  data: Map<string, AssetSummaryV7[]>;
  skippedItems?: Map<string, AssetSummaryV7[]>;
}

export const SellSummary: React.FC<SellSummaryProps> = ({ data, skippedItems = new Map() }) => {
  return (
    <Box sx={{ mt: 4 }}>
      {/* Sell Summary Section */}
      {data.size > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mr: 1, mb: 0 }}>
              Sell Summary
            </Typography>
            <IconButton
              size="small"
              onClick={() => exportSellSummaryToCSV(data)}
              title="Export Sell Summary to CSV"
              color="primary"
            >
              <FileDownloadIcon />
            </IconButton>
          </Box>
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
                    {summaries.map((summary: AssetSummaryV7, index: number) => (
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
      )}

      {/* Skipped Trades Section */}
      {skippedItems.size > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Skipped Trades
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => exportSkippedTradesV7ToCSV(skippedItems)}
              startIcon={<FileDownloadIcon />}
            >
              Download Skipped Trades
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Asset</TableCell>
                  <TableCell>Avg INR Price</TableCell>
                  <TableCell>Avg USDT Price</TableCell>
                  <TableCell>Total Qty</TableCell>
                  <TableCell>USDT Qty</TableCell>
                  <TableCell>TDS</TableCell>
                  <TableCell>Total INR Value</TableCell>
                  <TableCell>Total INR Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from(skippedItems.entries()).map(([date, summaries]) =>
                  summaries.map((summary: AssetSummaryV7, index: number) => (
                    <TableRow key={`skipped-${date}-${summary.asset}-${index}`}>
                      <TableCell>{summary.displayDate}</TableCell>
                      <TableCell>{summary.asset}</TableCell>
                      <TableCell>{summary.inrPrice.toFixed(2)}</TableCell>
                      <TableCell>{summary.usdtPrice.toFixed(2)}</TableCell>
                      <TableCell>{summary.coinSoldQty.toFixed(8)}</TableCell>
                      <TableCell>{summary.usdtQuantity.toFixed(2)}</TableCell>
                      <TableCell>{summary.tds.toFixed(2)}</TableCell>
                      <TableCell>{summary.totalRelevantInrValue.toFixed(2)}</TableCell>
                      <TableCell>{summary.totalRelevantInrQuantity.toFixed(8)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}; 