import { AssetSummary, Transaction } from "../types";
import { excelSerialDateToJSDate, formatDate } from "../utils/dateUtils";

// V3 processing logic, Transaction, AssetSummary (Daily Aggregation)
export const processTransactionsV3 = (transactions: any[][]) => {
    const strategy = 'proportional'; // <-- Hardcode strategy
    const logPrefix = '[V3 LOG]';
    try {
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
            t.jsDate && 
            t.jsDate >= startOfDay && 
            t.jsDate < endOfDay
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
             throw new Error('Trades found, but no matching daily INR buys/USDT sells based on selected criteria.');
        } else {
             console.warn(`${logPrefix} No potential asset pairs found.`);
             throw new Error('No matching asset pairs (like ASSET/INR Buy and ASSET/USDT Sell with valid dates) found in the data.');
        }
      }

      return summariesByDate;

    } catch (err) {
      console.error(`${logPrefix} CRITICAL ERROR in processTransactionsV3:`, err);
      throw new Error('Critical error during V3 processing. Check console for details.');
    }
};