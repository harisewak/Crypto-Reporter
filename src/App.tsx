import { useState, useMemo } from 'react'
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
  AppBar,
  Toolbar,
  CssBaseline,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { lightTheme, darkTheme } from './theme'

// Function to convert Excel serial date number to JavaScript Date object
function excelSerialDateToJSDate(serial: number): Date | null {
  if (isNaN(serial) || serial <= 0) return null;
  // Excel serial date starts from 1 representing 1900-01-01 (or 1904-01-01 on Mac)
  // JavaScript Date epoch starts from 1970-01-01
  // There's also a leap year bug in Excel for 1900
  const excelEpochDiff = 25569; // Days between 1970-01-01 and 1900-01-01 (adjusting for leap year bug)
  const millisecondsPerDay = 86400 * 1000;
  const dateMilliseconds = (serial - excelEpochDiff) * millisecondsPerDay;
  
  // Basic validation for plausible date range (e.g., after year 1950)
  const jsDate = new Date(dateMilliseconds);
  if (jsDate.getFullYear() < 1950 || jsDate.getFullYear() > 2100) {
      console.warn(`Unusual date generated from serial ${serial}: ${jsDate.toISOString()}`);
      // Handle potential epoch differences or invalid serials more robustly if needed
  }
  return jsDate;
}

