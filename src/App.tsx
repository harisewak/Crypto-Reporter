import { useState } from 'react'
import { read, utils } from 'xlsx'
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
  Alert
} from '@mui/material'

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
  usdtRange: number;
  usdtUnits: number;
  matchedQuantity: number;
}

function App() {
  const [data, setData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [summary, setSummary] = useState<AssetSummary[]>([])
  const [error, setError] = useState<string>('')

  const processTransactions = (transactions: any[]) => {
    try {
      setError('')
      console.log('Processing transactions:', transactions)
      
      if (!Array.isArray(transactions) || transactions.length === 0) {
        setError('No valid transactions found in the file')
        return
      }

      // Log the first few rows to understand the data structure
      console.log('First 3 rows:', transactions.slice(0, 3))
      
      // Check if we need to look for quantity in a different column
      const firstRow = transactions[0]
      console.log('First row structure:', firstRow)
      
      // Determine which column contains the quantity
      let quantityColumnIndex = 3 // Default to 4th column (index 3)
      let sideColumnIndex = 1 // Default to 2nd column (index 1)
      
      // If the first row has more than 4 columns, try to find the quantity column
      if (firstRow && firstRow.length > 4) {
        // Look for a column that might contain numeric values
        for (let i = 0; i < firstRow.length; i++) {
          if (typeof firstRow[i] === 'number' && i !== 2) { // Skip price column (index 2)
            quantityColumnIndex = i
            break
          }
        }
      }
      
      console.log(`Using column ${quantityColumnIndex} for quantity`)

      const assetMap = new Map<string, Transaction[]>()
      
      transactions.forEach((row, index) => {
        try {
          if (!row || !Array.isArray(row) || row.length < Math.max(quantityColumnIndex + 1, 4)) {
            console.log(`Skipping invalid row ${index}:`, row)
            return
          }

          const symbol = String(row[0]).trim()
          const side = String(row[sideColumnIndex]).trim().toUpperCase()
          
          // Try to parse price and quantity, handling different formats
          let price = 0
          let quantity = 0
          
          // Try to parse price
          if (typeof row[2] === 'number') {
            price = row[2]
          } else if (typeof row[2] === 'string') {
            price = parseFloat(row[2].replace(/,/g, ''))
          }
          
          // Try to parse quantity
          if (typeof row[quantityColumnIndex] === 'number') {
            quantity = row[quantityColumnIndex]
          } else if (typeof row[quantityColumnIndex] === 'string') {
            quantity = parseFloat(row[quantityColumnIndex].replace(/,/g, ''))
          }
          
          // If quantity is still NaN, try to find a numeric value in the row
          if (isNaN(quantity)) {
            for (let i = 0; i < row.length; i++) {
              if (i !== 2 && typeof row[i] === 'number' && !isNaN(row[i])) {
                quantity = row[i]
                break
              }
            }
          }

          console.log(`Row ${index} parsed:`, { 
            symbol, 
            side, 
            price, 
            quantity,
            rawRow: row
          })

          if (!symbol || isNaN(price) || isNaN(quantity)) {
            console.log(`Skipping row ${index} due to invalid data:`, { symbol, side, price, quantity })
            return
          }

          const baseAsset = symbol.replace(/INR|USDT$/, '')
          
          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, [])
          }
          
          const transaction: Transaction = {
            symbol,
            side,
            price,
            quantity,
            quote: symbol.endsWith('INR') ? 'INR' : 'USDT'
          }

          console.log(`Adding transaction for ${baseAsset}:`, transaction)
          assetMap.get(baseAsset)?.push(transaction)
        } catch (err) {
          console.error(`Error processing row ${index}:`, err)
        }
      })

      console.log('Asset map:', Object.fromEntries(assetMap))

      const summaries: AssetSummary[] = []
      
      assetMap.forEach((transactions, asset) => {
        // Updated to match the actual data format where side is "INR" or "USDT"
        const inrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'INR')
        const usdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'USDT')
        
        console.log(`Processing ${asset}:`, { 
          inrTrades: inrTrades.length, 
          usdtTrades: usdtTrades.length,
          inrTradesData: inrTrades,
          usdtTradesData: usdtTrades
        })
        
        if (inrTrades.length > 0 && usdtTrades.length > 0) {
          const inrPrice = inrTrades[0].price
          const usdtPrice = usdtTrades[0].price
          const inrQuantity = inrTrades.reduce((sum, t) => sum + t.quantity, 0)
          const usdtQuantity = usdtTrades.reduce((sum, t) => sum + t.quantity, 0)
          
          const matchedQuantity = Math.min(inrQuantity, usdtQuantity)
          const usdtRange = usdtPrice - inrPrice
          const usdtUnits = inrPrice / usdtRange
          
          console.log(`Calculated values for ${asset}:`, {
            inrPrice,
            usdtPrice,
            inrQuantity,
            usdtQuantity,
            matchedQuantity,
            usdtRange,
            usdtUnits
          })

          summaries.push({
            asset,
            inrPrice,
            usdtRange,
            usdtUnits,
            matchedQuantity
          })
        }
      })
      
      console.log('Final summaries:', summaries)
      setSummary(summaries)
      
      if (summaries.length === 0) {
        setError('No matching INR buys and USDT sells found in the data')
      }
    } catch (err) {
      console.error('Error processing transactions:', err)
      setError('Error processing the file. Please check the console for details.')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('')
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const workbook = read(event.target?.result, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Try different options for parsing
          let jsonData = utils.sheet_to_json(worksheet, { header: 1 })
          
          console.log('Loaded Excel data:', jsonData)
          
          // If the data doesn't look right, try with different options
          if (jsonData.length > 0 && jsonData[0].length < 4) {
            console.log('Trying alternative parsing options')
            jsonData = utils.sheet_to_json(worksheet, { 
              header: 1,
              raw: false,
              defval: ''
            })
          }
          
          if (jsonData.length > 0) {
            const headers = jsonData[0] as string[]
            const rows = jsonData.slice(1) as any[]
            console.log('Processed data:', { headers, rows })
            setHeaders(headers)
            setData(rows)
            processTransactions(rows)
          } else {
            setError('The Excel file appears to be empty')
          }
        } catch (err) {
          console.error('Error processing Excel file:', err)
          setError('Error reading the Excel file. Please make sure it\'s a valid Excel file.')
        }
      }
      reader.onerror = () => {
        setError('Error reading the file')
      }
      reader.readAsBinaryString(file)
    } catch (err) {
      console.error('Error handling file upload:', err)
      setError('Error handling file upload')
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Crypto Trading Summary
      </Typography>
      
      <Button
        variant="contained"
        component="label"
        sx={{ mb: 4 }}
      >
        Upload Excel File
        <input
          type="file"
          hidden
          accept=".xlsx,.xls"
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
          <Typography variant="h5" gutterBottom>
            Asset Summary
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Asset</TableCell>
                  <TableCell align="right">INR Price</TableCell>
                  <TableCell align="right">USDT Range</TableCell>
                  <TableCell align="right">USDT Units</TableCell>
                  <TableCell align="right">Matched Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.asset}>
                    <TableCell>{row.asset}</TableCell>
                    <TableCell align="right">{row.inrPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">{row.usdtRange.toFixed(2)}</TableCell>
                    <TableCell align="right">{row.usdtUnits.toFixed(2)}</TableCell>
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
          <Typography variant="h5" gutterBottom>
            Raw Transaction Data
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {headers.map((header, index) => (
                    <TableCell key={index}>{header}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
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
  )
}

export default App
