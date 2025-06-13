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
import { AssetSummary } from '../types';
import { exportV3SummaryToCSV } from '../exports/exportUtils';

interface SummaryProps {
  version: string;
  summary: Map<string, AssetSummary[]>;
  dateSortDirection: 'asc' | 'desc';
  toggleDateSort: () => void;
}

export const Summary: React.FC<SummaryProps> = ({
  version,
  summary,
  dateSortDirection,
  toggleDateSort,
}) => {
  if (version !== 'v3' || summary.size === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ mr: 1, mb: 0 }}>
          Trade Summary (V3)
        </Typography>
        <Tooltip title={`Sort Dates ${dateSortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
          <IconButton size="small" onClick={toggleDateSort} color="primary">
            {dateSortDirection === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
          </IconButton>
        </Tooltip>
        <IconButton
          size="small"
          onClick={() => exportV3SummaryToCSV(version, summary)}
          title={`Export V3 Summary to CSV`}
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

          if (isNaN(dateA) || isNaN(dateB)) {
            return dateSortDirection === 'asc'
              ? a[0].localeCompare(b[0])
              : b[0].localeCompare(a[0]);
          }

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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summariesOnDate.sort((a, b) => a.asset.localeCompare(b.asset)).map((item) => (
                    <TableRow key={`${date}-${item.asset}`}>
                      <TableCell component="th" scope="row">{item.asset}</TableCell>
                      <TableCell align="right">{item.inrPrice > 0 ? item.inrPrice.toFixed(4) : 'N/A'}</TableCell>
                      <TableCell align="right">{item.usdtPrice > 0 ? item.usdtPrice.toFixed(4) : 'N/A'}</TableCell>
                      <TableCell align="right">{item.coinSoldQty.toFixed(4)}</TableCell>
                      <TableCell align="right">{item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(4) : 'N/A'}</TableCell>
                      <TableCell align="right">{item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(4) : 'N/A'}</TableCell>
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