// Function to format Date object to 'YYYY-MM-DD HH:MM'
function formatDate(date: Date | null): string {
  if (!date) return 'Invalid Date';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

interface Transaction {
  date: string; // Store original date string/serial from Excel
  symbol: string;
  side: string;
  price: number;
  quantity: number;
  quote: string;
  tds?: number;
}

interface AssetSummary {
  displayDate: string; // Formatted date for display
  asset: string;
  inrPrice: number;
  usdtPrice: number;
  coinSoldQty: number; // Will be Math.min(inrQty, usdtQty)
  usdtPurchaseCost: number; // Ratio
  usdtQuantity: number; // New column: derived value (totalINR / Ratio)
  usdtPurchaseCostInr: number;
  tds: number;
}

// V1 summary interface (original format)
interface AssetSummaryV1 {
  asset: string;
  inrPrice: number;
  usdtPrice: number;
  usdtRange: number;
  usdtUnits: number;
  matchedQuantity: number;
  inrQuantity: number;
  usdtQuantity: number;
}

function App() {
  const [data, setData] = useState<any[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [summary, setSummary] = useState<AssetSummary[]>([])
  const [summaryV1, setSummaryV1] = useState<AssetSummaryV1[]>([])
  const [error, setError] = useState<string>('')
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')
  const [version, setVersion] = useState<'v1' | 'v2'>('v2')

  const toggleTheme = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const handleVersionChange = (event: SelectChangeEvent) => {
    setVersion(event.target.value as 'v1' | 'v2')
  }

  const theme = useMemo(() => (themeMode === 'light' ? lightTheme : darkTheme), [themeMode])

  // V1 processing logic (original)
  const processTransactionsV1 = (transactions: any[][]) => {
    try {
      setError('')
      console.log('Processing transactions (V1):', transactions.length, 'rows')
      
      const assetMap = new Map<string, Transaction[]>()
      
      transactions.forEach((row, index) => {
        try {
          if (!row || !Array.isArray(row) || row.length < 6) {
            console.log(`Skipping row ${index} due to insufficient columns:`, row)
            return
          }

          // Extract data using fixed indices
          const symbol = String(row[0]).trim()        // Pair
          const side = String(row[3]).trim().toUpperCase() // Side
          let priceStr = String(row[4])              // Price
          let quantityStr = String(row[5])           // Quantity

          let price = NaN
          let quantity = NaN

          try {
            price = parseFloat(priceStr.replace(/,/g, ''))
            quantity = parseFloat(quantityStr.replace(/,/g, ''))
          } catch (parseError) {
            console.log(`Skipping row ${index} due to invalid number format:`, row)
            return
          }
          
          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            console.log(`Skipping row ${index} due to invalid/missing data:`, { symbol, side, price, quantity, rawRow: row })
            return
          }

          const baseAsset = symbol.replace(/INR|USDT$/, '')
          const quote = symbol.endsWith('INR') ? 'INR' : 'USDT'
          
          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, [])
          }
          
          const transaction: Transaction = {
            date: '', // Not used in V1
            symbol,
            side,
            price,
            quantity,
            quote
          }

          assetMap.get(baseAsset)?.push(transaction)
        } catch (err) {
          console.error(`Error processing row ${index}:`, err, row)
        }
      })

      const summaries: AssetSummaryV1[] = []
      
      assetMap.forEach((transactions, asset) => {
        const inrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY')
        const usdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL')
        
        if (inrTrades.length > 0 && usdtTrades.length > 0) {
          // Calculate total values
          const totalInrValue = inrTrades.reduce((sum, t) => sum + t.price * t.quantity, 0)
          const totalInrQuantity = inrTrades.reduce((sum, t) => sum + t.quantity, 0)
          const totalUsdtValue = usdtTrades.reduce((sum, t) => sum + t.price * t.quantity, 0)
          const totalUsdtQuantity = usdtTrades.reduce((sum, t) => sum + t.quantity, 0)

          // Calculate average prices
          const averageInrPrice = totalInrQuantity > 0 ? totalInrValue / totalInrQuantity : 0
          const averageUsdtPrice = totalUsdtQuantity > 0 ? totalUsdtValue / totalUsdtQuantity : 0
          
          // Use the total quantities calculated from filtered trades
          const inrQuantity = totalInrQuantity
          const usdtQuantity = totalUsdtQuantity
          
          // Use the minimum quantity of matched trades for calculations
          const matchedQuantity = Math.min(inrQuantity, usdtQuantity)
          
          // Calculate USDT Range: Ratio of average INR buy price to average USDT sell price.
          const usdtRange = averageUsdtPrice > 0 ? averageInrPrice / averageUsdtPrice : 0
          
          // Calculate USDT Units: Total INR cost for matched quantity divided by USDT Range.
          const totalInrCostForMatchedQuantity = averageInrPrice * matchedQuantity
          const usdtUnits = usdtRange > 0 ? totalInrCostForMatchedQuantity / usdtRange : 0

          summaries.push({
            asset,
            inrPrice: averageInrPrice,
            usdtPrice: averageUsdtPrice,
            usdtRange,
            usdtUnits,
            matchedQuantity,
            inrQuantity,
            usdtQuantity
          })
        }
      })
      
      setSummaryV1(summaries)
      
      if (summaries.length === 0 && transactions.length > 0) {
        setError('No matching INR buys and USDT sells found in the processed data.')
      }
    } catch (err) {
      console.error('Error processing transactions:', err)
      setError('Error processing the file. Please check the console for details.')
    }
  }

  // V2 processing logic (new format)
  const processTransactionsV2 = (transactions: any[][]) => {
    try {
      setError('')
      console.log('Processing transactions (V2):', transactions.length, 'rows')
      
      const assetMap = new Map<string, Transaction[]>()
      
      transactions.forEach((row, index) => {
        try {
          if (!row || !Array.isArray(row) || row.length < 6) {
            console.log(`Skipping row ${index} due to insufficient columns:`, row)
            return
          }

          // Extract data using fixed indices
          const date = String(row[2]).trim()         // Trade_Completion_time (keep as string/serial initially)
          const symbol = String(row[0]).trim()       // Pair
          const side = String(row[3]).trim().toUpperCase() // Side
          let priceStr = String(row[4])              // Price
          let quantityStr = String(row[5])           // Quantity
          let tdsStr = String(row[7] || '')          // TDS amount (if available)

          console.log(`Processing row ${index}:`, { date, symbol, side, priceStr, quantityStr, tdsStr })

          let price = NaN
          let quantity = NaN
          let tds = 0

          try {
            price = parseFloat(priceStr.replace(/,/g, ''))
            quantity = parseFloat(quantityStr.replace(/,/g, ''))
            if (tdsStr) {
              tds = parseFloat(tdsStr.replace(/,/g, ''))
            }
          } catch (parseError) {
            console.log(`Skipping row ${index} due to invalid number format:`, row)
            return
          }
          
          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            console.log(`Skipping row ${index} due to invalid/missing data:`, { symbol, side, price, quantity, rawRow: row })
            return
          }

          const baseAsset = symbol.replace(/INR|USDT$/, '')
          const quote = symbol.endsWith('INR') ? 'INR' : 'USDT'
          
          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, [])
          }
          
          const transaction: Transaction = {
            date,
            symbol,
            side,
            price,
            quantity,
            quote,
            tds
          }

          assetMap.get(baseAsset)?.push(transaction)
        } catch (err) {
          console.error(`Error processing row ${index}:`, err, row)
        }
      })

      console.log('Asset map size:', assetMap.size)
      console.log('Asset map keys:', Array.from(assetMap.keys()))

      const summaries: AssetSummary[] = []
      
      assetMap.forEach((transactions, asset) => {
        const inrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY')
        const usdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL')
        
        console.log(`Processing ${asset}:`, { 
          inrTrades: inrTrades.length,
          usdtTrades: usdtTrades.length
        })
        
        if (inrTrades.length > 0 && usdtTrades.length > 0) {
          // Get the most recent date from the USDT sell trades and format it
          const usdtDatesSerials = usdtTrades // Use only USDT trades
            .map(t => parseFloat(t.date)) // Convert stored date string/serial to number
            .filter(d => !isNaN(d)); // Filter out invalid numbers
            
          let displayDateStr = 'N/A';
          if (usdtDatesSerials.length > 0) { // Check USDT dates
            console.log(`Asset: ${asset} - Raw USDT date values:`, usdtTrades.map(t => t.date)); // Log raw USDT dates
            const latestSerial = Math.max(...usdtDatesSerials); // Use max from USDT dates
            console.log(`Asset: ${asset} - Latest USDT date serial: ${latestSerial}`);
            const latestJSDate = excelSerialDateToJSDate(latestSerial);
            console.log(`Asset: ${asset} - Converted JS Date from USDT: ${latestJSDate?.toISOString() ?? 'null'}`);
            displayDateStr = formatDate(latestJSDate);
            console.log(`Asset: ${asset} - Formatted Date String from USDT: ${displayDateStr}`);
          }

          // Calculate total values
          const totalInrValue = inrTrades.reduce((sum, t) => sum + t.price * t.quantity, 0)
          const totalInrQuantity = inrTrades.reduce((sum, t) => sum + t.quantity, 0)
          const totalUsdtValue = usdtTrades.reduce((sum, t) => sum + t.price * t.quantity, 0)
          const totalUsdtQuantity = usdtTrades.reduce((sum, t) => sum + t.quantity, 0)
          const totalTds = usdtTrades.reduce((sum, t) => sum + (t.tds || 0), 0)

          // Calculate average prices with division-by-zero checks
          const averageInrPrice = totalInrQuantity > 0 ? totalInrValue / totalInrQuantity : 0
          const averageUsdtPrice = totalUsdtQuantity > 0 ? totalUsdtValue / totalUsdtQuantity : 0
          
          // Calculate USDT purchase cost in INR (INR cost to buy the *actual* quantity sold for USDT)
          const usdtPurchaseCostInr = averageInrPrice * totalUsdtQuantity

          // *** New Calculations based on user feedback ***
          // USDT Purchase Cost (Ratio): Avg INR Price / Avg USDT Price
          const usdtPurchaseCostRatio = averageUsdtPrice > 0 ? averageInrPrice / averageUsdtPrice : 0
          
          // Coin Sold Qty (Derived): Total INR Spent / USDT Purchase Cost Ratio
          const derivedCoinSoldQty = usdtPurchaseCostRatio > 0 ? totalInrValue / usdtPurchaseCostRatio : 0
          
          // *** Revised Calculation for Coin Sold Qty ***
          const actualMatchedQty = Math.min(totalInrQuantity, totalUsdtQuantity)
          // *********************************************

          summaries.push({
            displayDate: displayDateStr, // Use formatted date
            asset,
            inrPrice: averageInrPrice,
            usdtPrice: averageUsdtPrice,
            coinSoldQty: actualMatchedQty,       // Use Math.min quantity
            usdtPurchaseCost: usdtPurchaseCostRatio, // Use the ratio calculation
            usdtQuantity: derivedCoinSoldQty,    // Store derived value for the new column
            usdtPurchaseCostInr, // Keep original calculation for this field for now
            tds: totalTds
          })
        }
      })
      
      console.log('Final summaries count:', summaries.length)
      console.log('Summaries:', summaries)
      setSummary(summaries)
      
      if (summaries.length === 0 && transactions.length > 0) {
        setError('No matching INR buys and USDT sells found in the processed data.')
      }
    } catch (err) {
      console.error('Error processing transactions:', err)
      setError('Error processing the file. Please check the console for details.')
    }
  }

  // Main processing function that calls the appropriate version
  const processTransactions = (transactions: any[][]) => {
    console.log('Processing transactions with version:', version)
    if (version === 'v1') {
      processTransactionsV1(transactions)
    } else {
      processTransactionsV2(transactions)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('')
      setData([])
      setHeaders([])
      setSummary([])
      setSummaryV1([])

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
          setSummary([])
          setSummaryV1([])
        }
      }
      reader.onerror = () => {
        setError('Error reading the file')
        setData([]) 
        setHeaders([])
        setSummary([])
        setSummaryV1([])
      }
      reader.readAsBinaryString(file)
    } catch (err) {
      console.error('Error handling file upload:', err)
      setError('Error handling file upload')
      setData([]) 
      setHeaders([])
      setSummary([])
      setSummaryV1([])
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Crypto Trading Summary
          </Typography>
          <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
            {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Button
            variant="contained"
            component="label"
          >
            Upload Excel File
            <input
              type="file"
              hidden
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
          </Button>
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="version-select-label">Version</InputLabel>
            <Select
              labelId="version-select-label"
              value={version}
              label="Version"
              onChange={handleVersionChange}
            >
              <MenuItem value="v1">Version 1</MenuItem>
              <MenuItem value="v2">Version 2</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* Debug info */}
        {(() => { console.log('Rendering with version:', version, 'summary length:', summary.length); return null; })()}
        
        {version === 'v2' && summary.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Asset Summary (Version 2)
            </Typography>
            <TableContainer component={Paper} elevation={3}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Coin</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Coin INR Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Coin USDT Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Coin Sold Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>USDT Purchase Cost</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>USDT Quantity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>USDT Purchase Cost in INR</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>VDA to VDA TDS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.map((row) => (
                    <TableRow 
                      key={row.asset}
                      sx={{ '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover } }}
                    >
                      <TableCell>{row.displayDate}</TableCell>
                      <TableCell component="th" scope="row">{row.asset}</TableCell>
                      <TableCell align="right">{row.inrPrice.toFixed(8)}</TableCell>
                      <TableCell align="right">{row.usdtPrice.toFixed(8)}</TableCell>
                      <TableCell align="right">{row.coinSoldQty.toFixed(2)}</TableCell>
                      <TableCell align="right">{row.usdtPurchaseCost.toFixed(8)}</TableCell>
                      <TableCell align="right">{row.usdtQuantity.toFixed(2)}</TableCell>
                      <TableCell align="right">{row.usdtPurchaseCostInr.toFixed(2)}</TableCell>
                      <TableCell align="right">{row.tds.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

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

        {data.length > 0 && (
          <>
            <Typography variant="h5" component="h2" gutterBottom>
              Raw Transaction Data (First 100 Rows)
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
                  {data.slice(0, 100).map((row, rowIndex) => (
                    <TableRow 
                      key={rowIndex}
                      sx={{ '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover } }}
                    >
                      {row.map((cell: any, colIndex: number) => (
                        <TableCell key={colIndex}>{cell}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Container>
    </ThemeProvider>
  )
}

export default App
