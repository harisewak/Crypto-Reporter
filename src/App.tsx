import { useState, useMemo } from 'react'
import { read, utils } from 'xlsx'
import { 
  ThemeProvider, 
  createTheme, 
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
  CssBaseline
} from '@mui/material'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { lightTheme, darkTheme } from './theme'

interface Transaction {
  symbol: string;
  side: string;
  price: number;
  quantity: number;
  quote: string;
}

interface AssetSummary {
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
  const [error, setError] = useState<string>('')
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')

  const toggleTheme = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const theme = useMemo(() => (themeMode === 'light' ? lightTheme : darkTheme), [themeMode])

  const processTransactions = (transactions: any[][]) => {
    try {
      setError('')
      console.log('Processing transactions:', transactions.length, 'rows')
      console.log('First 3 rows passed to processTransactions:', transactions.slice(0, 3))
      
      // Removed dynamic column index detection - using fixed indices based on user-provided format
      // Pair: 0, Side: 3, Price: 4, Quantity: 5

      const assetMap = new Map<string, Transaction[]>()
      
      transactions.forEach((row, index) => {
        try {
          // Check if row has enough columns for required data (at least 6 columns: 0 to 5)
          if (!row || !Array.isArray(row) || row.length < 6) {
            console.log(`Skipping row ${index} due to insufficient columns:`, row)
            return
          }

          // Extract data using fixed indices
          const symbol = String(row[0]).trim()        // Pair from col A (index 0)
          const side = String(row[3]).trim().toUpperCase() // Side from col D (index 3)
          let priceStr = String(row[4])              // Price from col E (index 4)
          let quantityStr = String(row[5])           // Quantity from col F (index 5)

          // Try to parse price and quantity, handling commas and potential errors
          let price = NaN
          let quantity = NaN

          try {
            price = parseFloat(priceStr.replace(/,/g, ''))
          } catch (parseError) {
            console.log(`Skipping row ${index} due to invalid price format: ${priceStr}`, row)
            return
          }
          try {
            quantity = parseFloat(quantityStr.replace(/,/g, ''))
          } catch (parseError) {
            console.log(`Skipping row ${index} due to invalid quantity format: ${quantityStr}`, row)
            return
          }
          
          // Validate parsed values
          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            console.log(`Skipping row ${index} due to invalid/missing data:`, { symbol, side, price, quantity, rawRow: row })
            return
          }

          const baseAsset = symbol.replace(/INR|USDT$/, '')
          const quote = symbol.endsWith('INR') ? 'INR' : 'USDT' // Determine quote from symbol
          
          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, [])
          }
          
          const transaction: Transaction = {
            symbol,
            side,
            price,
            quantity,
            quote: quote
          }

          // console.log(`Adding transaction for ${baseAsset}:`, transaction) // Optional: uncomment for detailed logging
          assetMap.get(baseAsset)?.push(transaction)
        } catch (err) {
          console.error(`Error processing row ${index}:`, err, row)
        }
      })

      console.log('Asset map size:', assetMap.size)

      const summaries: AssetSummary[] = []
      
      assetMap.forEach((transactions, asset) => {
        // Filter for INR Buy trades and USDT Sell trades using Side column (index 3)
        const inrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY');
        const usdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL');
        
        // console.log(`Processing ${asset}:`, { 
        //   inrBuyTrades: inrTrades.length, // Use BUY/SELL in logs
        //   usdtSellTrades: usdtTrades.length, // Use BUY/SELL in logs
        //   inrTradesData: inrTrades,
        //   usdtTradesData: usdtTrades
        // }); // Optional: uncomment for detailed logging
        
        // Ensure we have matched trades to process
        if (inrTrades.length > 0 && usdtTrades.length > 0) {
          // Calculate total value and quantity for weighted average price
          const totalInrValue = inrTrades.reduce((sum, t) => sum + t.price * t.quantity, 0);
          const totalInrQuantity = inrTrades.reduce((sum, t) => sum + t.quantity, 0);
          const totalUsdtValue = usdtTrades.reduce((sum, t) => sum + t.price * t.quantity, 0);
          const totalUsdtQuantity = usdtTrades.reduce((sum, t) => sum + t.quantity, 0);

          // Calculate weighted average prices, handle division by zero
          const averageInrPrice = totalInrQuantity > 0 ? totalInrValue / totalInrQuantity : 0;
          const averageUsdtPrice = totalUsdtQuantity > 0 ? totalUsdtValue / totalUsdtQuantity : 0;
          
          // Use the total quantities calculated from filtered trades
          const inrQuantity = totalInrQuantity; 
          const usdtQuantity = totalUsdtQuantity;
          
          // Use the minimum quantity of matched trades for calculations
          const matchedQuantity = Math.min(inrQuantity, usdtQuantity);
          
          // Calculate USDT Range: Ratio of average INR buy price to average USDT sell price.
          // Represents the effective USDT price in INR.
          const usdtRange = averageUsdtPrice > 0 ? averageInrPrice / averageUsdtPrice : 0;
          
          // Calculate USDT Units: Total INR cost for matched quantity divided by USDT Range.
          // Represents the total USDT value received for the matched quantity sold.
          const totalInrCostForMatchedQuantity = averageInrPrice * matchedQuantity;
          const usdtUnits = usdtRange > 0 ? totalInrCostForMatchedQuantity / usdtRange : 0;
          
          // console.log(`Calculated values for ${asset}:`, { // Optional: uncomment for detailed logging
          //   averageInrPrice,
          //   averageUsdtPrice,
          //   inrQuantity,
          //   usdtQuantity,
          //   matchedQuantity,
          //   usdtRange,
          //   usdtUnits
          // });

          summaries.push({
            asset,
            inrPrice: averageInrPrice, // Use average price
            usdtPrice: averageUsdtPrice, // Use average price
            usdtRange,
            usdtUnits,
            matchedQuantity,
            inrQuantity,
            usdtQuantity
          });
        }
      })
      
      console.log('Final summaries count:', summaries.length)
      setSummary(summaries)
      
      if (summaries.length === 0 && transactions.length > 0) { // Show error only if there was data but no matches
        setError('No matching INR buys and USDT sells found in the processed data.')
      }
    } catch (err) {
      console.error('Error processing transactions:', err)
      setError('Error processing the file. Please check the console for details.')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('')
      setData([])
      setHeaders([])
      setSummary([])

      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const workbook = read(event.target?.result, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Parse the sheet, expecting headers on row 1 initially by default library behavior
          let jsonData: any[][] = utils.sheet_to_json(worksheet, { header: 1 })
          
          console.log('Raw loaded Excel data (first 5 rows):', jsonData.slice(0, 5))

          // Check if data has at least 3 rows (2 blank/meta rows + 1 header row)
          if (jsonData.length < 3) {
            setError('Excel file does not have enough rows for headers (expected on row 3)')
            setData([])
            setHeaders([])
            setSummary([])
            return;
          }

          // Assuming headers are on the 3rd row (index 2)
          const actualHeaders = jsonData[2] as string[]
          // Data starts from the 4th row (index 3)
          const actualRows = jsonData.slice(3) as any[][]

          // Basic validation: check if we have headers and rows
          if (!actualHeaders || actualHeaders.length === 0 || !actualRows) {
             setError('Could not parse headers or data rows correctly. Check file format.')
             setData([])
             setHeaders([])
             setSummary([])
             return;
          }

          console.log('Processed data:', { headers: actualHeaders, rows: actualRows.slice(0, 3) })
          setHeaders(actualHeaders) // Set the actual headers
          setData(actualRows)       // Set the actual data rows
          processTransactions(actualRows) // Pass the actual data rows

        } catch (err) {
          console.error('Error processing Excel file:', err)
          setError('Error reading the Excel file. Please make sure it\'s a valid Excel file.')
          // Clear data display on error
          setData([]) 
          setHeaders([])
          setSummary([])
        }
      }
      reader.onerror = () => {
        setError('Error reading the file')
        // Clear data display on error
        setData([]) 
        setHeaders([])
        setSummary([])
      }
      reader.readAsBinaryString(file)
    } catch (err) {
      console.error('Error handling file upload:', err)
      setError('Error handling file upload')
      // Clear data display on error
      setData([]) 
      setHeaders([])
      setSummary([])
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
        
        <Button
          variant="contained"
          component="label"
          sx={{ mb: 4 }}
        >
          Upload Excel File
          <input
            type="file"
            hidden
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
          />
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {summary.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Asset Summary
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
                  {summary.map((row) => (
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
