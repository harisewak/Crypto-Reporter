import React, { useState, useMemo } from 'react';
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
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { AssetSummaryV7 } from '../../types';
import { processPnLAnalysis, PnLSummary as PnLSummaryType } from '../../processors/pnl';

interface PnLSummaryProps {
  buyData: Map<string, AssetSummaryV7[]>;
  sellData: Map<string, AssetSummaryV7[]>;
}

export const PnLSummary: React.FC<PnLSummaryProps> = ({ buyData, sellData }) => {
  const [expanded, setExpanded] = useState<string | false>('overview');

  // Calculate P&L analysis
  const pnlAnalysis: PnLSummaryType = useMemo(() => {
    return processPnLAnalysis(buyData, sellData);
  }, [buyData, sellData]);

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Profit & Loss Analysis
      </Typography>

      {/* Overview Cards */}
      <Accordion expanded={expanded === 'overview'} onChange={handleAccordionChange('overview')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Overview</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Box sx={{ flex: '1 1 200px' }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total P&L
                  </Typography>
                  <Typography variant="h5" color={pnlAnalysis.totalProfitLoss >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(pnlAnalysis.totalProfitLoss)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Investment
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(pnlAnalysis.totalInvestment)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Overall Return
                  </Typography>
                  <Typography variant="h5" color={pnlAnalysis.overallReturn >= 0 ? 'success.main' : 'error.main'}>
                    {formatPercentage(pnlAnalysis.overallReturn)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Win Rate
                  </Typography>
                  <Typography variant="h5">
                    {formatPercentage(pnlAnalysis.winRate)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {pnlAnalysis.winningTrades}W / {pnlAnalysis.losingTrades}L
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Asset Breakdown */}
      <Accordion expanded={expanded === 'assets'} onChange={handleAccordionChange('assets')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Asset Breakdown</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                  <TableCell align="right">Trades</TableCell>
                  <TableCell align="right">Investment</TableCell>
                  <TableCell align="right">P&L</TableCell>
                  <TableCell align="right">Return %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from(pnlAnalysis.assetBreakdown.entries()).map(([asset, breakdown]) => (
                  <TableRow key={asset}>
                    <TableCell component="th" scope="row">{asset}</TableCell>
                    <TableCell align="right">{breakdown.trades}</TableCell>
                    <TableCell align="right">{formatCurrency(breakdown.totalInvestment)}</TableCell>
                    <TableCell align="right">
                      <Typography color={breakdown.totalPnL >= 0 ? 'success.main' : 'error.main'}>
                        {formatCurrency(breakdown.totalPnL)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography color={breakdown.returnPercentage >= 0 ? 'success.main' : 'error.main'}>
                        {formatPercentage(breakdown.returnPercentage)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Individual Trades */}
      <Accordion expanded={expanded === 'trades'} onChange={handleAccordionChange('trades')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Individual Trades ({pnlAnalysis.matches.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              size="small"
            >
              Export P&L Report
            </Button>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Asset</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Buy Price</TableCell>
                  <TableCell align="right">Sell Price</TableCell>
                  <TableCell align="right">P&L</TableCell>
                  <TableCell align="right">Return %</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pnlAnalysis.matches.map((match, index) => (
                  <TableRow key={index}>
                    <TableCell>{match.date}</TableCell>
                    <TableCell>{match.asset}</TableCell>
                    <TableCell align="right">{match.matchedQuantity.toFixed(4)}</TableCell>
                    <TableCell align="right">{formatCurrency(match.buyPrice)}</TableCell>
                    <TableCell align="right">{formatCurrency(match.sellPrice)}</TableCell>
                    <TableCell align="right">
                      <Typography color={match.profitLoss >= 0 ? 'success.main' : 'error.main'}>
                        {formatCurrency(match.profitLoss)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography color={match.profitLossPercentage >= 0 ? 'success.main' : 'error.main'}>
                        {formatPercentage(match.profitLossPercentage)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={match.profitLoss >= 0 ? 'Profit' : 'Loss'}
                        color={match.profitLoss >= 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};