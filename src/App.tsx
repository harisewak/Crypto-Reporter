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
  AppBar,
  Toolbar,
  CssBaseline,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  TablePagination
} from '@mui/material'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { lightTheme, darkTheme } from './theme'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

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

// Function to format Date object to '25th April, 2025'
function formatDate(date: Date | null): string {
  if (!date) return 'Invalid Date';

  // Use UTC methods
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[date.getUTCMonth()]; // Use UTC month

  let daySuffix = 'th';
  if (day === 1 || day === 21 || day === 31) {
    daySuffix = 'st';
  } else if (day === 2 || day === 22) {
    daySuffix = 'nd';
  } else if (day === 3 || day === 23) {
    daySuffix = 'rd';
  }

  return `${day}${daySuffix} ${monthName}, ${year}`;
}

// Function to format Date object to '25th April, 2025 HH:MM:SS'
function formatDateTime(date: Date | null): string {
  if (!date) return 'Invalid Date';

  const datePart = formatDate(date); // Reuse existing UTC date formatting

  // Use UTC methods
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const timePart = `${hours}:${minutes}:${seconds}`;

  return `${datePart} ${timePart}`;
}

interface Transaction {
  date: string; // Store original date string/serial from Excel
  jsDate: Date | null; // Add JS Date object
  symbol: string;
  side: string;
  price: number;
  quantity: number;
  quote: string;
  tds?: number;
  total?: number; // Add optional total cost field
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

// V4 summary interface (Client specific)
interface AssetSummaryV4 {
  displayDate: string; // A
  asset: string; // B
  inrPrice: number; // C (Avg INR Price)
  usdtPrice: number; // D (Avg USDT Price)
  coinSoldQty: number; // E (Matched Qty / Daily Sell Qty)
  usdtPurchaseCost: number; // F (USDT Cost Ratio H/G)
  usdtQuantity: number; // G (USDT Qty Derived / Daily Sell Value)
  usdtPurchaseCostInr: number; // H (USDT Cost INR E*C)
  tds: number; // I
  totalRelevantInrValue: number; // K (BUY IN INR)
  totalRelevantInrQuantity: number; // L (QNTY)
}

// V5 summary interface (Duplicate of V4)
interface AssetSummaryV5 {
  displayDate: string; // A
  asset: string; // B
  inrPrice: number; // C (Avg INR Price)
  usdtPrice: number; // D (Avg USDT Price)
  coinSoldQty: number; // E (Matched Qty / Daily Sell Qty)
  usdtPurchaseCost: number; // F (USDT Cost Ratio H/G)
  usdtQuantity: number; // G (USDT Qty Derived / Daily Sell Value)
  usdtPurchaseCostInr: number; // H (USDT Cost INR E*C)
  tds: number; // I
  totalRelevantInrValue: number; // K (BUY IN INR)
  totalRelevantInrQuantity: number; // L (QNTY)
}

function App() {
  const [data, setData] = useState<any[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [summary, setSummary] = useState<Map<string, AssetSummary[]>>(new Map())
  const [summaryV1, setSummaryV1] = useState<AssetSummaryV1[]>([])
  const [summaryV4, setSummaryV4] = useState<Map<string, AssetSummaryV4[]>>(new Map())
  const [summaryV5, setSummaryV5] = useState<Map<string, AssetSummaryV5[]>>(new Map())
  const [error, setError] = useState<string>('')
  // Initialize themeMode from localStorage or default to 'light'
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('themeMode');
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
  });
  const [version, setVersion] = useState<'v1' | 'v2' | 'v3' | 'v4' | 'v5'>('v4')
  const [dateSortDirection, setDateSortDirection] = useState<'asc' | 'desc'>('asc');

  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  // Effect to save themeMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    // No need to explicitly save here anymore, the useEffect handles it.
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const toggleDateSort = () => {
    setDateSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleVersionChange = (event: SelectChangeEvent) => {
    setVersion(event.target.value as 'v1' | 'v2' | 'v3' | 'v4' | 'v5')
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
          let totalStr = String(row[6] || '');        // Total Cost (Column 7, index 6)

          let price = NaN
          let quantity = NaN
          let total = NaN; // Initialize total

          try {
            price = parseFloat(priceStr.replace(/,/g, ''))
            quantity = parseFloat(quantityStr.replace(/,/g, ''))
            if (totalStr) { // Parse total only if it exists
                total = parseFloat(totalStr.replace(/,/g, ''))
            }
          } catch (parseError) {
            console.log(`Skipping row ${index} due to invalid number format:`, row)
            return
          }
          
          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            console.log(`Skipping row ${index} due to invalid/missing data:`, { symbol, side, price, quantity, rawRow: row })
            return
          }

          let baseAsset: string;
          const upperSymbolV1 = symbol.toUpperCase();
          if (upperSymbolV1 === 'USDTINR') {
            baseAsset = 'USDT';
          } else if (upperSymbolV1 === 'USDCINR') {
            baseAsset = 'USDC';
          } else if (upperSymbolV1 === 'DAIINR') {
            baseAsset = 'DAI';
          } else {
            baseAsset = symbol.replace(/INR|USDT|USDC|DAI$/, '');
          }
          
          let quote: string;
          if (symbol.endsWith('INR')) {
            quote = 'INR';
          } else if (symbol.endsWith('USDT')) {
            quote = 'USDT';
          } else if (symbol.endsWith('USDC')) {
            quote = 'USDC';
          } else if (symbol.endsWith('DAI')) {
            quote = 'DAI';
          } else {
            console.warn(`Row ${index} (V1): Unrecognized quote currency for symbol '${symbol}'.`);
            quote = 'UNKNOWN';
          }
          
          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, [])
          }
          
          const transaction: Transaction = {
            date: '', // Not used in V1
            jsDate: null,
            symbol,
            side,
            price,
            quantity,
            quote,
            total: isNaN(total) ? undefined : total // Add total to transaction object
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
          const totalInrValue = inrTrades.reduce((sum, t) => {
              const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
              return sum + cost;
          }, 0);
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

  // V3 processing logic (Daily Aggregation)
  const processTransactionsV3 = (transactions: any[][]) => {
    const strategy = 'proportional'; // <-- Hardcode strategy
    const logPrefix = '[V3 LOG]';
    try {
      setError('');
      console.log(`${logPrefix} Starting V3 processing (Strategy: ${strategy}) for`, transactions.length, 'raw rows.');

      const assetMap = new Map<string, Transaction[]>();

      // 1. Initial Parsing and Grouping by Asset (with JS Date conversion)
      console.log(`${logPrefix} Step 1: Parsing and Grouping rows into assetMap...`);
      transactions.forEach((row, index) => {
        const rowIndex = index + 1; // 1-based index for easier debugging
        try {
          if (!row || !Array.isArray(row) || row.length < 6) {
            console.warn(`${logPrefix} Row ${rowIndex}: Skipping due to insufficient columns:`, row);
            return;
          }

          const dateStr = String(row[2]).trim();
          const symbol = String(row[0]).trim();
          const side = String(row[3]).trim().toUpperCase();
          let priceStr = String(row[4]);
          let quantityStr = String(row[5]);
          let tdsStr = String(row[7] || '');
          let totalStr = String(row[6] || ''); // Total Cost (Column 7, index 6)

          let price = parseFloat(priceStr.replace(/,/g, ''));
          let quantity = parseFloat(quantityStr.replace(/,/g, ''));
          let tds = tdsStr ? parseFloat(tdsStr.replace(/,/g, '')) : 0;
          let total = totalStr ? parseFloat(totalStr.replace(/,/g, '')) : NaN; // Parse total

          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            console.warn(`${logPrefix} Row ${rowIndex}: Skipping due to invalid/missing primary data:`, { symbol, side, price, quantity, rawRow: row });
            return;
          }

          // --- Convert date early ---
          let jsDate: Date | null = null;
          const dateNum = parseFloat(dateStr);
          if (!isNaN(dateNum)) {
            jsDate = excelSerialDateToJSDate(dateNum);
            if (!jsDate) {
                console.warn(`${logPrefix} Row ${rowIndex}: Failed to convert Excel serial date ${dateNum} for symbol ${symbol}.`);
            }
          } else {
             console.warn(`${logPrefix} Row ${rowIndex}: Could not parse date '${dateStr}' as Excel serial number for symbol ${symbol}.`);
          }
          // -------------------------

          let baseAsset: string;
          const upperSymbol = symbol.toUpperCase();
          if (upperSymbol === 'USDTINR') {
            baseAsset = 'USDT';
          } else if (upperSymbol === 'USDCINR') { // Added USDC
            baseAsset = 'USDC';
          } else if (upperSymbol === 'DAIINR') { // Added DAI
            baseAsset = 'DAI';
          } else {
            baseAsset = symbol.replace(/INR|USDT|USDC|DAI$/, ''); // Added USDC, DAI
          }

          if (!baseAsset) {
              console.warn(`${logPrefix} Row ${rowIndex}: Could not determine base asset for symbol '${symbol}'. Skipping.`);
              return;
          }

          let quote: string; // Changed from const to let
          if (symbol.endsWith('INR')) {
            quote = 'INR';
          } else if (symbol.endsWith('USDT')) {
            quote = 'USDT';
          } else if (symbol.endsWith('USDC')) { // Added USDC
            quote = 'USDC';
          } else if (symbol.endsWith('DAI')) { // Added DAI
            quote = 'DAI';
          } else {
            // Fallback for unrecognized quote currency
            console.warn(`${logPrefix} Row ${rowIndex}: Unrecognized quote currency for symbol '${symbol}'.`);
            quote = 'UNKNOWN'; // Or handle as appropriate
          }

          if (!assetMap.has(baseAsset)) {
            console.log(`${logPrefix} Row ${rowIndex}: Initializing map entry for new asset '${baseAsset}'.`);
            assetMap.set(baseAsset, []);
          }

          const transaction: Transaction = {
            date: dateStr,
            jsDate,
            symbol,
            side,
            price,
            quantity,
            quote,
            tds,
            total: isNaN(total) ? undefined : total // Add total to transaction object
          };
          
          assetMap.get(baseAsset)?.push(transaction);

        } catch (err) {
          console.error(`${logPrefix} Row ${rowIndex}: Error processing row:`, err, row);
        }
      });

      console.log(`${logPrefix} Step 1 Complete: assetMap created with ${assetMap.size} assets.`);
      assetMap.forEach((trades, asset) => {
        console.log(`${logPrefix}   - Asset '${asset}': ${trades.length} transactions.`);
      });

      // 2. Calculate Daily Summaries
      console.log(`${logPrefix} Step 2: Calculating Daily Summaries...`);
      const summariesByDate = new Map<string, AssetSummary[]>();

      assetMap.forEach((transactions, asset) => {
        console.log(`${logPrefix} Processing asset: '${asset}' with ${transactions.length} transactions.`);

        const STABLECOINS = ['USDT', 'USDC', 'DAI'];
        const directInrBuySymbols = STABLECOINS.map(sc => `${sc}INR`.toUpperCase()); // Ensure comparison is case-insensitive
        
        // Handle direct Stablecoin/INR Buys separately
        if (STABLECOINS.includes(asset)) {
          console.log(`${logPrefix} Asset '${asset}': Handling as direct ${asset}/INR.`);
          const stablecoinInrBuyTrades = transactions.filter(t =>
            directInrBuySymbols.includes(t.symbol.toUpperCase()) &&
            t.symbol.toUpperCase() === `${asset}INR`.toUpperCase() && // Ensure we're processing the correct stablecoin
            t.side === 'BUY' &&
            t.jsDate // Ensure date is valid
          );
          console.log(`${logPrefix} Asset '${asset}': Found ${stablecoinInrBuyTrades.length} valid ${asset}/INR buy trades.`);

          if (stablecoinInrBuyTrades.length > 0) {
            const buysByDate = new Map<string, Transaction[]>();
            stablecoinInrBuyTrades.forEach(trade => {
              if (trade.jsDate) {
                const dateKey = formatDate(trade.jsDate);
                const existing = buysByDate.get(dateKey) || [];
                buysByDate.set(dateKey, [...existing, trade]);
              }
            });
            console.log(`${logPrefix} Asset '${asset}': Grouped ${asset}/INR buys into ${buysByDate.size} dates.`);

            buysByDate.forEach((dailyBuys, dateKey) => {
              console.log(`${logPrefix} Asset '${asset}': Calculating summary for date '${dateKey}' with ${dailyBuys.length} buys.`);
              const totalInrValue = dailyBuys.reduce((sum, t) => {
                const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
                return sum + cost;
              }, 0);
              const totalStablecoinQuantity = dailyBuys.reduce((sum, t) => sum + t.quantity, 0);
              const averageInrPrice = totalStablecoinQuantity > 0 ? totalInrValue / totalStablecoinQuantity : 0;

              const currentSummary: AssetSummary = {
                displayDate: dateKey,
                asset: asset, // Use the dynamic asset (USDT, USDC, or DAI)
                inrPrice: averageInrPrice,
                usdtPrice: 0, 
                coinSoldQty: 0, 
                usdtPurchaseCost: 0, 
                usdtQuantity: totalStablecoinQuantity, 
                usdtPurchaseCostInr: totalInrValue, 
                tds: 0, 
              };
              console.log(`${logPrefix} Asset '${asset}': Created ${asset}/INR summary for '${dateKey}':`, currentSummary);

              const existingSummaries = summariesByDate.get(dateKey) || [];
              summariesByDate.set(dateKey, [...existingSummaries, currentSummary]);
            });
          }
          console.log(`${logPrefix} Asset '${asset}': Finished processing direct ${asset}/INR.`);
          return; // Skip normal asset processing for these stablecoins
        }

        // --- Process Asset Pairs (e.g., ZIL/INR, ZIL/USDT) --- 
        console.log(`${logPrefix} Asset '${asset}': Processing as asset pair.`);
        const allInrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY' && t.jsDate);
        const allUsdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL' && t.jsDate);
        console.log(`${logPrefix} Asset '${asset}': Found ${allInrTrades.length} valid INR buys and ${allUsdtTrades.length} valid USDT sells.`);

        if (allInrTrades.length === 0 || allUsdtTrades.length === 0) {
            console.log(`${logPrefix} Asset '${asset}': Skipping daily processing - insufficient INR buys or USDT sells.`);
            return; // Need both types of trades to proceed
        }

        // Find unique USDT sell dates (ignoring time)
        const uniqueSellDateStrings = [
          ...new Set(
            allUsdtTrades
              .map(t => {
                if (!t.jsDate) return null;
                const year = t.jsDate.getUTCFullYear();
                const month = (t.jsDate.getUTCMonth() + 1).toString().padStart(2, '0');
                const day = t.jsDate.getUTCDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
              })
              .filter((dateStr): dateStr is string => dateStr !== null)
          )
        ];
        console.log(`${logPrefix} Asset '${asset}': Found ${uniqueSellDateStrings.length} unique sell date strings:`, uniqueSellDateStrings);

        const uniqueSellDates = uniqueSellDateStrings
          .map(dateStr => {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(Date.UTC(year, month - 1, day));
          })
          .sort((a, b) => a.getTime() - b.getTime());
        console.log(`${logPrefix} Asset '${asset}': Processed into ${uniqueSellDates.length} unique sell Date objects (sorted).`);

        // Process each sell date chronologically
        uniqueSellDates.forEach(sellDay => {
          const startOfDay = sellDay; // Midnight UTC
          const endOfDay = new Date(Date.UTC(sellDay.getUTCFullYear(), sellDay.getUTCMonth(), sellDay.getUTCDate() + 1)); // Midnight UTC next day
          const sellDateStr = formatDate(sellDay);
          console.log(`${logPrefix} Asset '${asset}': Analyzing sell date ${sellDateStr} (UTC Range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}).`);

          // Get USDT sells *only* for this specific calendar day
          const dailyUsdtSells = allUsdtTrades.filter(t =>
            t.jsDate &&
            t.jsDate >= startOfDay &&
            t.jsDate < endOfDay
          );
          console.log(`${logPrefix} Asset '${asset}': Found ${dailyUsdtSells.length} USDT sells ON ${sellDateStr}.`);

          // Get INR buys *up to and including the end* of this specific day
          const relevantInrBuys = allInrTrades.filter(t =>
            t.jsDate && t.jsDate < endOfDay // Use < endOfDay to include everything ON sellDay and before
          );
          console.log(`${logPrefix} Asset '${asset}': Found ${relevantInrBuys.length} relevant INR buys UP TO ${sellDateStr}.`);

          if (dailyUsdtSells.length === 0 || relevantInrBuys.length === 0) {
            console.log(`${logPrefix} Asset '${asset}': Skipping ${sellDateStr} - no sells on this day OR no buys up to this day.`);
            return; // Skip if no sells on this day or no relevant buys up to this day
          }

          // --- Calculate Metrics --- 
          console.log(`${logPrefix} Asset '${asset}': Calculating metrics for ${sellDateStr}...`);
          let summaryForDay: AssetSummary | null = null;

          const totalDailyUsdtQuantity = dailyUsdtSells.reduce((sum, t) => sum + t.quantity, 0);
          const totalDailyUsdtValue = dailyUsdtSells.reduce((sum, t) => sum + t.price * t.quantity, 0);
          const averageDailyUsdtPrice = totalDailyUsdtQuantity > 0 ? totalDailyUsdtValue / totalDailyUsdtQuantity : 0;
          const totalDailyTds = dailyUsdtSells.reduce((sum, t) => sum + (t.tds || 0), 0);
          console.log(`${logPrefix} Asset '${asset}', Date ${sellDateStr}: Daily USDT - Qty=${totalDailyUsdtQuantity}, AvgPrice=${averageDailyUsdtPrice}, TDS=${totalDailyTds}`);

          // Use t.total if available and valid for relevant INR Buys, otherwise fallback to price * quantity
          const totalRelevantInrValue = relevantInrBuys.reduce((sum, t) => {
            const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
            const roundedCost = parseFloat(cost.toFixed(8)); // Apply rounding like before
            return sum + roundedCost;
          }, 0);

          const totalRelevantInrQuantity = relevantInrBuys.reduce((sum, t) => sum + t.quantity, 0);
          const averageRelevantInrPrice = totalRelevantInrQuantity > 0 ? totalRelevantInrValue / totalRelevantInrQuantity : 0;
          console.log(`${logPrefix} Asset '${asset}', Date ${sellDateStr}: Relevant INR - Qty=${totalRelevantInrQuantity}, AvgPrice=${averageRelevantInrPrice}`);

          let usdtPurchaseCostRatio = 0;
          let usdtPurchaseCostInr = 0;

          // Proportional calculation
          const coinSoldQty = totalDailyUsdtQuantity;
          usdtPurchaseCostRatio = averageDailyUsdtPrice > 0 ? averageRelevantInrPrice / averageDailyUsdtPrice : 0;
          usdtPurchaseCostInr = totalRelevantInrValue;
          console.log(`${logPrefix} Asset '${asset}', Date ${sellDateStr}: Calculated - SoldQty=${coinSoldQty}, CostRatio=${usdtPurchaseCostRatio}, CostINR=${usdtPurchaseCostInr}`);

          summaryForDay = {
            displayDate: sellDateStr,
            asset,
            inrPrice: averageRelevantInrPrice,
            usdtPrice: averageDailyUsdtPrice,
            coinSoldQty: coinSoldQty,
            usdtPurchaseCost: usdtPurchaseCostRatio,
            usdtQuantity: totalDailyUsdtValue,
            usdtPurchaseCostInr: usdtPurchaseCostInr,
            tds: totalDailyTds
          };
          console.log(`${logPrefix} Asset '${asset}', Date ${sellDateStr}: Created summary object:`, summaryForDay);

          if (summaryForDay) {
            const existingSummaries = summariesByDate.get(sellDateStr) || [];
            summariesByDate.set(sellDateStr, [...existingSummaries, summaryForDay]);
            console.log(`${logPrefix} Asset '${asset}': Added summary for ${sellDateStr} to the final map. Current summaries for date: ${summariesByDate.get(sellDateStr)?.length}`);
          }
        }); // End loop for uniqueSellDates

        console.log(`${logPrefix} Asset '${asset}': Finished processing daily summaries.`);
      }); // End loop for assetMap

      console.log(`${logPrefix} Step 2 Complete: summariesByDate map populated with ${summariesByDate.size} dates.`);
      setSummary(summariesByDate);

      if (summariesByDate.size === 0 && transactions.length > 0) {
        console.warn(`${logPrefix} No summaries generated, checking for potential reasons...`);
        // Check if any potential pairs existed but didn't match daily
        let potentialPairs = false;
        assetMap.forEach((trans, asset) => {
            if (asset !== 'USDT') {
                const hasInr = trans.some(t => t.quote === 'INR' && t.side === 'BUY' && t.jsDate);
                const hasUsdt = trans.some(t => t.quote === 'USDT' && t.side === 'SELL' && t.jsDate);
                if (hasInr && hasUsdt) potentialPairs = true;
            }
        });
        if (potentialPairs) {
             console.warn(`${logPrefix} Potential pairs found but no daily matches generated.`);
             setError('Trades found, but no matching daily INR buys/USDT sells based on selected criteria.')
        } else {
             console.warn(`${logPrefix} No potential asset pairs found.`);
             setError('No matching asset pairs (like ASSET/INR Buy and ASSET/USDT Sell with valid dates) found in the data.');
        }
      }
    } catch (err) {
      console.error(`${logPrefix} CRITICAL ERROR in processTransactionsV3:`, err);
      setError('Critical error during V3 processing. Check console for details.');
      setData([]);
      setHeaders([]);
      setSummary(new Map());
      setSummaryV1([]);
    }
    console.log(`${logPrefix} Finished V3 processing function.`);
  };

  // V4 processing logic (Client Specific Calculation)
  const processTransactionsV4 = (transactions: any[][]) => {
    const logPrefix = '[V4 LOG]';
    try {
      setError('');
      console.log(`${logPrefix} Starting V4 processing (Client Specific) for`, transactions.length, 'raw rows.');

      const assetMap = new Map<string, Transaction[]>();

      // 1. Initial Parsing and Grouping by Asset (with JS Date conversion) - Same as V3
      console.log(`${logPrefix} Step 1: Parsing and Grouping rows into assetMap...`);
      transactions.forEach((row, index) => {
        const rowIndex = index + 1;
        try {
          if (!row || !Array.isArray(row) || row.length < 6) {
            // console.warn(`${logPrefix} Row ${rowIndex}: Skipping due to insufficient columns:`, row);
            return;
          }
          const dateStr = String(row[2]).trim();
          const symbol = String(row[0]).trim();
          const side = String(row[3]).trim().toUpperCase();
          let priceStr = String(row[4]);
          let quantityStr = String(row[5]);
          let totalStr = String(row[6] || ''); // Total Cost (Column 7, index 6)
          let tdsStr = String(row[7] || '');

          let price = parseFloat(priceStr.replace(/,/g, ''));
          let quantity = parseFloat(quantityStr.replace(/,/g, ''));
          let total = totalStr ? parseFloat(totalStr.replace(/,/g, '')) : NaN;
          let tds = tdsStr ? parseFloat(tdsStr.replace(/,/g, '')) : 0;

          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            // console.warn(`${logPrefix} Row ${rowIndex}: Skipping due to invalid/missing primary data:`, { symbol, side, price, quantity, rawRow: row });
            return;
          }

          let jsDate: Date | null = null;
          const dateNum = parseFloat(dateStr);
          if (!isNaN(dateNum)) {
            jsDate = excelSerialDateToJSDate(dateNum);
          }

          let baseAsset: string;
          const upperSymbolV4 = symbol.toUpperCase(); // Renamed for clarity
          if (upperSymbolV4 === 'USDTINR') {
            baseAsset = 'USDT';
          } else if (upperSymbolV4 === 'USDCINR') {
            baseAsset = 'USDC';
          } else if (upperSymbolV4 === 'DAIINR') {
            baseAsset = 'DAI';
          } else {
            baseAsset = symbol.replace(/INR|USDT|USDC|DAI$/, '');
          }
          if (!baseAsset) return;

          let quote: string; 
          if (symbol.endsWith('INR')) {
            quote = 'INR';
          } else if (symbol.endsWith('USDT')) {
            quote = 'USDT';
          } else if (symbol.endsWith('USDC')) {
            quote = 'USDC';
          } else if (symbol.endsWith('DAI')) {
            quote = 'DAI';
          } else {
            console.warn(`${logPrefix} Row ${rowIndex}: Unrecognized quote currency for symbol '${symbol}' in V4.`);
            quote = 'UNKNOWN';
          }

          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, []);
          }
          const transaction: Transaction = {
            date: dateStr, jsDate, symbol, side, price, quantity, quote, tds,
            total: isNaN(total) ? undefined : total
          };
          assetMap.get(baseAsset)?.push(transaction);
        } catch (err) {
          console.error(`${logPrefix} Row ${rowIndex}: Error processing row:`, err, row);
        }
      });
      console.log(`${logPrefix} Step 1 Complete: assetMap created with ${assetMap.size} assets.`);

      // 2. Calculate Daily Summaries (Client Logic)
      console.log(`${logPrefix} Step 2: Calculating Daily Summaries...`);
      const summariesByDateV4 = new Map<string, AssetSummaryV4[]>();

      assetMap.forEach((transactions, asset) => {
        // Handle direct Stablecoin/INR Buys separately
        const STABLECOINS_V4 = ['USDT', 'USDC', 'DAI']; 
        if (STABLECOINS_V4.includes(asset)) {
          console.log(`${logPrefix} Asset '${asset}': Processing as STABLECOIN with direct INR trading`);
          
          // Filter for direct stablecoin/INR buys
          const stablecoinInrBuyTrades = transactions.filter(t => 
            t.symbol.toUpperCase() === `${asset}INR` &&
            t.side === 'BUY' &&
            t.jsDate
          );

          if (stablecoinInrBuyTrades.length > 0) {
            // Group trades by date
            const buysByDate = new Map<string, Transaction[]>();
            stablecoinInrBuyTrades.forEach(trade => {
              if (trade.jsDate) {
                const dateKey = formatDate(trade.jsDate);
                const existing = buysByDate.get(dateKey) || [];
                buysByDate.set(dateKey, [...existing, trade]);
              }
            });

            // Process each date's trades
            buysByDate.forEach((dailyBuys, dateKey) => {
              const totalInrValue = dailyBuys.reduce((sum, t) => {
                const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
                return sum + cost;
              }, 0);
              const totalStablecoinQuantity = dailyBuys.reduce((sum, t) => sum + t.quantity, 0);
              const averageInrPrice = totalStablecoinQuantity > 0 ? totalInrValue / totalStablecoinQuantity : 0;
              const totalTds = dailyBuys.reduce((sum, t) => sum + (t.tds || 0), 0);

              const summaryForDay: AssetSummaryV4 = {
                displayDate: dateKey,
                asset: asset,
                inrPrice: averageInrPrice,
                usdtPrice: 0, // No USDT price for direct INR trade
                coinSoldQty: totalStablecoinQuantity,
                usdtPurchaseCost: totalStablecoinQuantity > 0 ? totalInrValue / totalStablecoinQuantity : 0, // H/G
                usdtQuantity: totalStablecoinQuantity, // G should be quantity
                usdtPurchaseCostInr: totalInrValue,
                tds: totalTds,
                totalRelevantInrValue: totalInrValue,
                totalRelevantInrQuantity: totalStablecoinQuantity
              };

              const existingSummaries = summariesByDateV4.get(dateKey) || [];
              summariesByDateV4.set(dateKey, [...existingSummaries, summaryForDay]);
            });
          }
          console.log(`${logPrefix} Asset '${asset}': Completed STABLECOIN processing`);
          return; // Skip normal asset processing for stablecoins
        }

        // --- Process Normal Crypto Assets --- 
        console.log(`${logPrefix} Asset '${asset}': Processing as NORMAL CRYPTO ASSET`);
        const allInrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY' && t.jsDate);
        const allUsdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL' && t.jsDate);

        if (allInrTrades.length === 0 || allUsdtTrades.length === 0) {
            console.log(`${logPrefix} Asset '${asset}': Skipping daily processing for V4 - insufficient INR buys or USDT sells.`);
            return;
        }
        console.log(`${logPrefix} Asset '${asset}': Found ${allInrTrades.length} relevant INR buys and ${allUsdtTrades.length} relevant USDT sells for potential daily summaries.`);

        // Find unique USDT sell dates (ignoring time), similar to V3
        const uniqueSellDateStrings = [
          ...new Set(
            allUsdtTrades
              .map(t => {
                if (!t.jsDate) return null;
                const year = t.jsDate.getUTCFullYear();
                const month = (t.jsDate.getUTCMonth() + 1).toString().padStart(2, '0');
                const day = t.jsDate.getUTCDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
              })
              .filter((dateStr): dateStr is string => dateStr !== null)
          )
        ];

        const uniqueSellDates = uniqueSellDateStrings
          .map(dateStr => {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(Date.UTC(year, month - 1, day));
          })
          .sort((a, b) => a.getTime() - b.getTime());
        
        console.log(`${logPrefix} Asset '${asset}': Found ${uniqueSellDates.length} unique sell dates for daily V4 summaries.`);

        uniqueSellDates.forEach(sellDay => {
          const startOfDay = sellDay; // Midnight UTC
          const endOfDay = new Date(Date.UTC(sellDay.getUTCFullYear(), sellDay.getUTCMonth(), sellDay.getUTCDate() + 1)); // Midnight UTC next day
          const sellDateStr = formatDate(sellDay);
          console.log(`${logPrefix} Asset '${asset}', V4 Daily: Analyzing sell date ${sellDateStr}`);

          const dailyUsdtSells = allUsdtTrades.filter(t =>
            t.jsDate &&
            t.jsDate >= startOfDay &&
            t.jsDate < endOfDay
          );

          const relevantInrBuys = allInrTrades.filter(t =>
            t.jsDate && t.jsDate < endOfDay // INR buys up to and including the end of this sellDay
          );

          if (dailyUsdtSells.length === 0 || relevantInrBuys.length === 0) {
            console.log(`${logPrefix} Asset '${asset}', V4 Daily: Skipping ${sellDateStr} - no sells on this day OR no buys up to this day.`);
            return; // Skip if no sells on this day or no relevant buys up to this day
          }

          // --- Calculate Daily Metrics for AssetSummaryV4 ---
          const totalDailyUsdtQuantity = dailyUsdtSells.reduce((sum, t) => sum + t.quantity, 0);
          const totalDailyUsdtValue = dailyUsdtSells.reduce((sum, t) => sum + t.price * t.quantity, 0);
          const averageDailyUsdtPrice = totalDailyUsdtQuantity > 0 ? totalDailyUsdtValue / totalDailyUsdtQuantity : 0;
          const totalDailyTds = dailyUsdtSells.reduce((sum, t) => sum + (t.tds || 0), 0);

          const dailyTotalRelevantInrValue = relevantInrBuys.reduce((sum, t) => {
            const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
            return sum + cost;
          }, 0);
          const dailyTotalRelevantInrQuantity = relevantInrBuys.reduce((sum, t) => sum + t.quantity, 0);
          const averageRelevantInrPrice = dailyTotalRelevantInrQuantity > 0 ? dailyTotalRelevantInrValue / dailyTotalRelevantInrQuantity : 0;

          // V4 Specific Field Calculations (daily context)
          const coinSoldQty = totalDailyUsdtQuantity; // E: Matched Qty / Daily Sell Qty
          const usdtQuantity = totalDailyUsdtValue; // G: USDT Qty (Derived) / Daily Sell Value (USDT)
          
          // H: USDT Cost (INR) = AvgRelevantINRBoughtPrice * DailyCoinSoldQty
          const usdtPurchaseCostInr = averageRelevantInrPrice * coinSoldQty;
          
          // F: USDT Cost (Ratio) = H / G (if G is not 0)
          // F = (averageRelevantInrPrice * coinSoldQty) / (averageDailyUsdtPrice * coinSoldQty)
          // F = averageRelevantInrPrice / averageDailyUsdtPrice
          const usdtPurchaseCost = averageDailyUsdtPrice > 0 ? averageRelevantInrPrice / averageDailyUsdtPrice : 0;

          const currentSummary: AssetSummaryV4 = {
            displayDate: sellDateStr,
            asset,
            inrPrice: averageRelevantInrPrice, // C
            usdtPrice: averageDailyUsdtPrice, // D
            coinSoldQty: coinSoldQty, // E
            usdtPurchaseCost: usdtPurchaseCost, // F
            usdtQuantity: usdtQuantity, // G
            usdtPurchaseCostInr: usdtPurchaseCostInr, // H
            tds: totalDailyTds, // I
            totalRelevantInrValue: dailyTotalRelevantInrValue, // K
            totalRelevantInrQuantity: dailyTotalRelevantInrQuantity // L
          };
          
          console.log(`${logPrefix} Asset '${asset}', V4 Daily: Created summary for ${sellDateStr}:`, currentSummary);
          const existingSummaries = summariesByDateV4.get(sellDateStr) || [];
          summariesByDateV4.set(sellDateStr, [...existingSummaries, currentSummary]);
        });
        
        if (uniqueSellDates.length === 0 && allUsdtTrades.length > 0 && allInrTrades.length > 0) {
             console.log(`${logPrefix} Asset '${asset}': No unique sell dates found for V4 daily summary, though trades exist.`);
        }
        console.log(`${logPrefix} Asset '${asset}': Completed NORMAL CRYPTO ASSET processing for V4 (daily).`);
      })

      console.log(`${logPrefix} Step 2 Complete: summariesByDateV4 map populated with ${summariesByDateV4.size} dates.`);
      setSummaryV4(summariesByDateV4)

      if (summariesByDateV4.size === 0 && transactions.length > 0) {
        setError('No matching INR buys and USDT sells found (V4).')
      }
    } catch (err) {
      console.error('Error processing transactions V4:', err)
      setError('Error processing the file (V4). Check console for details.')
      setData([]); setHeaders([]); setSummary(new Map()); setSummaryV1([]);
    }
  }

  // V5 processing logic (Duplicate of V4)
  const processTransactionsV5 = (transactions: any[][]) => {
    const logPrefix = '[V5 LOG]'; // Changed from V4 to V5
    try {
      setError('');
      console.log(`${logPrefix} Starting V5 processing (Duplicate of V4) for`, transactions.length, 'raw rows.');

      const assetMap = new Map<string, Transaction[]>();

      // 1. Initial Parsing and Grouping by Asset (with JS Date conversion) - Same as V4
      console.log(`${logPrefix} Step 1: Parsing and Grouping rows into assetMap...`);
      transactions.forEach((row, index) => {
        const rowIndex = index + 1;
        try {
          if (!row || !Array.isArray(row) || row.length < 6) {
            // console.warn(`${logPrefix} Row ${rowIndex}: Skipping due to insufficient columns:`, row);
            return;
          }
          const dateStr = String(row[2]).trim();
          const symbol = String(row[0]).trim();
          const side = String(row[3]).trim().toUpperCase();
          let priceStr = String(row[4]);
          let quantityStr = String(row[5]);
          let totalStr = String(row[6] || ''); // Total Cost (Column 7, index 6)
          let tdsStr = String(row[7] || '');

          let price = parseFloat(priceStr.replace(/,/g, ''));
          let quantity = parseFloat(quantityStr.replace(/,/g, ''));
          let total = totalStr ? parseFloat(totalStr.replace(/,/g, '')) : NaN;
          let tds = tdsStr ? parseFloat(tdsStr.replace(/,/g, '')) : 0;

          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            // console.warn(`${logPrefix} Row ${rowIndex}: Skipping due to invalid/missing primary data:`, { symbol, side, price, quantity, rawRow: row });
            return;
          }

          let jsDate: Date | null = null;
          const dateNum = parseFloat(dateStr);
          if (!isNaN(dateNum)) {
            jsDate = excelSerialDateToJSDate(dateNum);
          }

          let baseAsset: string;
          const upperSymbolV5 = symbol.toUpperCase(); // Renamed for clarity (V5)
          if (upperSymbolV5 === 'USDTINR') {
            baseAsset = 'USDT';
          } else if (upperSymbolV5 === 'USDCINR') {
            baseAsset = 'USDC';
          } else if (upperSymbolV5 === 'DAIINR') {
            baseAsset = 'DAI';
          } else {
            baseAsset = symbol.replace(/INR|USDT|USDC|DAI$/, '');
          }
          if (!baseAsset) return;

          let quote: string; 
          if (symbol.endsWith('INR')) {
            quote = 'INR';
          } else if (symbol.endsWith('USDT')) {
            quote = 'USDT';
          } else if (symbol.endsWith('USDC')) {
            quote = 'USDC';
          } else if (symbol.endsWith('DAI')) {
            quote = 'DAI';
          } else {
            console.warn(`${logPrefix} Row ${rowIndex}: Unrecognized quote currency for symbol '${symbol}' in V5.`);
            quote = 'UNKNOWN';
          }

          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, []);
          }
          const transaction: Transaction = {
            date: dateStr, jsDate, symbol, side, price, quantity, quote, tds,
            total: isNaN(total) ? undefined : total
          };
          assetMap.get(baseAsset)?.push(transaction);
        } catch (err) {
          console.error(`${logPrefix} Row ${rowIndex}: Error processing row:`, err, row);
        }
      });
      console.log(`${logPrefix} Step 1 Complete: assetMap created with ${assetMap.size} assets.`);

      // 2. Calculate Daily Summaries (Client Logic - Duplicated from V4)
      console.log(`${logPrefix} Step 2: Calculating Daily Summaries...`);
      const summariesByDateV5 = new Map<string, AssetSummaryV5[]>(); // Changed to V5

      assetMap.forEach((transactions, asset) => {
        const STABLECOINS_V5 = ['USDT', 'USDC', 'DAI'];  // Renamed for V5 context
        if (STABLECOINS_V5.includes(asset)) {
          console.log(`${logPrefix} Asset '${asset}': Processing as STABLECOIN with direct INR trading (V5)`);
          
          const stablecoinInrBuyTrades = transactions.filter(t => 
            t.symbol.toUpperCase() === `${asset}INR` &&
            t.side === 'BUY' &&
            t.jsDate
          );

          if (stablecoinInrBuyTrades.length > 0) {
            const buysByDate = new Map<string, Transaction[]>();
            stablecoinInrBuyTrades.forEach(trade => {
              if (trade.jsDate) {
                const dateKey = formatDate(trade.jsDate);
                const existing = buysByDate.get(dateKey) || [];
                buysByDate.set(dateKey, [...existing, trade]);
              }
            });

            buysByDate.forEach((dailyBuys, dateKey) => {
              const totalInrValue = dailyBuys.reduce((sum, t) => {
                const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
                return sum + cost;
              }, 0);
              const totalStablecoinQuantity = dailyBuys.reduce((sum, t) => sum + t.quantity, 0);
              const averageInrPrice = totalStablecoinQuantity > 0 ? totalInrValue / totalStablecoinQuantity : 0;
              const totalTds = dailyBuys.reduce((sum, t) => sum + (t.tds || 0), 0);

              const summaryForDay: AssetSummaryV5 = { // Changed to V5
                displayDate: dateKey,
                asset: asset,
                inrPrice: averageInrPrice,
                usdtPrice: 0, 
                coinSoldQty: totalStablecoinQuantity,
                usdtPurchaseCost: totalStablecoinQuantity > 0 ? totalInrValue / totalStablecoinQuantity : 0, 
                usdtQuantity: totalStablecoinQuantity, 
                usdtPurchaseCostInr: totalInrValue,
                tds: totalTds,
                totalRelevantInrValue: totalInrValue,
                totalRelevantInrQuantity: totalStablecoinQuantity
              };

              const existingSummaries = summariesByDateV5.get(dateKey) || []; // Changed to V5
              summariesByDateV5.set(dateKey, [...existingSummaries, summaryForDay]); // Changed to V5
            });
          }
          console.log(`${logPrefix} Asset '${asset}': Completed STABLECOIN processing (V5)`);
          return; 
        }

        console.log(`${logPrefix} Asset '${asset}': Processing as NORMAL CRYPTO ASSET (V5)`);
        const allInrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY' && t.jsDate);
        const allUsdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL' && t.jsDate);

        if (allInrTrades.length === 0 || allUsdtTrades.length === 0) {
            console.log(`${logPrefix} Asset '${asset}': Skipping daily processing for V5 - insufficient INR buys or USDT sells.`);
            return;
        }
        console.log(`${logPrefix} Asset '${asset}': Found ${allInrTrades.length} relevant INR buys and ${allUsdtTrades.length} relevant USDT sells for potential daily V5 summaries.`);

        const uniqueSellDateStrings = [
          ...new Set(
            allUsdtTrades
              .map(t => {
                if (!t.jsDate) return null;
                const year = t.jsDate.getUTCFullYear();
                const month = (t.jsDate.getUTCMonth() + 1).toString().padStart(2, '0');
                const day = t.jsDate.getUTCDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
              })
              .filter((dateStr): dateStr is string => dateStr !== null)
          )
        ];

        const uniqueSellDates = uniqueSellDateStrings
          .map(dateStr => {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(Date.UTC(year, month - 1, day));
          })
          .sort((a, b) => a.getTime() - b.getTime());
        
        console.log(`${logPrefix} Asset '${asset}': Found ${uniqueSellDates.length} unique sell dates for daily V5 summaries.`);

        uniqueSellDates.forEach(sellDay => {
          const startOfDay = sellDay; 
          const endOfDay = new Date(Date.UTC(sellDay.getUTCFullYear(), sellDay.getUTCMonth(), sellDay.getUTCDate() + 1)); 
          const sellDateStr = formatDate(sellDay);
          console.log(`${logPrefix} Asset '${asset}', V5 Daily: Analyzing sell date ${sellDateStr}`);

          const dailyUsdtSells = allUsdtTrades.filter(t =>
            t.jsDate &&
            t.jsDate >= startOfDay &&
            t.jsDate < endOfDay
          );

          const relevantInrBuys = allInrTrades.filter(t =>
            t.jsDate && t.jsDate < endOfDay 
          );

          if (dailyUsdtSells.length === 0 || relevantInrBuys.length === 0) {
            console.log(`${logPrefix} Asset '${asset}', V5 Daily: Skipping ${sellDateStr} - no sells on this day OR no buys up to this day.`);
            return; 
          }

          const totalDailyUsdtQuantity = dailyUsdtSells.reduce((sum, t) => sum + t.quantity, 0);
          const totalDailyUsdtValue = dailyUsdtSells.reduce((sum, t) => sum + t.price * t.quantity, 0);
          const averageDailyUsdtPrice = totalDailyUsdtQuantity > 0 ? totalDailyUsdtValue / totalDailyUsdtQuantity : 0;
          const totalDailyTds = dailyUsdtSells.reduce((sum, t) => sum + (t.tds || 0), 0);

          const dailyTotalRelevantInrValue = relevantInrBuys.reduce((sum, t) => {
            const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
            return sum + cost;
          }, 0);
          const dailyTotalRelevantInrQuantity = relevantInrBuys.reduce((sum, t) => sum + t.quantity, 0);
          const averageRelevantInrPrice = dailyTotalRelevantInrQuantity > 0 ? dailyTotalRelevantInrValue / dailyTotalRelevantInrQuantity : 0;

          const coinSoldQty = totalDailyUsdtQuantity; 
          const usdtQuantity = totalDailyUsdtValue; 
          const usdtPurchaseCostInr = averageRelevantInrPrice * coinSoldQty;
          const usdtPurchaseCost = averageDailyUsdtPrice > 0 ? averageRelevantInrPrice / averageDailyUsdtPrice : 0;

          const currentSummary: AssetSummaryV5 = { // Changed to V5
            displayDate: sellDateStr,
            asset,
            inrPrice: averageRelevantInrPrice, 
            usdtPrice: averageDailyUsdtPrice, 
            coinSoldQty: coinSoldQty, 
            usdtPurchaseCost: usdtPurchaseCost, 
            usdtQuantity: usdtQuantity, 
            usdtPurchaseCostInr: usdtPurchaseCostInr, 
            tds: totalDailyTds, 
            totalRelevantInrValue: dailyTotalRelevantInrValue, 
            totalRelevantInrQuantity: dailyTotalRelevantInrQuantity 
          };
          
          console.log(`${logPrefix} Asset '${asset}', V5 Daily: Created summary for ${sellDateStr}:`, currentSummary);
          const existingSummaries = summariesByDateV5.get(sellDateStr) || []; // Changed to V5
          summariesByDateV5.set(sellDateStr, [...existingSummaries, currentSummary]); // Changed to V5
        });
        
        if (uniqueSellDates.length === 0 && allUsdtTrades.length > 0 && allInrTrades.length > 0) {
             console.log(`${logPrefix} Asset '${asset}': No unique sell dates found for V5 daily summary, though trades exist.`);
        }
        console.log(`${logPrefix} Asset '${asset}': Completed NORMAL CRYPTO ASSET processing for V5 (daily).`);
      })

      console.log(`${logPrefix} Step 2 Complete: summariesByDateV5 map populated with ${summariesByDateV5.size} dates.`); // Changed to V5
      setSummaryV5(summariesByDateV5) // Changed to V5

      if (summariesByDateV5.size === 0 && transactions.length > 0) { // Changed to V5
        setError('No matching INR buys and USDT sells found (V5).') // Changed to V5
      }
    } catch (err) {
      console.error('Error processing transactions V5:', err) // Changed to V5
      setError('Error processing the file (V5). Check console for details.') // Changed to V5
      setData([]); setHeaders([]); setSummary(new Map()); setSummaryV1([]); setSummaryV4(new Map()); setSummaryV5(new Map()); // Added setSummaryV5
    }
  }

  // Main processing function that calls the appropriate version
  const processTransactions = (transactions: any[][]) => {
    console.log('Processing transactions with version:', version);
    setSummary(new Map()); // Clear summary before processing
    setSummaryV1([]);    // Clear V1 summary
    setSummaryV4(new Map()); // Clear V4 summary
    setSummaryV5(new Map()); // Clear V5 summary
    
    switch (version) {
      case 'v1':
        processTransactionsV1(transactions);
        break;
      case 'v3':
        processTransactionsV3(transactions);
        break;
      case 'v4':
        processTransactionsV4(transactions);
        break;
      case 'v5':
        processTransactionsV5(transactions);
        break;
      default:
        console.warn('Unknown version:', version);
        break;
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
          setSummary(new Map()) 
          setSummaryV1([])
          setSummaryV4(new Map())
          setSummaryV5(new Map())
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
    }
  }

  // Function to export V3 summary data to CSV
  const exportV3SummaryToCSV = () => {
    if (version !== 'v3' || summary.size === 0) return;
    const strategy = 'proportional'; // <-- Use hardcoded strategy for filename

    const csvHeaders = [
      'Date',
      'Asset',
      'Avg INR Price',
      'Avg USDT Price',
      'Matched Qty',
      'USDT Cost (Ratio)',
      'USDT Qty (Derived)',
      'USDT Cost (INR)',
      'TDS'
    ];
    const csvRows: string[] = [csvHeaders.join(',')];

    // Sort by date, then by asset within date
    Array.from(summary.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .forEach(([date, summariesOnDate]) => {
        summariesOnDate
        .sort((a,b) => a.asset.localeCompare(b.asset))
        .forEach((item) => {
          const csvRow = [
            `"${date}"`, // Add quotes for potential commas
            item.asset,
            item.inrPrice > 0 ? item.inrPrice.toFixed(4) : '',
            item.usdtPrice > 0 ? item.usdtPrice.toFixed(4) : '',
            item.coinSoldQty.toFixed(4),
            item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(4) : '',
            item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(4) : '',
            item.usdtPurchaseCostInr.toFixed(2),
            item.tds > 0 ? item.tds.toFixed(2) : ''
          ].join(',');
          csvRows.push(csvRow);
        });
      });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `crypto_summary_v3_${strategy}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Function to export V4 summary data to CSV (Client Specific)
  const exportV4SummaryToCSV = () => {
    if (version !== 'v4' || summaryV4.size === 0) return;

    const csvHeaders = [
      'Date', // A
      'Asset', // B
      'Avg INR Price', // C
      'Avg USDT Price', // D
      'Matched Qty', // E
      'USDT Cost (Ratio)', // F
      'USDT Qty (Derived)', // G
      'USDT Cost (INR)', // H
      'TDS', // I
      '', // J (Empty)
      'BUY IN INR', // K
      'QNTY', // L
      '', // M (Empty)
      '', // N (Empty)
      '"26,27,29&30 AUGOST MY WORKE"' // O (Comment - Ensure quotes are handled)
    ];
    const csvRows: string[] = [csvHeaders.join(',')];

    // Sort by date, then by asset within date
    Array.from(summaryV4.entries())
      .sort((a, b) => {
          const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          if (isNaN(dateA) || isNaN(dateB)) return a[0].localeCompare(b[0]);
          return dateA - dateB;
      })
      .forEach(([date, summariesOnDate]) => {
        // First add all regular rows
        summariesOnDate
        .sort((a,b) => a.asset.localeCompare(b.asset))
        .forEach((item) => {
          const csvRow = [
            `"${date}"`, // A (Quoted date)
            item.asset, // B
            item.inrPrice > 0 ? item.inrPrice.toFixed(10) : '', // C (Precision 10)
            item.usdtPrice > 0 ? item.usdtPrice.toFixed(10) : '', // D (Precision 10)
            item.coinSoldQty ? item.coinSoldQty.toFixed(10) : '0.0000000000', // E
            item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(10) : '', // F (Precision 10)
            item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(10) : '', // G
            item.usdtPurchaseCostInr ? item.usdtPurchaseCostInr.toFixed(10) : '0.0000000000', // H (Precision 10)
            item.tds > 0 ? item.tds.toFixed(10) : '', // I
            '', // J (Empty)
            item.totalRelevantInrValue ? item.totalRelevantInrValue.toFixed(10) : '0.0000000000', // K (Precision 10)
            item.totalRelevantInrQuantity ? item.totalRelevantInrQuantity.toFixed(10) : '0.0000000000', // L
            '', // M (Empty)
            '', // N (Empty)
            '' // O (No comment needed per row based on sample)
          ].join(',');
          csvRows.push(csvRow);
        });

        // Then add the total row for this date
        const totals = {
          coinSoldQty: summariesOnDate.reduce((sum, item) => sum + (item.coinSoldQty || 0), 0),
          usdtQuantity: summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0),
          usdtPurchaseCostInr: summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0),
          tds: summariesOnDate.reduce((sum, item) => sum + (item.tds || 0), 0),
          totalRelevantInrValue: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrValue || 0), 0),
          totalRelevantInrQuantity: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrQuantity || 0), 0),
        };

        const totalRow = [
          `"${date}"`, // A (Quoted date)
          'Total', // B
          '', // C (No avg price for total)
          '', // D (No avg price for total)
          totals.coinSoldQty.toFixed(10), // E
          '', // F (No ratio for total)
          totals.usdtQuantity.toFixed(10), // G
          totals.usdtPurchaseCostInr.toFixed(10), // H
          totals.tds.toFixed(10), // I
          '', // J (Empty)
          totals.totalRelevantInrValue.toFixed(10), // K (Precision 10)
          totals.totalRelevantInrQuantity.toFixed(10), // L
          '', // M (Empty)
          '', // N (Empty)
          '' // O (No comment needed for total)
        ].join(',');
        csvRows.push(totalRow);
        
        // Add a blank row after each date's total for better readability
        csvRows.push('');
      });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `crypto_summary_v4_client.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Function to export V5 summary data to CSV (Duplicate of V4 Client Specific)
  const exportV5SummaryToCSV = () => {
    if (version !== 'v5' || summaryV5.size === 0) return;

    const csvHeaders = [
      'Date', // A
      'Asset', // B
      'Avg INR Price', // C
      'Avg USDT Price', // D
      'Matched Qty', // E
      'USDT Cost (Ratio)', // F
      'USDT Qty (Derived)', // G
      'USDT Cost (INR)', // H
      'TDS', // I
      '', // J (Empty)
      'BUY IN INR', // K
      'QNTY', // L
      '', // M (Empty)
      '', // N (Empty)
      '"V5 DUPLICATE OF V4 COMMENT"' // O (Comment - Ensure quotes are handled)
    ];
    const csvRows: string[] = [csvHeaders.join(',')];

    // Sort by date, then by asset within date
    Array.from(summaryV5.entries())
      .sort((a, b) => {
          const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          if (isNaN(dateA) || isNaN(dateB)) return a[0].localeCompare(b[0]);
          return dateA - dateB;
      })
      .forEach(([date, summariesOnDate]) => {
        // First add all regular rows
        summariesOnDate
        .sort((a,b) => a.asset.localeCompare(b.asset))
        .forEach((item) => {
          const csvRow = [
            `"${date}"`, // A (Quoted date)
            item.asset, // B
            item.inrPrice > 0 ? item.inrPrice.toFixed(10) : '', // C (Precision 10)
            item.usdtPrice > 0 ? item.usdtPrice.toFixed(10) : '', // D (Precision 10)
            item.coinSoldQty ? item.coinSoldQty.toFixed(10) : '0.0000000000', // E
            item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(10) : '', // F (Precision 10)
            item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(10) : '', // G
            item.usdtPurchaseCostInr ? item.usdtPurchaseCostInr.toFixed(10) : '0.0000000000', // H (Precision 10)
            item.tds > 0 ? item.tds.toFixed(10) : '', // I
            '', // J (Empty)
            item.totalRelevantInrValue ? item.totalRelevantInrValue.toFixed(10) : '0.0000000000', // K (Precision 10)
            item.totalRelevantInrQuantity ? item.totalRelevantInrQuantity.toFixed(10) : '0.0000000000', // L
            '', // M (Empty)
            '', // N (Empty)
            '' // O (No comment needed per row based on sample)
          ].join(',');
          csvRows.push(csvRow);
        });

        // Then add the total row for this date
        const totals = {
          coinSoldQty: summariesOnDate.reduce((sum, item) => sum + (item.coinSoldQty || 0), 0),
          usdtQuantity: summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0),
          usdtPurchaseCostInr: summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0),
          tds: summariesOnDate.reduce((sum, item) => sum + (item.tds || 0), 0),
          totalRelevantInrValue: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrValue || 0), 0),
          totalRelevantInrQuantity: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrQuantity || 0), 0),
        };

        const totalRow = [
          `"${date}"`, // A (Quoted date)
          'Total', // B
          '', // C (No avg price for total)
          '', // D (No avg price for total)
          totals.coinSoldQty.toFixed(10), // E
          '', // F (No ratio for total)
          totals.usdtQuantity.toFixed(10), // G
          totals.usdtPurchaseCostInr.toFixed(10), // H
          totals.tds.toFixed(10), // I
          '', // J (Empty)
          totals.totalRelevantInrValue.toFixed(10), // K (Precision 10)
          totals.totalRelevantInrQuantity.toFixed(10), // L
          '', // M (Empty)
          '', // N (Empty)
          '' // O (No comment needed for total)
        ].join(',');
        csvRows.push(totalRow);
        
        // Add a blank row after each date's total for better readability
        csvRows.push('');
      });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `crypto_summary_v5_client.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
              <MenuItem value="v2">Version 2 (Original)</MenuItem>
              <MenuItem value="v3">Version 3 (Daily)</MenuItem>
              <MenuItem value="v4">Version 4 (Client)</MenuItem>
              <MenuItem value="v5">Version 5 (Client Dup)</MenuItem>
            </Select>
          </FormControl>
        </Box>

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
                onClick={exportV3SummaryToCSV}
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
                onClick={exportV4SummaryToCSV}
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
                onClick={exportV5SummaryToCSV}
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

        {data.length > 0 && (
          <>
            <Typography variant="h5" component="h2" gutterBottom>
              {/* Raw Transaction Data (First 100 Rows) */}
              Raw Transaction Data ({data.length} Rows) {/* Updated Title */}
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
                  {/* {data.slice(0, 100).map((row, rowIndex) => ( */}
                  {data
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage) // Apply pagination slicing
                    .map((row, rowIndex) => (
                    <TableRow
                      key={page * rowsPerPage + rowIndex} // Ensure key is unique across pages
                      sx={{ '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover } }}
                    >
                      {row.map((cell: any, colIndex: number) => {
                        // Check if this is the date column (assuming index 2)
                        if (colIndex === 2) {
                          const dateNum = parseFloat(cell);
                          if (!isNaN(dateNum)) {
                            const jsDate = excelSerialDateToJSDate(dateNum);
                            // Use formatDateTime instead of formatDate
                            return <TableCell key={colIndex}>{formatDateTime(jsDate)}</TableCell>;
                          }
                        }
                        // Otherwise, display the cell value as is
                        return <TableCell key={colIndex}>{cell}</TableCell>;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination // Add TablePagination component
              rowsPerPageOptions={[10, 25, 50, 100, 250, 500, { label: 'All', value: data.length }]} // Added 'All' option
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

      {/* Display Git Commit Hash and Build Timestamp */}
      {(import.meta.env.VITE_GIT_COMMIT_HASH || import.meta.env.VITE_BUILD_TIMESTAMP) && (
        <Box sx={{ 
          position: 'fixed', 
          bottom: 8, 
          right: 8, 
          px: 1, 
          py: 0.5, 
          backgroundColor: 'rgba(128, 128, 128, 0.1)', 
          borderRadius: 1, 
          textAlign: 'right' 
        }}>
          {import.meta.env.VITE_GIT_COMMIT_HASH && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Build: {import.meta.env.VITE_GIT_COMMIT_HASH}
            </Typography>
          )}
          {import.meta.env.VITE_BUILD_TIMESTAMP && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Updated: {new Date(import.meta.env.VITE_BUILD_TIMESTAMP).toLocaleString()}
            </Typography>
          )}
        </Box>
      )}

    </ThemeProvider>
  )
}

export default App
