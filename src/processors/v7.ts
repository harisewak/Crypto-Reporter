import { AssetSummaryV7, Transaction } from "../types";
import { excelSerialDateToJSDate, formatDate } from "../utils/dateUtils";

export const processTransactionsV7 = (transactions: any[][]): {
  summaries: Map<string, AssetSummaryV7[]>;
  skippedItems: Map<string, AssetSummaryV7[]>;
} => {
    const logPrefix = '[V7 LOG]';
    try {
      console.log(`${logPrefix} Starting V7 processing for`, transactions.length, 'raw rows.');

      const assetMap = new Map<string, Transaction[]>();

      // 1. Initial Parsing and Grouping by Asset (with JS Date conversion)
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
          const upperSymbolV7 = symbol.toUpperCase(); // Renamed for clarity (V7)
          if (upperSymbolV7 === 'USDTINR') {
            baseAsset = 'USDT';
          } else if (upperSymbolV7 === 'USDCINR') {
            baseAsset = 'USDC';
          } else if (upperSymbolV7 === 'DAIINR') {
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
            console.warn(`${logPrefix} Row ${rowIndex}: Unrecognized quote currency for symbol '${symbol}' in V7.`);
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
      const summariesByDateV7 = new Map<string, AssetSummaryV7[]>();
      const skippedItemsByDateV7 = new Map<string, AssetSummaryV7[]>(); // New map for skipped items

      assetMap.forEach((transactions, asset) => {
        const STABLECOINS_V7 = [
          'USDT',    // Tether
          'USDC',    // USD Coin
          'DAI',     // Dai
          'FDUSD',   // First Digital USD
          'BUSD',    // Binance USD
          'TUSD',    // TrueUSD
          'USDP',    // Pax Dollar
          'GUSD',    // Gemini Dollar
          'FRAX',    // Frax
          'LUSD',    // Liquity USD
          'sUSD',    // Synthetix USD
          'MIM',     // Magic Internet Money
          'USDJ',    // USDJ
          'USDK'     // USDK
        ];  // All major stablecoins
        if (STABLECOINS_V7.includes(asset)) {
          console.log(`${logPrefix} Asset '${asset}': Processing as STABLECOIN with direct INR trading (V7)`);
          
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

              const summaryForDay: AssetSummaryV7 = { // Changed to V7
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

              const existingSummaries = summariesByDateV7.get(dateKey) || []; // Changed to V7
              summariesByDateV7.set(dateKey, [...existingSummaries, summaryForDay]); // Changed to V7
            });
          }
          console.log(`${logPrefix} Asset '${asset}': Completed STABLECOIN processing (V7)`);
          return; 
        }

        console.log(`${logPrefix} Asset '${asset}': Processing as NORMAL CRYPTO ASSET (V7)`);
        const allInrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY' && t.jsDate);
        const allUsdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL' && t.jsDate);

        if (allInrTrades.length === 0 || allUsdtTrades.length === 0) {
            console.log(`${logPrefix} Asset '${asset}': Skipping daily processing for V7 - insufficient INR buys or USDT sells.`);
            
            // Create skipped trade entry for assets that fail initial filter
            const skippedSummary: AssetSummaryV7 = {
              displayDate: 'N/A',
              asset,
              inrPrice: allInrTrades.length > 0 ? 
                allInrTrades.reduce((sum, t) => sum + (t.total || t.price * t.quantity), 0) / 
                allInrTrades.reduce((sum, t) => sum + t.quantity, 0) : 0,
              usdtPrice: allUsdtTrades.length > 0 ? 
                allUsdtTrades.reduce((sum, t) => sum + t.price * t.quantity, 0) / 
                allUsdtTrades.reduce((sum, t) => sum + t.quantity, 0) : 0,
              coinSoldQty: allUsdtTrades.reduce((sum, t) => sum + t.quantity, 0),
              usdtPurchaseCost: 0,
              usdtQuantity: allUsdtTrades.reduce((sum, t) => sum + t.price * t.quantity, 0),
              usdtPurchaseCostInr: 0,
              tds: allUsdtTrades.reduce((sum, t) => sum + (t.tds || 0), 0),
              totalRelevantInrValue: allInrTrades.reduce((sum, t) => 
                sum + (t.total || t.price * t.quantity), 0),
              totalRelevantInrQuantity: allInrTrades.reduce((sum, t) => sum + t.quantity, 0)
            };

            const existingSkipped = skippedItemsByDateV7.get('N/A') || [];
            skippedItemsByDateV7.set('N/A', [...existingSkipped, skippedSummary]);
            
            return;
        }
        console.log(`${logPrefix} Asset '${asset}': Found ${allInrTrades.length} relevant INR buys and ${allUsdtTrades.length} relevant USDT sells for potential daily V7 summaries.`);

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
        
        console.log(`${logPrefix} Asset '${asset}': Found ${uniqueSellDates.length} unique sell dates for daily V7 summaries.`);

        uniqueSellDates.forEach(sellDay => {
          const startOfDay = sellDay; 
          const endOfDay = new Date(Date.UTC(sellDay.getUTCFullYear(), sellDay.getUTCMonth(), sellDay.getUTCDate() + 1)); 
          const sellDateStr = formatDate(sellDay);
          console.log(`${logPrefix} Asset '${asset}', V7 Daily: Analyzing sell date ${sellDateStr}`);

          const dailyUsdtSells = allUsdtTrades.filter(t =>
            t.jsDate &&
            t.jsDate >= startOfDay &&
            t.jsDate < endOfDay
          );

          const dailyInrBuys = allInrTrades.filter(t =>
            t.jsDate && 
            t.jsDate >= startOfDay && 
            t.jsDate < endOfDay
          );

          // Add detailed logging for skipped trades
          if (dailyUsdtSells.length === 0 || dailyInrBuys.length === 0) {
            // Create summary for skipped trades
            const skippedSummary: AssetSummaryV7 = {
              displayDate: sellDateStr,
              asset,
              inrPrice: allInrTrades.length > 0 ? 
                allInrTrades.reduce((sum, t) => sum + (t.total || t.price * t.quantity), 0) / 
                allInrTrades.reduce((sum, t) => sum + t.quantity, 0) : 0,
              usdtPrice: allUsdtTrades.length > 0 ? 
                allUsdtTrades.reduce((sum, t) => sum + t.price * t.quantity, 0) / 
                allUsdtTrades.reduce((sum, t) => sum + t.quantity, 0) : 0,
              coinSoldQty: allUsdtTrades.reduce((sum, t) => sum + t.quantity, 0),
              usdtPurchaseCost: 0, // Will be calculated if needed
              usdtQuantity: allUsdtTrades.reduce((sum, t) => sum + t.price * t.quantity, 0),
              usdtPurchaseCostInr: 0, // Will be calculated if needed
              tds: allUsdtTrades.reduce((sum, t) => sum + (t.tds || 0), 0),
              totalRelevantInrValue: allInrTrades.reduce((sum, t) => 
                sum + (t.total || t.price * t.quantity), 0),
              totalRelevantInrQuantity: allInrTrades.reduce((sum, t) => sum + t.quantity, 0)
            };

            const existingSkipped = skippedItemsByDateV7.get(sellDateStr) || [];
            skippedItemsByDateV7.set(sellDateStr, [...existingSkipped, skippedSummary]);
            
            console.log(`${logPrefix} Asset '${asset}', V7 Daily: Skipping ${sellDateStr} - no sells on this day OR no buys on this day.`);
            return; 
          }

          // Calculate daily metrics
          const totalDailyUsdtQuantity = dailyUsdtSells.reduce((sum, t) => sum + t.quantity, 0);
          const totalDailyUsdtValue = dailyUsdtSells.reduce((sum, t) => {
            const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
            return sum + cost;
          }, 0);
          const averageDailyUsdtPrice = totalDailyUsdtQuantity > 0 ? totalDailyUsdtValue / totalDailyUsdtQuantity : 0;
          const totalDailyTds = dailyUsdtSells.reduce((sum, t) => sum + (t.tds || 0), 0);

          const dailyTotalInrValue = dailyInrBuys.reduce((sum, t) => {
            const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
            return sum + cost;
          }, 0);
          const dailyTotalInrQuantity = dailyInrBuys.reduce((sum, t) => sum + t.quantity, 0);
          const averageDailyInrPrice = dailyTotalInrQuantity > 0 ? dailyTotalInrValue / dailyTotalInrQuantity : 0;

          // Create summary for this day
          const summaryForDay: AssetSummaryV7 = {
            displayDate: sellDateStr,
            asset,
            inrPrice: averageDailyInrPrice,
            usdtPrice: averageDailyUsdtPrice,
            coinSoldQty: totalDailyUsdtQuantity,
            usdtPurchaseCost: averageDailyUsdtPrice > 0 ? averageDailyInrPrice / averageDailyUsdtPrice : 0,
            usdtQuantity: totalDailyUsdtValue,
            usdtPurchaseCostInr: averageDailyInrPrice * totalDailyUsdtQuantity,
            tds: totalDailyTds,
            totalRelevantInrValue: dailyTotalInrValue,
            totalRelevantInrQuantity: dailyTotalInrQuantity
          };
          
          console.log(`${logPrefix} Asset '${asset}', V7 Daily: Created summary for ${sellDateStr}:`, summaryForDay);
          const existingSummaries = summariesByDateV7.get(sellDateStr) || [];
          summariesByDateV7.set(sellDateStr, [...existingSummaries, summaryForDay]);
        });
        
        if (uniqueSellDates.length === 0 && allUsdtTrades.length > 0 && allInrTrades.length > 0) {
             console.log(`${logPrefix} Asset '${asset}': No unique sell dates found for V7 daily summary, though trades exist.`);
        }
        console.log(`${logPrefix} Asset '${asset}': Completed NORMAL CRYPTO ASSET processing for V7 (daily).`);
      })

      console.log(`${logPrefix} Step 2 Complete: summariesByDateV7 map populated with ${summariesByDateV7.size} dates.`); // Changed to V7
      console.log(`${logPrefix} Skipped items count: ${skippedItemsByDateV7.size} dates.`);
      
      if (summariesByDateV7.size === 0 && transactions.length > 0) {
        throw new Error('No matching INR buys and USDT sells found (V7).');
      }

      return {
        summaries: summariesByDateV7,
        skippedItems: skippedItemsByDateV7
      };

    } catch (err) {
      console.error('Error processing transactions V7:', err);
      throw new Error('Error processing the file (V7). Check console for details.');
    }
};