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
  Tooltip,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { AssetSummaryV4 } from '../types';
import { exportV4SummaryToCSV } from '../exports/exportUtils';

interface SummaryV4Props {
  version: string;
  summary: Map<string, AssetSummaryV4[]>;
  dateSortDirection: 'asc' | 'desc';
  toggleDateSort: () => void;
}

export const SummaryV4: React.FC<SummaryV4Props> = ({
  version,
  summary,
  dateSortDirection,
  toggleDateSort,
}) => {
  if (version !== 'v4' || summary.size === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ mr: 1, mb: 0 }}>
          Trade Summary (V4 - Client)
        </Typography>
        <Tooltip title={`Sort Dates ${dateSortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
          <IconButton size="small" onClick={toggleDateSort} color="primary">
            {dateSortDirection === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
          </IconButton>
        </Tooltip>
        <IconButton
          size="small"
          onClick={() => exportV4SummaryToCSV(version, summary)}
          title={`Export V4 Summary to CSV`}
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
                    <TableCell align="right"></TableCell>
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
  );
}; 