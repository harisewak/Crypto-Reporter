import { AssetSummaryV4, Transaction } from "../types";
import { excelSerialDateToJSDate, formatDate } from "../utils/dateUtils";

    // V4 processing logic (Client Specific Calculation)
export const processTransactionsV4 = (transactions: any[][]): Map<string, AssetSummaryV4[]> => {
    const logPrefix = '[V4 LOG]';
    try {
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
            t.jsDate && 
            t.jsDate >= startOfDay && 
            t.jsDate < endOfDay
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
      
      if (summariesByDateV4.size === 0 && transactions.length > 0) {
        throw new Error('No matching INR buys and USDT sells found (V4).');
      }

      return summariesByDateV4;

    } catch (err) {
      console.error('Error processing transactions V4:', err);
      throw new Error('Error processing the file (V4). Check console for details.');
    }
};