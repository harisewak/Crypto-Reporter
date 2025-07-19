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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AssetSummaryV8 } from '../../types';
import { exportV8SummaryToCSV, exportSkippedTradesV8ToCSV } from '../../exports/exportUtils';

interface SummaryV8Props {
  version: string;
  summary: Map<string, AssetSummaryV8[]>;
  skippedItems: Map<string, AssetSummaryV8[]>;
  dateSortDirection: 'asc' | 'desc';
  toggleDateSort: () => void;
}

export const SummaryV8: React.FC<SummaryV8Props> = ({
  version,
  summary,
  skippedItems,
  dateSortDirection,
  toggleDateSort,
}) => {
  if (version !== 'v8' || (summary.size === 0 && skippedItems.size === 0)) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Trade Summary Section */}
      {summary.size > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ mr: 1, mb: 0 }}>
              Trade Summary (V8 - FIFO Accounting)
            </Typography>
            <Tooltip title={`Sort Dates ${dateSortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
              <IconButton size="small" onClick={toggleDateSort} color="primary">
                {dateSortDirection === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={() => exportV8SummaryToCSV(version, summary)}
              title={`Export V8 FIFO Summary to CSV`}
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
                        <TableCell align="right">FIFO Cost Basis</TableCell>
                        <TableCell align="right">Avg USDT Price</TableCell>
                        <TableCell align="right">Matched Qty</TableCell>
                        <TableCell align="right">USDT Cost (Ratio)</TableCell>
                        <TableCell align="right">USDT Qty (Derived)</TableCell>
                        <TableCell align="right">USDT Cost (INR)</TableCell>
                        <TableCell align="right">TDS</TableCell>
                        <TableCell align="right">BUY IN INR</TableCell>
                        <TableCell align="right">QNTY</TableCell>
                        <TableCell align="center">FIFO Details</TableCell>
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
                          <TableCell align="center">
                            <Accordion>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="caption">
                                  {item.fifoMatches.length} matches
                                </Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Qty</TableCell>
                                      <TableCell>Cost Basis</TableCell>
                                      <TableCell>Sell Price</TableCell>
                                      <TableCell>P&L</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {item.fifoMatches.map((match, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{match.matchedQuantity.toFixed(2)}</TableCell>
                                        <TableCell>{match.costBasis.toFixed(2)}</TableCell>
                                        <TableCell>{match.sellPrice.toFixed(2)}</TableCell>
                                        <TableCell 
                                          sx={{ 
                                            color: match.profitLoss >= 0 ? 'success.main' : 'error.main',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          {match.profitLoss.toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                                      <TableCell></TableCell>
                                      <TableCell></TableCell>
                                      <TableCell sx={{ 
                                        fontWeight: 'bold',
                                        color: item.fifoMatches.reduce((sum, match) => sum + match.profitLoss, 0) >= 0 ? 'success.main' : 'error.main'
                                      }}>
                                        {item.fifoMatches.reduce((sum, match) => sum + match.profitLoss, 0).toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </AccordionDetails>
                            </Accordion>
                          </TableCell>
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
                        <TableCell align="center">
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            Total P&L: {summariesOnDate.reduce((sum, item) => 
                              sum + item.fifoMatches.reduce((matchSum, match) => matchSum + match.profitLoss, 0), 0
                            ).toFixed(2)}
                          </Typography>
                        </TableCell>
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
              onClick={() => exportSkippedTradesV8ToCSV(skippedItems)}
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
                  <TableCell>FIFO Cost Basis</TableCell>
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