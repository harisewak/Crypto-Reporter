import React, { useState, useMemo, useEffect } from 'react'
import { read, utils } from 'xlsx'
import { 
  ThemeProvider, 
} from '@mui/material/styles'
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Box,
  Alert,
  IconButton,
  CssBaseline,
  SelectChangeEvent,
  Tooltip,
  TablePagination
} from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { lightTheme, darkTheme } from './theme'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { AssetSummary, AssetSummaryV7, AssetSummaryV4, AssetSummaryV1, AssetSummaryV5, AssetSummaryV6 } from './types'
import { processTransactionsV1 } from './processors/v1'
import { processTransactionsV3 } from './processors/v3'
import { processTransactionsV4 } from './processors/v4'
import { processTransactionsV5 } from './processors/v5'
import { processTransactionsV6 } from './processors/v6'
import { processTransactionsV7 } from './processors/v7'
import { exportV3SummaryToCSV, exportV4SummaryToCSV } from './exports/exportUtils'
import { exportV5SummaryToCSV } from './exports/exportUtils'
import { exportV6SummaryToCSV } from './exports/exportUtils'
import { exportV7SummaryToCSV } from './exports/exportUtils'
import { exportSkippedTradesV7ToCSV } from './exports/exportUtils'
import { formatDateTime } from './utils/dateUtils'
import { excelSerialDateToJSDate } from './utils/dateUtils'
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { BuildInfo } from './components/BuildInfo';

