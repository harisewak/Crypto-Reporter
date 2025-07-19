import React, { useState } from 'react';
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
  Pagination,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
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
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(200);

  // Debug logging for V9
  if (version === 'v9') {
    console.log('[SummaryV8] V9 props:', { 
      version, 
      summarySize: summary.size, 
      skippedSize: skippedItems.size,
      sampleSummary: summary.size > 0 ? Array.from(summary.entries()).slice(0, 1) : 'none'
    });
  }

  if ((version !== 'v8' && version !== 'v9') || (summary.size === 0 && skippedItems.size === 0)) {
    console.log('[SummaryV8] Returning null:', { version, summarySize: summary.size, skippedSize: skippedItems.size });
    return null;
  }

  // Flatten and sort all summaries for pagination
  const allSummaries = (() => {
    const flattened: AssetSummaryV8[] = [];
    Array.from(summary.entries()).forEach(([, summaries]) => {
      flattened.push(...summaries);
    });
    
    // Sort by date
    return flattened.sort((a, b) => {
      const dateA = new Date(a.displayDate).getTime();
      const dateB = new Date(b.displayDate).getTime();
      return dateSortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });
  })();

  // Paginated data
  const paginatedSummaries = (() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return allSummaries.slice(startIndex, endIndex);
  })();

  const totalPages = Math.ceil(allSummaries.length / rowsPerPage);

  return (
    <Box sx={{ mb: 4 }}>
      {/* Trade Summary Section */}
      {summary.size > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mr: 1, mb: 0 }}>
              Trade Summary ({version === 'v9' ? 'V9 - Optimized FIFO' : 'V8 - FIFO Accounting'})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {paginatedSummaries.length} of {allSummaries.length} trades
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
          
          {/* Pagination Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Rows per page</InputLabel>
              <Select
                value={rowsPerPage}
                label="Rows per page"
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={200}>200</MenuItem>
                <MenuItem value={500}>500</MenuItem>
                <MenuItem value={1000}>1000</MenuItem>
              </Select>
            </FormControl>
            
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>

          {/* Paginated Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
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
                {paginatedSummaries.map((item, index) => (
                  <TableRow key={`${item.displayDate}-${item.asset}-${index}`}>
                    <TableCell component="th" scope="row">{item.displayDate}</TableCell>
                    <TableCell>{item.asset}</TableCell>
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
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Bottom Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
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