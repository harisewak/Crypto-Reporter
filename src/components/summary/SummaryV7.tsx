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
  IconButton,
  Button,
  Tooltip,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { AssetSummaryV7 } from '../../types';
import { exportV7SummaryToCSV, exportSkippedTradesV7ToCSV } from '../../exports/exportUtils';

interface SummaryV7Props {
  version: string;
  summary: Map<string, AssetSummaryV7[]>;
  skippedItems: Map<string, AssetSummaryV7[]>;
  dateSortDirection: 'asc' | 'desc';
  toggleDateSort: () => void;
}

export const SummaryV7: React.FC<SummaryV7Props> = ({
  version,
  summary,
  skippedItems,
  dateSortDirection,
  toggleDateSort,
}) => {
  if (version !== 'v7' || (summary.size === 0 && skippedItems.size === 0)) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Trade Summary Section */}
      {summary.size > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ mr: 1, mb: 0 }}>
              Trade Summary (V7 - Highlight Unmatched)
            </Typography>
            <Tooltip title={`Sort Dates ${dateSortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
              <IconButton size="small" onClick={toggleDateSort} color="primary">
                {dateSortDirection === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={() => exportV7SummaryToCSV(version, summary)}
              title={`Export V7 Summary to CSV`}
              color="primary"
            >
              <FileDownloadIcon />
            </IconButton>
          </Box>
          {/* Iterate through dates first, applying sort */}
          {Array.from(summary.entries())
            .sort((a, b) => {
              const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime();
              const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime();
              if (isNaN(dateA) || isNaN(dateB)) return a[0].localeCompare(b[0]);
              return dateSortDirection === 'asc' ? dateA - dateB : dateB - dateA;
            })
            .map(([date, summariesOnDate]) => (
              <Box key={date} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Date: {date}
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
                        <TableCell align="right">BUY IN INR</TableCell>
                        <TableCell align="right">QNTY</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summariesOnDate.sort((a, b) => a.asset.localeCompare(b.asset)).map((item) => (
                        <TableRow key={`${date}-${item.asset}`}>
                          <TableCell component="th" scope="row">{item.asset}</TableCell>
                          <TableCell align="right">{item.inrPrice > 0 ? item.inrPrice.toFixed(2) : ''}</TableCell>
                          <TableCell align="right">{item.usdtPrice > 0 ? item.usdtPrice.toFixed(2) : ''}</TableCell>
                          <TableCell align="right">{item.coinSoldQty ? item.coinSoldQty.toFixed(2) : '0.00'}</TableCell>
                          <TableCell align="right">{item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(2) : ''}</TableCell>
                          <TableCell align="right">{item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(2) : ''}</TableCell>
                          <TableCell align="right">{item.usdtPurchaseCostInr ? item.usdtPurchaseCostInr.toFixed(2) : '0.00'}</TableCell>
                          <TableCell align="right">{item.tds > 0 ? item.tds.toFixed(2) : ''}</TableCell>
                          <TableCell align="right">{item.totalRelevantInrValue ? item.totalRelevantInrValue.toFixed(2) : '0.00'}</TableCell>
                          <TableCell align="right">{item.totalRelevantInrQuantity ? item.totalRelevantInrQuantity.toFixed(2) : '0.00'}</TableCell>
                        </TableRow>
                      ))}
                      {/* Add Total Row */}
                      <TableRow
                        key={`${date}-total`}
                        sx={{
                          backgroundColor: 'action.hover',
                          fontWeight: 'bold',
                          '& th, & td': { fontWeight: 'bold' }
                        }}
                      >
                        <TableCell component="th" scope="row">Total</TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right">
                          {(() => {
                            const totalUsdtQuantity = summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0);
                            const totalUsdtCostInr = summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0);
                            return totalUsdtQuantity > 0 ? (totalUsdtCostInr / totalUsdtQuantity).toFixed(2) : '';
                          })()}
                        </TableCell>
                        <TableCell align="right">
                          {summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right"></TableCell>
                      </TableRow>
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
                  summaries.map((summary, index) => (
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