function App() {
  const [data, setData] = useState<any[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [summary, setSummary] = useState<Map<string, AssetSummary[]>>(new Map())
  const [summaryV1, setSummaryV1] = useState<AssetSummaryV1[]>([])
  const [summaryV4, setSummaryV4] = useState<Map<string, AssetSummaryV4[]>>(new Map())
  const [summaryV5, setSummaryV5] = useState<Map<string, AssetSummaryV5[]>>(new Map())
  const [summaryV6, setSummaryV6] = useState<Map<string, AssetSummaryV6[]>>(new Map())
  const [summaryV7, setSummaryV7] = useState<Map<string, AssetSummaryV7[]>>(new Map())
  const [skippedItemsV7, setSkippedItemsV7] = useState<Map<string, AssetSummaryV7[]>>(new Map())
  const [error, setError] = useState<string>('')
  // Initialize themeMode from localStorage or default to 'light'
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('themeMode');
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
  });
  const [version, setVersion] = useState<'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7'>(() => {
    const savedVersion = localStorage.getItem('version') || 'v1';
    return (savedVersion === 'v1' || savedVersion === 'v2' || savedVersion === 'v3' || savedVersion === 'v4' || savedVersion === 'v5' || savedVersion === 'v6')
      ? savedVersion as 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6'
      : 'v1';
  });
  const [dateSortDirection, setDateSortDirection] = useState<'asc' | 'desc'>('asc');

  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  // Effect to save themeMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  // Effect to save version to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('version', version);
  }, [version]);

  const toggleTheme = () => {
    // No need to explicitly save here anymore, the useEffect handles it.
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const toggleDateSort = () => {
    setDateSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleVersionChange = (event: SelectChangeEvent) => {
    setVersion(event.target.value as 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6')
  }

  const theme = useMemo(() => (themeMode === 'light' ? lightTheme : darkTheme), [themeMode])

  // Main processing function that calls the appropriate version
  const processTransactions = (transactions: any[][]) => {
    console.log('Processing transactions with version:', version);
    setSummary(new Map()); // Clear summary before processing
    setSummaryV1([]);    // Clear V1 summary
    setSummaryV4(new Map()); // Clear V4 summary
    setSummaryV5(new Map()); // Clear V5 summary
    setSummaryV6(new Map()); // Clear V6 summary
    setSummaryV7(new Map()); // Clear V7 summary
    setSkippedItemsV7(new Map()); // Clear V7 skipped items
    
    try {
      switch (version) {
        case 'v1':
          const v1Summaries = processTransactionsV1(transactions);
          setSummaryV1(v1Summaries);
          break;
        case 'v3':
          const v3Summaries = processTransactionsV3(transactions);
          setSummary(v3Summaries);
          break;
        case 'v4':
          const v4Summaries = processTransactionsV4(transactions);
          setSummaryV4(v4Summaries);
          break;
        case 'v5':
          const v5Summaries = processTransactionsV5(transactions);
          setSummaryV5(v5Summaries);
          break;
        case 'v6':
          const v6Summaries = processTransactionsV6(transactions);
          setSummaryV6(v6Summaries);
          break;
        case 'v7':
          const { summaries: v7Summaries, skippedItems: v7SkippedItems } = processTransactionsV7(transactions);
          setSummaryV7(v7Summaries);
          setSkippedItemsV7(v7SkippedItems);
          break;
        default:
          console.warn('Unknown version:', version);
          break;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      // Clear all summaries on error
      setSummary(new Map());
      setSummaryV1([]);
      setSummaryV4(new Map());
      setSummaryV5(new Map());
      setSummaryV6(new Map());
      setSummaryV7(new Map());
      setSkippedItemsV7(new Map());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('')
      setData([])
      setHeaders([])
      setSummary(new Map())
      setSummaryV1([])
      setSummaryV4(new Map())
      setSummaryV5(new Map())
      setSummaryV6(new Map())

      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const workbook = read(event.target?.result, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Parse the sheet
          let jsonData: any[][] = utils.sheet_to_json(worksheet, { header: 1 })
          
          // Filter out empty rows
          jsonData = jsonData.filter(row => 
            Array.isArray(row) && 
            row.some(cell => cell !== null && cell !== undefined && cell !== '')
          )
          
          console.log('Raw loaded Excel data (first 5 rows):', jsonData.slice(0, 5))

          // Find the header row by looking for expected column names
          const expectedColumns = ['pair', 'side', 'price', 'quantity']
          let headerRowIndex = -1
          let actualHeaders: string[] = []

          // Search through first 10 rows for headers
          for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i]
            if (!Array.isArray(row)) continue

            // Convert row to lowercase strings for comparison
            const rowLower = row.map(cell => String(cell).toLowerCase().trim())
            
            // Check if this row contains our expected columns
            const hasRequiredColumns = expectedColumns.every(col => 
              rowLower.some(header => header.includes(col))
            )

            if (hasRequiredColumns) {
              headerRowIndex = i
              actualHeaders = row
              break
            }
          }

          if (headerRowIndex === -1) {
            setError('Could not find required columns (pair, side, price, quantity) in the first 10 rows.')
            return
          }

          // Get data rows after the header
          const actualRows = jsonData.slice(headerRowIndex + 1)

          // Basic validation
          if (!actualHeaders || actualHeaders.length === 0 || !actualRows || actualRows.length === 0) {
            setError('Could not parse headers or data rows correctly. Check file format.')
            return
          }

          console.log('Found headers at row:', headerRowIndex + 1)
          console.log('Processed data:', { headers: actualHeaders, rows: actualRows.slice(0, 3) })
          
          setHeaders(actualHeaders)
          setData(actualRows)
          processTransactions(actualRows)

        } catch (err) {
          console.error('Error processing Excel file:', err)
          setError('Error reading the Excel file. Please make sure it\'s a valid Excel file.')
          setData([]) 
          setHeaders([])
          setSummary(new Map()) 
          setSummaryV1([])
          setSummaryV4(new Map())
          setSummaryV5(new Map())
          setSummaryV6(new Map())
        }
      }
      reader.onerror = () => {
        setError('Error reading the file')
        setData([]) 
        setHeaders([])
        setSummary(new Map()) 
        setSummaryV1([])
        setSummaryV4(new Map())
        setSummaryV5(new Map())
        setSummaryV6(new Map())
      }
      reader.readAsBinaryString(file)
    } catch (err) {
      console.error('Error handling file upload:', err)
      setError('Error handling file upload')
      setData([]) 
      setHeaders([])
      setSummary(new Map()) 
      setSummaryV1([])
      setSummaryV4(new Map())
      setSummaryV5(new Map())
      setSummaryV6(new Map())
    }
  }

  // Pagination handlers
  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset page when rows per page changes
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header themeMode={themeMode} toggleTheme={toggleTheme} />
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <FileUpload 
          version={version}
          handleVersionChange={handleVersionChange}
          handleFileUpload={handleFileUpload}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* Debug info */}
        {(() => { console.log('Rendering with version:', version, 'summary length:', summary.size); return null; })()}
        
        {/* Summary Table (V3) */}
        {version === 'v3' && summary.size > 0 && (
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
                  const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); // Attempt to parse formatted date
                  const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); // Attempt to parse formatted date

                  // Fallback if parsing fails (though ideally dates should be stored consistently)
                  if (isNaN(dateA) || isNaN(dateB)) {
                      return dateSortDirection === 'asc'
                          ? a[0].localeCompare(b[0]) // Fallback to string compare
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
                          {/* Sort assets alphabetically within the date */}
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
        )}

        {/* Summary Table (V4 - Client) */}
        {version === 'v4' && summaryV4.size > 0 && (
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
                onClick={() => exportV4SummaryToCSV(version, summaryV4)}
                title={`Export V4 Summary to CSV`}
                color="primary"
              >
                <FileDownloadIcon />
              </IconButton>
            </Box>
            {/* Iterate through dates first, applying sort */} 
            {Array.from(summaryV4.entries())
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
                              backgroundColor: theme.palette.action.hover,
                              fontWeight: 'bold',
                              '& th, & td': { fontWeight: 'bold' }
                            }}
                          >
                            <TableCell component="th" scope="row">Total</TableCell>
                            <TableCell align="right"></TableCell>{/* Avg INR Price - Empty */}
                            <TableCell align="right"></TableCell>{/* Avg USDT Price - Empty */}
                            <TableCell align="right"></TableCell>{/* Matched Qty - Empty */}
                            <TableCell align="right"></TableCell>{/* USDT Cost (Ratio) - Empty */}
                            <TableCell align="right">
                              {summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              {summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right"></TableCell>{/* TDS - Empty */}
                            <TableCell align="right"></TableCell>{/* BUY IN INR - Empty */}
                            <TableCell align="right"></TableCell>{/* QNTY - Empty */}
                          </TableRow>
                      </TableBody>
                      </Table>
                  </TableContainer>
               </Box>
            ))}
          </Box>
        )}

        {/* Summary Table (V5 - Client Duplicate) */}
        {version === 'v5' && summaryV5.size > 0 && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ mr: 1, mb: 0 }}>
                Trade Summary (V5 - Client Dup)
              </Typography>
              <Tooltip title={`Sort Dates ${dateSortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
                  <IconButton size="small" onClick={toggleDateSort} color="primary">
                      {dateSortDirection === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
                  </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={() => exportV5SummaryToCSV(version, summaryV5)}
                title={`Export V5 Summary to CSV`}
                color="primary"
              >
                <FileDownloadIcon />
              </IconButton>
            </Box>
            {/* Iterate through dates first, applying sort */} 
            {Array.from(summaryV5.entries())
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
                              backgroundColor: theme.palette.action.hover,
                              fontWeight: 'bold',
                              '& th, & td': { fontWeight: 'bold' }
                            }}
                          >
                            <TableCell component="th" scope="row">Total</TableCell>
                            <TableCell align="right"></TableCell>{/* Avg INR Price - Empty */}
                            <TableCell align="right"></TableCell>{/* Avg USDT Price - Empty */}
                            <TableCell align="right"></TableCell>{/* Matched Qty - Empty */}
                            <TableCell align="right"></TableCell>{/* USDT Cost (Ratio) - Empty */}
                            <TableCell align="right">
                              {summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              {summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right"></TableCell>{/* TDS - Empty */}
                            <TableCell align="right"></TableCell>{/* BUY IN INR - Empty */}
                            <TableCell align="right"></TableCell>{/* QNTY - Empty */}
                          </TableRow>
                      </TableBody>
                      </Table>
                  </TableContainer>
               </Box>
            ))}
          </Box>
        )}

        {/* Summary Table (V6 - Client Duplicate) */}
        {version === 'v6' && summaryV6.size > 0 && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ mr: 1, mb: 0 }}>
                Trade Summary (V6 - Client Dup)
              </Typography>
              <Tooltip title={`Sort Dates ${dateSortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
                  <IconButton size="small" onClick={toggleDateSort} color="primary">
                      {dateSortDirection === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
                  </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={() => exportV6SummaryToCSV(version, summaryV6)}
                title={`Export V6 Summary to CSV`}
                color="primary"
              >
                <FileDownloadIcon />
              </IconButton>
            </Box>
            {/* Iterate through dates first, applying sort */} 
            {Array.from(summaryV6.entries())
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
                              backgroundColor: theme.palette.action.hover,
                              fontWeight: 'bold',
                              '& th, & td': { fontWeight: 'bold' }
                            }}
                          >
                            <TableCell component="th" scope="row">Total</TableCell>
                            <TableCell align="right"></TableCell>{/* Avg INR Price - Empty */}
                            <TableCell align="right"></TableCell>{/* Avg USDT Price - Empty */}
                            <TableCell align="right"></TableCell>{/* Matched Qty - Empty */}
                            <TableCell align="right"></TableCell>{/* USDT Cost (Ratio) - Empty */}
                            <TableCell align="right">
                              {summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              {summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right"></TableCell>{/* TDS - Empty */}
                            <TableCell align="right"></TableCell>{/* BUY IN INR - Empty */}
                            <TableCell align="right"></TableCell>{/* QNTY - Empty */}
                          </TableRow>
                      </TableBody>
                      </Table>
                  </TableContainer>
               </Box>
            ))}
          </Box>
        )}

        {/* Summary Table (V2 - Original) */}
        {version === 'v2' && summary.size > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Trade Summary (V2 - Original)
            </Typography>
             {/* V2 just lists assets grouped by latest date - no need for daily breakdown */}
             {Array.from(summary.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([date, summariesOnDate]) => (
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
        )}

        {/* Summary Table (V1) */}
        {version === 'v1' && summaryV1.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Asset Summary (Version 1)
            </Typography>
            <TableContainer component={Paper} elevation={3}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Asset</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>INR Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>USDT Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>USDT Range</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>USDT Units</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total INR Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total USDT Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Matched Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaryV1.map((row) => (
                    <TableRow 
                      key={row.asset}
                      sx={{ '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover } }}
                    >
                      <TableCell component="th" scope="row">{row.asset}</TableCell>
                      <TableCell align="right">{row.inrPrice.toFixed(8)}</TableCell>
                      <TableCell align="right">{row.usdtPrice.toFixed(8)}</TableCell>
                      <TableCell align="right">{row.usdtRange.toFixed(8)}</TableCell>
                      <TableCell align="right">{row.usdtUnits.toFixed(8)}</TableCell>
                      <TableCell align="right">{row.inrQuantity.toFixed(2)}</TableCell>
                      <TableCell align="right">{row.usdtQuantity.toFixed(2)}</TableCell>
                      <TableCell align="right">{row.matchedQuantity.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {version === 'v7' && summaryV7.size > 0 && (
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
                onClick={() => exportV7SummaryToCSV(version, summaryV7)}
                title={`Export V7 Summary to CSV`}
                color="primary"
              >
                <FileDownloadIcon />
              </IconButton>
            </Box>
            {/* Iterate through dates first, applying sort */} 
            {Array.from(summaryV7.entries())
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
                              backgroundColor: theme.palette.action.hover,
                              fontWeight: 'bold',
                              '& th, & td': { fontWeight: 'bold' }
                            }}
                          >
                            <TableCell component="th" scope="row">Total</TableCell>
                            <TableCell align="right"></TableCell>{/* Avg INR Price - Empty */}
                            <TableCell align="right"></TableCell>{/* Avg USDT Price - Empty */}
                            <TableCell align="right"></TableCell>{/* Matched Qty - Empty */}
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
                            <TableCell align="right"></TableCell>{/* TDS - Empty */}
                            <TableCell align="right"></TableCell>{/* BUY IN INR - Empty */}
                            <TableCell align="right"></TableCell>{/* QNTY - Empty */}
                          </TableRow>
                      </TableBody>
                      </Table>
                  </TableContainer>
               </Box>
            ))}
          </Box>
        )}

        {/* Summary Table */}
        {version === 'v7' && (
          <>
            {summaryV7.size > 0 && (
              <>
                <Typography variant="h6" gutterBottom>
                  Summary Table
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Asset</TableCell>
                        <TableCell>Avg INR Price</TableCell>
                        <TableCell>Avg USDT Price</TableCell>
                        <TableCell>Matched Qty</TableCell>
                        <TableCell>USDT Cost Ratio</TableCell>
                        <TableCell>USDT Qty</TableCell>
                        <TableCell>USDT Cost INR</TableCell>
                        <TableCell>TDS</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.from(summaryV7.entries()).map(([date, summaries]) =>
                        summaries.map((summary, index) => (
                          <TableRow key={`${date}-${summary.asset}-${index}`}>
                            <TableCell>{summary.displayDate}</TableCell>
                            <TableCell>{summary.asset}</TableCell>
                            <TableCell>{summary.inrPrice.toFixed(2)}</TableCell>
                            <TableCell>{summary.usdtPrice.toFixed(2)}</TableCell>
                            <TableCell>{summary.coinSoldQty.toFixed(8)}</TableCell>
                            <TableCell>{summary.usdtPurchaseCost.toFixed(8)}</TableCell>
                            <TableCell>{summary.usdtQuantity.toFixed(2)}</TableCell>
                            <TableCell>{summary.usdtPurchaseCostInr.toFixed(2)}</TableCell>
                            <TableCell>{summary.tds.toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Skipped Trades Section */}
            {skippedItemsV7.size > 0 && (
              <>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Skipped Trades
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => exportSkippedTradesV7ToCSV(skippedItemsV7)}
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
                      {Array.from(skippedItemsV7.entries()).map(([date, summaries]) =>
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
              </>
            )}
          </>
        )}

        {data.length > 0 && (
          <>
            <Typography variant="h5" component="h2" gutterBottom>
              Raw Transaction Data ({data.length} Rows)
            </Typography>
            <TableContainer component={Paper} elevation={3} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {headers.map((header, index) => (
                      <TableCell key={index} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, rowIndex) => (
                    <TableRow
                      key={page * rowsPerPage + rowIndex}
                      sx={{ '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover } }}
                    >
                      {row.map((cell: any, colIndex: number) => {
                        if (colIndex === 2) {
                          const dateNum = parseFloat(cell);
                          if (!isNaN(dateNum)) {
                            const jsDate = excelSerialDateToJSDate(dateNum);
                            return <TableCell key={colIndex}>{formatDateTime(jsDate)}</TableCell>;
                          }
                        }
                        return <TableCell key={colIndex}>{cell}</TableCell>;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100, 250, 500, { label: 'All', value: data.length }]}
              component="div"
              count={data.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Container>
      <BuildInfo />
    </ThemeProvider>
  )
}

export default App
