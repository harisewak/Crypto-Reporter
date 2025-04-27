import React from 'react'
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
  SelectChangeEvent,
  Tooltip
} from '@mui/material'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { lightTheme, darkTheme } from './theme'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
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

  const day = date.getDate();
  const year = date.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[date.getMonth()];

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

interface Transaction {
  date: string; // Store original date string/serial from Excel
  jsDate: Date | null; // Add JS Date object
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
  const [summary, setSummary] = useState<Map<string, AssetSummary[]>>(new Map())
  const [summaryV1, setSummaryV1] = useState<AssetSummaryV1[]>([])
  const [error, setError] = useState<string>('')
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')
  const [version, setVersion] = useState<'v1' | 'v2' | 'v3'>('v3')
  const [matchingStrategy, setMatchingStrategy] = useState<'simplified' | 'proportional'>('simplified')
  const [dateSortDirection, setDateSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleTheme = () => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const toggleDateSort = () => {
    setDateSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleVersionChange = (event: SelectChangeEvent) => {
    setVersion(event.target.value as 'v1' | 'v2' | 'v3')
  }

  const handleMatchingStrategyChange = (event: SelectChangeEvent) => {
    setMatchingStrategy(event.target.value as 'simplified' | 'proportional');
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
            jsDate: null,
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

  // V3 processing logic (Daily Aggregation)
  const processTransactionsV3 = (transactions: any[][], strategy: 'simplified' | 'proportional') => {
    try {
      setError('')
      console.log(`Processing transactions (V3 - ${strategy}):`, transactions.length, 'rows')

      const assetMap = new Map<string, Transaction[]>()

      // 1. Initial Parsing and Grouping by Asset (with JS Date conversion)
      transactions.forEach((row, index) => {
        try {
          if (!row || !Array.isArray(row) || row.length < 6) {
            console.log(`Skipping row ${index} due to insufficient columns:`, row)
            return
          }

          const dateStr = String(row[2]).trim() // Trade_Completion_time
          const symbol = String(row[0]).trim()
          const side = String(row[3]).trim().toUpperCase()
          let priceStr = String(row[4])
          let quantityStr = String(row[5])
          let tdsStr = String(row[7] || '')

          let price = parseFloat(priceStr.replace(/,/g, ''))
          let quantity = parseFloat(quantityStr.replace(/,/g, ''))
          let tds = tdsStr ? parseFloat(tdsStr.replace(/,/g, '')) : 0

          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            console.log(`Skipping row ${index} due to invalid/missing data:`, { symbol, side, price, quantity, rawRow: row })
            return
          }

          // --- Convert date early ---
          let jsDate: Date | null = null;
          const dateNum = parseFloat(dateStr);
          if (!isNaN(dateNum)) {
            jsDate = excelSerialDateToJSDate(dateNum);
          } else {
             console.warn(`Row ${index}: Could not parse date '${dateStr}' as Excel serial number.`);
             // Optionally try parsing as standard date string if needed
             // jsDate = new Date(dateStr);
             // if (isNaN(jsDate.getTime())) jsDate = null; 
          }
          // -------------------------

          let baseAsset: string;
          if (symbol.toUpperCase() === 'USDTINR') {
            baseAsset = 'USDT';
          } else {
            baseAsset = symbol.replace(/INR|USDT$/, '');
          }

          const quote = symbol.endsWith('INR') ? 'INR' : 'USDT'

          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, [])
          }

          const transaction: Transaction = {
            date: dateStr, // Keep original string
            jsDate, // Store JS Date
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

      // 2. Calculate Daily Summaries
      const summariesByDate = new Map<string, AssetSummary[]>()

      assetMap.forEach((transactions, asset) => {
        // Handle direct USDT/INR Buys separately (no daily matching needed here)
        if (asset === 'USDT') {
            const usdtInrBuyTrades = transactions.filter(t => 
                t.symbol.toUpperCase() === 'USDTINR' && 
                t.side === 'BUY' &&
                t.jsDate // Ensure date is valid
            );

            if (usdtInrBuyTrades.length > 0) {
                 // Group by date for USDT/INR buys as well
                const buysByDate = new Map<string, Transaction[]>();
                usdtInrBuyTrades.forEach(trade => {
                    if (trade.jsDate) {
                        const dateKey = formatDate(trade.jsDate);
                        const existing = buysByDate.get(dateKey) || [];
                        buysByDate.set(dateKey, [...existing, trade]);
                    }
                });

                buysByDate.forEach((dailyBuys, dateKey) => {
                    const totalInrValue = dailyBuys.reduce((sum, t) => sum + t.price * t.quantity, 0);
                    const totalUsdtQuantity = dailyBuys.reduce((sum, t) => sum + t.quantity, 0);
                    const averageInrPrice = totalUsdtQuantity > 0 ? totalInrValue / totalUsdtQuantity : 0;
    
                    const currentSummary: AssetSummary = {
                      displayDate: dateKey, 
                      asset: 'USDT',
                      inrPrice: averageInrPrice,
                      usdtPrice: 0, // Not applicable
                      coinSoldQty: 0, // Not applicable
                      usdtPurchaseCost: 0, // Not applicable
                      usdtQuantity: totalUsdtQuantity,
                      usdtPurchaseCostInr: totalInrValue,
                      tds: 0, 
                    };
    
                    const existingSummaries = summariesByDate.get(dateKey) || [];
                    summariesByDate.set(dateKey, [...existingSummaries, currentSummary]);
                });
            }
            return; // Skip normal asset processing for USDT
        }

        // --- Process Asset Pairs (e.g., ZIL/INR, ZIL/USDT) --- 
        const allInrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY' && t.jsDate);
        const allUsdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL' && t.jsDate);

        // Find unique USDT sell dates (ignoring time)
        const uniqueSellDateStrings = [
          ...new Set(
            allUsdtTrades
              .map(t => {
                  if (!t.jsDate) return null;
                  // Create a string representation of the date only (YYYY-MM-DD)
                  // This ensures we group by calendar day, ignoring time.
                  const year = t.jsDate.getFullYear();
                  const month = (t.jsDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
                  const day = t.jsDate.getDate().toString().padStart(2, '0');
                  return `${year}-${month}-${day}`;
              })
              .filter((dateStr): dateStr is string => dateStr !== null) // Filter out nulls
          )
        ];
        
        // Convert unique date strings back to Date objects (set to midnight UTC for consistency)
        // and sort them chronologically.
        const uniqueSellDates = uniqueSellDateStrings
            .map(dateStr => {
                const [year, month, day] = dateStr.split('-').map(Number);
                // Create Date object at UTC midnight
                return new Date(Date.UTC(year, month - 1, day)); 
            })
            .sort((a, b) => a.getTime() - b.getTime()); // Process chronologically

        console.log(`Processing ${asset} with ${uniqueSellDates.length} unique sell dates.`);

        // Store remaining INR quantities for proportional/FIFO if needed later
        // let remainingInrTrades = [...allInrTrades]; 

        uniqueSellDates.forEach(sellDay => {
            // Get the start and end of the sell day (UTC)
            const startOfDay = sellDay; // Already at UTC midnight
            const endOfDay = new Date(Date.UTC(sellDay.getUTCFullYear(), sellDay.getUTCMonth(), sellDay.getUTCDate() + 1)); // Midnight of the next day

            const sellDateStr = formatDate(sellDay); // Format for display and map key
            console.log(`-- Analyzing ${asset} for sell date: ${sellDateStr}`);

            // Get USDT sells *only* for this specific calendar day
            const dailyUsdtSells = allUsdtTrades.filter(t => 
                t.jsDate && 
                t.jsDate >= startOfDay && 
                t.jsDate < endOfDay 
            );

            // Get INR buys *up to and including the end* of this specific day
            const relevantInrBuys = allInrTrades.filter(t => 
                t.jsDate && t.jsDate < endOfDay // Use < endOfDay to include everything on sellDay
            );

            if (dailyUsdtSells.length === 0 || relevantInrBuys.length === 0) {
                console.log(`-- Skipping ${sellDateStr}: No sells on this day or no buys up to this day.`);
                return; // Skip if no sells on this day or no relevant buys
            }

            // --- Calculate Metrics based on Strategy --- 
            let summaryForDay: AssetSummary | null = null;

            const totalDailyUsdtQuantity = dailyUsdtSells.reduce((sum, t) => sum + t.quantity, 0);
            const totalDailyUsdtValue = dailyUsdtSells.reduce((sum, t) => sum + t.price * t.quantity, 0);
            const averageDailyUsdtPrice = totalDailyUsdtQuantity > 0 ? totalDailyUsdtValue / totalDailyUsdtQuantity : 0;
            const totalDailyTds = dailyUsdtSells.reduce((sum, t) => sum + (t.tds || 0), 0);

            if (strategy === 'simplified' || strategy === 'proportional') {
                // For both these strategies, we need the aggregated INR buys up to the sell date.
                const totalRelevantInrValue = relevantInrBuys.reduce((sum, t) => sum + t.price * t.quantity, 0);
                const totalRelevantInrQuantity = relevantInrBuys.reduce((sum, t) => sum + t.quantity, 0);
                const averageRelevantInrPrice = totalRelevantInrQuantity > 0 ? totalRelevantInrValue / totalRelevantInrQuantity : 0;

                let coinSoldQty = 0;
                let usdtPurchaseCostRatio = 0;
                let derivedCoinSoldQty = 0;
                let usdtPurchaseCostInr = 0;

                if (strategy === 'simplified') {
                    // Simplified: Match based on min quantity for the day vs total buys up to day.
                    // This interpretation might be slightly off the user's intent, needs review. 
                    // Let's use average prices like before but with filtered dates.
                    coinSoldQty = Math.min(totalRelevantInrQuantity, totalDailyUsdtQuantity); // Use total INR up to date? Or daily? Let's stick to total for now.
                    usdtPurchaseCostRatio = averageDailyUsdtPrice > 0 ? averageRelevantInrPrice / averageDailyUsdtPrice : 0;
                    derivedCoinSoldQty = usdtPurchaseCostRatio > 0 ? totalRelevantInrValue / usdtPurchaseCostRatio : 0; // Based on ALL INR value up to date?
                    usdtPurchaseCostInr = averageRelevantInrPrice * totalDailyUsdtQuantity; // Cost based on avg INR price * daily USDT qty sold
                }
                 else { // proportional
                    // Proportional: Use the average INR price up to the sell date as the cost basis.
                    coinSoldQty = totalDailyUsdtQuantity; // Assume we 'sell' the quantity sold today
                    usdtPurchaseCostRatio = averageDailyUsdtPrice > 0 ? averageRelevantInrPrice / averageDailyUsdtPrice : 0;
                    // derivedCoinSoldQty = ? // This calculation might not make sense proportionally
                    usdtPurchaseCostInr = averageRelevantInrPrice * totalDailyUsdtQuantity; // Cost of today's sells at avg historical INR price
                    derivedCoinSoldQty = totalDailyUsdtQuantity; // Let's set this to the sold quantity for now
                }
                
                summaryForDay = {
                    displayDate: sellDateStr,
                    asset,
                    inrPrice: averageRelevantInrPrice, // Avg INR price up to sell date
                    usdtPrice: averageDailyUsdtPrice, // Avg USDT price ON sell date
                    coinSoldQty: coinSoldQty,         // Calculated based on strategy
                    usdtPurchaseCost: usdtPurchaseCostRatio, // Ratio (Avg INR / Avg Daily USDT)
                    usdtQuantity: derivedCoinSoldQty,    // Derived based on strategy
                    usdtPurchaseCostInr: usdtPurchaseCostInr, // Calculated based on strategy
                    tds: totalDailyTds
                };
            }
            // --- (Add FIFO logic here if implemented later) --- 
            

            if (summaryForDay) {
                const existingSummaries = summariesByDate.get(sellDateStr) || [];
                summariesByDate.set(sellDateStr, [...existingSummaries, summaryForDay]);
                console.log(`-- Added summary for ${asset} on ${sellDateStr}:`, summaryForDay);
            }
        });
      });

      console.log('Final summaries count (dates):', summariesByDate.size)
      // Set the state with the new Map
      setSummary(summariesByDate)

      if (summariesByDate.size === 0 && transactions.length > 0) {
         // Check if any potential pairs existed but didn't match daily
        let potentialPairs = false;
        assetMap.forEach((trans, asset) => {
            if (asset !== 'USDT') {
                const hasInr = trans.some(t => t.quote === 'INR' && t.side === 'BUY');
                const hasUsdt = trans.some(t => t.quote === 'USDT' && t.side === 'SELL');
                if (hasInr && hasUsdt) potentialPairs = true;
            }
        });
        if (potentialPairs) {
             setError('Trades found, but no matching daily INR buys/USDT sells based on selected criteria.')
        } else {
             setError('No matching asset pairs (like ASSET/INR Buy and ASSET/USDT Sell) found in the data.');
        }
      }
    } catch (err) {
      console.error('Error processing transactions V3:', err)
      setError('Error processing the file (V3). Check console for details.')
      setData([])
      setHeaders([])
      setSummary(new Map())
      setSummaryV1([])
    }
  }

  // V2 processing logic (Original - Aggregate by Asset, use latest date)
  const processTransactionsV2 = (transactions: any[][]) => {
    try {
      setError('')
      console.log('Processing transactions (V2 - Original):', transactions.length, 'rows')

      const assetMap = new Map<string, Transaction[]>()

      // 1. Initial Parsing and Grouping by Asset (similar to V3 start)
      transactions.forEach((row, index) => {
        try {
          // Basic validation
          if (!row || !Array.isArray(row) || row.length < 6) return;
          
          const dateStr = String(row[2]).trim() // Keep as string/serial for now
          const symbol = String(row[0]).trim()
          const side = String(row[3]).trim().toUpperCase()
          let priceStr = String(row[4])
          let quantityStr = String(row[5])
          let tdsStr = String(row[7] || '')

          let price = parseFloat(priceStr.replace(/,/g, ''))
          let quantity = parseFloat(quantityStr.replace(/,/g, ''))
          let tds = tdsStr ? parseFloat(tdsStr.replace(/,/g, '')) : 0

          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) return;

          let baseAsset: string;
          if (symbol.toUpperCase() === 'USDTINR') {
            baseAsset = 'USDT';
          } else {
            baseAsset = symbol.replace(/INR|USDT$/, '');
          }
          const quote = symbol.endsWith('INR') ? 'INR' : 'USDT'

          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, [])
          }

          // Note: No jsDate needed here for V2 original logic
          const transaction: Transaction = {
            date: dateStr,
            jsDate: null, // Set to null for consistency, but not used
            symbol, side, price, quantity, quote, tds
          }
          assetMap.get(baseAsset)?.push(transaction)
        } catch (err) {
          console.error(`Error processing row ${index} (V2):`, err, row)
        }
      })

      // 2. Calculate Aggregated Summaries (Original V2 logic)
      const summariesByDate = new Map<string, AssetSummary[]>()

      assetMap.forEach((transactions, asset) => {
         // Handle direct USDT/INR buys (similar to V3 but aggregate all)
         if (asset === 'USDT') {
            const usdtInrBuyTrades = transactions.filter(t => t.symbol.toUpperCase() === 'USDTINR' && t.side === 'BUY');
            if (usdtInrBuyTrades.length > 0) {
                const totalInrValue = usdtInrBuyTrades.reduce((sum, t) => sum + t.price * t.quantity, 0);
                const totalUsdtQuantity = usdtInrBuyTrades.reduce((sum, t) => sum + t.quantity, 0);
                const averageInrPrice = totalUsdtQuantity > 0 ? totalInrValue / totalUsdtQuantity : 0;

                // Get *latest* date from these specific trades
                const usdtDatesSerials = usdtInrBuyTrades
                    .map(t => parseFloat(t.date))
                    .filter(d => !isNaN(d));
                let displayDateStr = 'N/A';
                if (usdtDatesSerials.length > 0) {
                    const latestSerial = Math.max(...usdtDatesSerials);
                    displayDateStr = formatDate(excelSerialDateToJSDate(latestSerial));
                }

                const currentSummary: AssetSummary = {
                    displayDate: displayDateStr,
                    asset: 'USDT',
                    inrPrice: averageInrPrice,
                    usdtPrice: 0, coinSoldQty: 0, usdtPurchaseCost: 0,
                    usdtQuantity: totalUsdtQuantity,
                    usdtPurchaseCostInr: totalInrValue,
                    tds: 0, 
                };
                const existingSummaries = summariesByDate.get(displayDateStr) || [];
                summariesByDate.set(displayDateStr, [...existingSummaries, currentSummary]);
            }
        } else {
            // --- Process Asset Pairs --- 
            const inrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY');
            const usdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL');

            if (inrTrades.length > 0 && usdtTrades.length > 0) {
                // Get the most recent date ONLY from USDT sell trades
                const usdtDatesSerials = usdtTrades
                    .map(t => parseFloat(t.date))
                    .filter(d => !isNaN(d));
                    
                let displayDateStr = 'N/A';
                if (usdtDatesSerials.length > 0) {
                    const latestSerial = Math.max(...usdtDatesSerials);
                    const latestJSDate = excelSerialDateToJSDate(latestSerial);
                    displayDateStr = formatDate(latestJSDate);
                }

                // Calculate total values across ALL trades for the asset
                const totalInrValue = inrTrades.reduce((sum, t) => sum + t.price * t.quantity, 0)
                const totalInrQuantity = inrTrades.reduce((sum, t) => sum + t.quantity, 0)
                const totalUsdtValue = usdtTrades.reduce((sum, t) => sum + t.price * t.quantity, 0)
                const totalUsdtQuantity = usdtTrades.reduce((sum, t) => sum + t.quantity, 0)
                const totalTds = usdtTrades.reduce((sum, t) => sum + (t.tds || 0), 0)

                const averageInrPrice = totalInrQuantity > 0 ? totalInrValue / totalInrQuantity : 0
                const averageUsdtPrice = totalUsdtQuantity > 0 ? totalUsdtValue / totalUsdtQuantity : 0
                
                const usdtPurchaseCostInr = averageInrPrice * totalUsdtQuantity
                const usdtPurchaseCostRatio = averageUsdtPrice > 0 ? averageInrPrice / averageUsdtPrice : 0
                const derivedCoinSoldQty = usdtPurchaseCostRatio > 0 ? totalInrValue / usdtPurchaseCostRatio : 0
                const actualMatchedQty = Math.min(totalInrQuantity, totalUsdtQuantity)

                const currentSummary: AssetSummary = {
                    displayDate: displayDateStr, // Use latest date
                    asset,
                    inrPrice: averageInrPrice,
                    usdtPrice: averageUsdtPrice,
                    coinSoldQty: actualMatchedQty,
                    usdtPurchaseCost: usdtPurchaseCostRatio,
                    usdtQuantity: derivedCoinSoldQty, // Note: Was labeled 'USDT Quantity' in UI
                    usdtPurchaseCostInr, // Note: Was labeled 'USDT Purchase Cost in INR'
                    tds: totalTds
                };
                
                const existingSummaries = summariesByDate.get(displayDateStr) || [];
                summariesByDate.set(displayDateStr, [...existingSummaries, currentSummary]);
            }
        }
      })

      console.log('Final summaries count V2 (dates):', summariesByDate.size)
      setSummary(summariesByDate) // V2 uses the same summary state as V3

      if (summariesByDate.size === 0 && transactions.length > 0) {
        setError('No matching INR buys and USDT sells found (V2).')
      }
    } catch (err) {
      console.error('Error processing transactions V2:', err)
      setError('Error processing the file (V2). Check console for details.')
      setData([]); setHeaders([]); setSummary(new Map()); setSummaryV1([]);
    }
  }

  // Main processing function that calls the appropriate version
  const processTransactions = (transactions: any[][]) => {
    console.log('Processing transactions with version:', version, 'and strategy:', matchingStrategy)
    setSummary(new Map()); // Clear summary before processing
    setSummaryV1([]);    // Clear V1 summary too

    if (version === 'v1') {
      processTransactionsV1(transactions)
    } else if (version === 'v3') {
      processTransactionsV3(transactions, matchingStrategy)
    } else { // version === 'v2'
      processTransactionsV2(transactions)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('')
      setData([])
      setHeaders([])
      setSummary(new Map())
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
          setSummary(new Map()) 
          setSummaryV1([])
        }
      }
      reader.onerror = () => {
        setError('Error reading the file')
        setData([]) 
        setHeaders([])
        setSummary(new Map()) 
        setSummaryV1([])
      }
      reader.readAsBinaryString(file)
    } catch (err) {
      console.error('Error handling file upload:', err)
      setError('Error handling file upload')
      setData([]) 
      setHeaders([])
      setSummary(new Map()) 
      setSummaryV1([])
    }
  }

