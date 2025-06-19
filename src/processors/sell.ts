import { AssetSummaryV7, Transaction } from "../types";
import { excelSerialDateToJSDate, formatDate } from "../utils/dateUtils";

export const processSellTransactions = (transactions: any[][]): {
  summaries: Map<string, AssetSummaryV7[]>;
  skippedItems: Map<string, AssetSummaryV7[]>;
} => {
    const logPrefix = '[SELL V7 LOG]';
    try {
      console.log(`${logPrefix} Starting SELL V7 processing for`, transactions.length, 'raw rows.');

      const assetMap = new Map<string, Transaction[]>();

      // 1. Initial Parsing and Grouping by Asset (with JS Date conversion)
      console.log(`${logPrefix} Step 1: Parsing and Grouping rows into assetMap...`);
      transactions.forEach((row, index) => {
        const rowIndex = index + 1;
        try {
          if (!row || !Array.isArray(row) || row.length < 6) {
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
            return;
          }

          let jsDate: Date | null = null;
          const dateNum = parseFloat(dateStr);
          if (!isNaN(dateNum)) {
            jsDate = excelSerialDateToJSDate(dateNum);
          }

          let baseAsset: string;
          const upperSymbol = symbol.toUpperCase();
          if (upperSymbol === 'USDTINR') {
            baseAsset = 'USDT';
          } else if (upperSymbol === 'USDCINR') {
            baseAsset = 'USDC';
          } else if (upperSymbol === 'DAIINR') {
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
            console.warn(`${logPrefix} Row ${rowIndex}: Unrecognized quote currency for symbol '${symbol}' in SELL V7.`);
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

      // 2. Calculate Daily Summaries (Reverse Logic - Buy in Stablecoin, Sell in INR)
      console.log(`${logPrefix} Step 2: Calculating Daily Summaries...`);
      const summariesByDate = new Map<string, AssetSummaryV7[]>();
      const skippedItemsByDate = new Map<string, AssetSummaryV7[]>();

      assetMap.forEach((transactions, asset) => {
        const STABLECOINS = [
          'USDT', 'USDC', 'DAI', 'FDUSD', 'BUSD', 'TUSD', 'USDP', 'GUSD', 
          'FRAX', 'LUSD', 'sUSD', 'MIM', 'USDJ', 'USDK'
        ];

        if (STABLECOINS.includes(asset)) {
          console.log(`${logPrefix} Asset '${asset}': Processing as STABLECOIN with direct INR trading (SELL V7)`);
          
          const stablecoinInrSellTrades = transactions.filter(t => 
            t.symbol.toUpperCase() === `${asset}INR` &&
            t.side === 'SELL' &&
            t.jsDate
          );

          if (stablecoinInrSellTrades.length > 0) {
            const sellsByDate = new Map<string, Transaction[]>();
            stablecoinInrSellTrades.forEach(trade => {
              if (trade.jsDate) {
                const dateKey = formatDate(trade.jsDate);
                const existing = sellsByDate.get(dateKey) || [];
                sellsByDate.set(dateKey, [...existing, trade]);
              }
            });

            sellsByDate.forEach((dailySells, dateKey) => {
              const totalInrValue = dailySells.reduce((sum, t) => {
                const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
                return sum + cost;
              }, 0);
              const totalStablecoinQuantity = dailySells.reduce((sum, t) => sum + t.quantity, 0);
              const averageInrPrice = totalStablecoinQuantity > 0 ? totalInrValue / totalStablecoinQuantity : 0;
              const totalTds = dailySells.reduce((sum, t) => sum + (t.tds || 0), 0);

              const summaryForDay: AssetSummaryV7 = {
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

              const existingSummaries = summariesByDate.get(dateKey) || [];
              summariesByDate.set(dateKey, [...existingSummaries, summaryForDay]);
            });
          }
          console.log(`${logPrefix} Asset '${asset}': Completed STABLECOIN processing (SELL V7)`);
          return; 
        }

        console.log(`${logPrefix} Asset '${asset}': Processing as NORMAL CRYPTO ASSET (SELL V7)`);
        const allStablecoinBuys = transactions.filter(t => 
          (t.quote === 'USDT' || t.quote === 'USDC' || t.quote === 'DAI') && 
          t.side === 'BUY' && 
          t.jsDate
        );
        const allInrSells = transactions.filter(t => t.quote === 'INR' && t.side === 'SELL' && t.jsDate);

        if (allStablecoinBuys.length === 0 || allInrSells.length === 0) {
            console.log(`${logPrefix} Asset '${asset}': Skipping daily processing for SELL V7 - insufficient stablecoin buys or INR sells.`);
            return;
        }
        console.log(`${logPrefix} Asset '${asset}': Found ${allStablecoinBuys.length} relevant stablecoin buys and ${allInrSells.length} relevant INR sells for potential daily SELL V7 summaries.`);

        const uniqueSellDateStrings = [
          ...new Set(
            allInrSells
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
        
        console.log(`${logPrefix} Asset '${asset}': Found ${uniqueSellDates.length} unique sell dates for daily SELL V7 summaries.`);

        uniqueSellDates.forEach(sellDay => {
          const startOfDay = sellDay; 
          const endOfDay = new Date(Date.UTC(sellDay.getUTCFullYear(), sellDay.getUTCMonth(), sellDay.getUTCDate() + 1)); 
          const sellDateStr = formatDate(sellDay);
          console.log(`${logPrefix} Asset '${asset}', SELL V7 Daily: Analyzing sell date ${sellDateStr}`);

          const dailyInrSells = allInrSells.filter(t =>
            t.jsDate &&
            t.jsDate >= startOfDay &&
            t.jsDate < endOfDay
          );

          const dailyStablecoinBuys = allStablecoinBuys.filter(t =>
            t.jsDate && 
            t.jsDate >= startOfDay && 
            t.jsDate < endOfDay
          );

          // Add detailed logging for skipped trades
          if (dailyInrSells.length === 0 || dailyStablecoinBuys.length === 0) {
            // Create summary for skipped trades
            const skippedSummary: AssetSummaryV7 = {
              displayDate: sellDateStr,
              asset,
              inrPrice: allInrSells.length > 0 ? 
                allInrSells.reduce((sum, t) => sum + (t.total || t.price * t.quantity), 0) / 
                allInrSells.reduce((sum, t) => sum + t.quantity, 0) : 0,
              usdtPrice: allStablecoinBuys.length > 0 ? 
                allStablecoinBuys.reduce((sum, t) => sum + t.price * t.quantity, 0) / 
                allStablecoinBuys.reduce((sum, t) => sum + t.quantity, 0) : 0,
              coinSoldQty: allInrSells.reduce((sum, t) => sum + t.quantity, 0),
              usdtPurchaseCost: 0,
              usdtQuantity: allStablecoinBuys.reduce((sum, t) => sum + t.price * t.quantity, 0),
              usdtPurchaseCostInr: 0,
              tds: allInrSells.reduce((sum, t) => sum + (t.tds || 0), 0),
              totalRelevantInrValue: allInrSells.reduce((sum, t) => 
                sum + (t.total || t.price * t.quantity), 0),
              totalRelevantInrQuantity: allInrSells.reduce((sum, t) => sum + t.quantity, 0)
            };

            const existingSkipped = skippedItemsByDate.get(sellDateStr) || [];
            skippedItemsByDate.set(sellDateStr, [...existingSkipped, skippedSummary]);
            
            console.log(`${logPrefix} Asset '${asset}', SELL V7 Daily: Skipping ${sellDateStr} - no sells on this day OR no buys on this day.`);
            return; 
          }

          // Calculate daily metrics
          const totalDailyInrQuantity = dailyInrSells.reduce((sum, t) => sum + t.quantity, 0);
          const totalDailyInrValue = dailyInrSells.reduce((sum, t) => {
            const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
            return sum + cost;
          }, 0);
          const averageDailyInrPrice = totalDailyInrQuantity > 0 ? totalDailyInrValue / totalDailyInrQuantity : 0;
          const totalDailyTds = dailyInrSells.reduce((sum, t) => sum + (t.tds || 0), 0);

          const dailyTotalStablecoinValue = dailyStablecoinBuys.reduce((sum, t) => {
            const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
            return sum + cost;
          }, 0);
          const dailyTotalStablecoinQuantity = dailyStablecoinBuys.reduce((sum, t) => sum + t.quantity, 0);
          const averageDailyStablecoinPrice = dailyTotalStablecoinQuantity > 0 ? dailyTotalStablecoinValue / dailyTotalStablecoinQuantity : 0;

          // Create summary for this day
          const summaryForDay: AssetSummaryV7 = {
            displayDate: sellDateStr,
            asset,
            inrPrice: averageDailyInrPrice,
            usdtPrice: averageDailyStablecoinPrice,
            coinSoldQty: totalDailyInrQuantity,
            usdtPurchaseCost: averageDailyInrPrice > 0 ? averageDailyStablecoinPrice / averageDailyInrPrice : 0,
            usdtQuantity: totalDailyInrValue,
            usdtPurchaseCostInr: averageDailyStablecoinPrice * totalDailyInrQuantity,
            tds: totalDailyTds,
            totalRelevantInrValue: dailyTotalStablecoinValue,
            totalRelevantInrQuantity: dailyTotalStablecoinQuantity
          };
          
          console.log(`${logPrefix} Asset '${asset}', SELL V7 Daily: Created summary for ${sellDateStr}:`, summaryForDay);
          const existingSummaries = summariesByDate.get(sellDateStr) || [];
          summariesByDate.set(sellDateStr, [...existingSummaries, summaryForDay]);
        });
        
        if (uniqueSellDates.length === 0 && allInrSells.length > 0 && allStablecoinBuys.length > 0) {
             console.log(`${logPrefix} Asset '${asset}': No unique sell dates found for SELL V7 daily summary, though trades exist.`);
        }
        console.log(`${logPrefix} Asset '${asset}': Completed NORMAL CRYPTO ASSET processing for SELL V7 (daily).`);
      })

      console.log(`${logPrefix} Step 2 Complete: summariesByDate map populated with ${summariesByDate.size} dates.`);
      console.log(`${logPrefix} Skipped items count: ${skippedItemsByDate.size} dates.`);
      
      if (summariesByDate.size === 0 && transactions.length > 0) {
        throw new Error('No matching stablecoin buys and INR sells found (SELL V7).');
      }

      return {
        summaries: summariesByDate,
        skippedItems: skippedItemsByDate
      };

    } catch (err) {
      console.error('Error processing sell transactions V7:', err);
      throw new Error('Error processing the sell file (V7). Check console for details.');
    }
}; 