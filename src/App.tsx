import React, { useState, useMemo, useEffect } from 'react'
import { read, utils } from 'xlsx'
import { 
  ThemeProvider, 
} from '@mui/material/styles'
import { 
  Container, 
  Alert,
  CssBaseline,
  SelectChangeEvent} from '@mui/material'
import { lightTheme, darkTheme } from './theme'
import { AssetSummary, AssetSummaryV7, AssetSummaryV4, AssetSummaryV1, AssetSummaryV5, AssetSummaryV6 } from './types'
import { processTransactionsV1 } from './processors/v1'
import { processTransactionsV3 } from './processors/v3'
import { processTransactionsV4 } from './processors/v4'
import { processTransactionsV5 } from './processors/v5'
import { processTransactionsV6 } from './processors/v6'
import { processTransactionsV7 } from './processors/v7'
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { BuildInfo } from './components/BuildInfo';
import { Summary } from './components/Summary';
import { SummaryV1 } from './components/SummaryV1';
import { SummaryV2 } from './components/SummaryV2';
import { SummaryV4 } from './components/SummaryV4';
import { SummaryV5 } from './components/SummaryV5';
import { SummaryV6 } from './components/SummaryV6';
import { SummaryV7 } from './components/SummaryV7';
import { RawTransactionData } from './components/RawTransactionData';

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
        <Summary 
          version={version}
          summary={summary}
          dateSortDirection={dateSortDirection}
          toggleDateSort={toggleDateSort}
        />

        {/* Summary Table (V4 - Client) */}
        <SummaryV4
          version={version}
          summary={summaryV4}
          dateSortDirection={dateSortDirection}
          toggleDateSort={toggleDateSort}
        />

        {/* Summary Table (V5 - Client Duplicate) */}
        <SummaryV5
          version={version}
          summary={summaryV5}
          dateSortDirection={dateSortDirection}
          toggleDateSort={toggleDateSort}
        />

        {/* Summary Table (V6 - Client Duplicate) */}
        <SummaryV6
          version={version}
          summary={summaryV6}
          dateSortDirection={dateSortDirection}
          toggleDateSort={toggleDateSort}
        />

        {/* Summary Table (V2 - Original) */}
        <SummaryV2
          version={version}
          summary={summary}
        />

        {/* Summary Table (V1) */}
        <SummaryV1
          version={version}
          summary={summaryV1}
        />

        {/* Summary Table (V7) */}
        <SummaryV7
          version={version}
          summary={summaryV7}
          skippedItems={skippedItemsV7}
          dateSortDirection={dateSortDirection}
          toggleDateSort={toggleDateSort}
        />

        <RawTransactionData
          data={data}
          headers={headers}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Container>
      <BuildInfo />
    </ThemeProvider>
  )
}

export default App