  // Function to export V3 summary data to CSV
  const exportV3SummaryToCSV = () => {
    if (version !== 'v3' || summary.size === 0) return;

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
      link.setAttribute('download', `crypto_summary_v3_${matchingStrategy}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
            </Select>
          </FormControl>

          {version === 'v3' && (
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel id="strategy-select-label">Match Strategy</InputLabel>
              <Select
                labelId="strategy-select-label"
                id="strategy-select"
                value={matchingStrategy}
                label="Match Strategy"
                onChange={handleMatchingStrategyChange}
              >
                <MenuItem value={'simplified'}>Simplified</MenuItem>
                <MenuItem value={'proportional'}>Proportional</MenuItem>
              </Select>
            </FormControl>
          )}

          {version === 'v3' && (
            <Tooltip
              title={
                matchingStrategy === 'simplified'
                  ? "Simplified: Matches USDT sells on a given day with the average price of *all* INR buys for that asset up to and including that day. Calculates matched quantity based on the minimum of total INR and USDT quantities considered."
                  : "Proportional: Matches USDT sells on a given day using the weighted average price of *all* INR buys for that asset up to and including that day to determine the cost basis."
              }
              arrow
            >
              <IconButton color="info" size="small">
                <InfoOutlinedIcon />
              </IconButton>
            </Tooltip>
          )}
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
                Trade Summary (V3 - {matchingStrategy})
              </Typography>
              <Tooltip title={`Sort Dates ${dateSortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
                  <IconButton size="small" onClick={toggleDateSort} color="primary">
                      {dateSortDirection === 'asc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
                  </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={exportV3SummaryToCSV}
                title={`Export V3 (${matchingStrategy}) Summary to CSV`}
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
