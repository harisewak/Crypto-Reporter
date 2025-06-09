import { AssetSummaryV6, Transaction } from "../types";
import { excelSerialDateToJSDate, formatDate } from "../utils/dateUtils";

// V6 processing logic (Duplicate of V5)
export const processTransactionsV6 = (transactions: any[][]): Map<string, AssetSummaryV6[]> => {
    const logPrefix = '[V6 LOG]';
    try {
      console.log(`${logPrefix} Starting V6 processing (Duplicate of V5) for`, transactions.length, 'raw rows.');

      const assetMap = new Map<string, Transaction[]>();

      // 1. Initial Parsing and Grouping by Asset (with JS Date conversion) - Same as V5
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
          const upperSymbolV6 = symbol.toUpperCase(); // Renamed for clarity (V6)
          if (upperSymbolV6 === 'USDTINR') {
            baseAsset = 'USDT';
          } else if (upperSymbolV6 === 'USDCINR') {
            baseAsset = 'USDC';
          } else if (upperSymbolV6 === 'DAIINR') {
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
            console.warn(`${logPrefix} Row ${rowIndex}: Unrecognized quote currency for symbol '${symbol}' in V6.`);
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

      // 2. Calculate Daily Summaries (Client Logic - Duplicated from V5)
      console.log(`${logPrefix} Step 2: Calculating Daily Summaries...`);
      const summariesByDateV6 = new Map<string, AssetSummaryV6[]>();

      assetMap.forEach((transactions, asset) => {
        const STABLECOINS_V6 = ['USDT', 'USDC', 'DAI'];  // Renamed for V6 context
        if (STABLECOINS_V6.includes(asset)) {
          console.log(`${logPrefix} Asset '${asset}': Processing as STABLECOIN with direct INR trading (V6)`);
          
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

              const summaryForDay: AssetSummaryV6 = { // Changed to V6
                asset: asset,
                date: dateKey,
                totalBuyAmount: totalStablecoinQuantity,
                totalSellAmount: 0,
                totalBuyValue: totalInrValue,
                totalSellValue: 0,
                profitLoss: 0,
                profitLossPercentage: 0,
                comment: 'V6 DUPLICATE OF V5',
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

              const existingSummaries = summariesByDateV6.get(dateKey) || []; // Changed to V6
              summariesByDateV6.set(dateKey, [...existingSummaries, summaryForDay]); // Changed to V6
            });
          }
          console.log(`${logPrefix} Asset '${asset}': Completed STABLECOIN processing (V6)`);
          return; // Skip normal asset processing for stablecoins
        }

        console.log(`${logPrefix} Asset '${asset}': Processing as NORMAL CRYPTO ASSET (V6)`);
        const allInrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY' && t.jsDate);
        const allUsdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL' && t.jsDate);

        if (allInrTrades.length === 0 || allUsdtTrades.length === 0) {
            console.log(`${logPrefix} Asset '${asset}': Skipping daily processing for V6 - insufficient INR buys or USDT sells.`);
            return;
        }
        console.log(`${logPrefix} Asset '${asset}': Found ${allInrTrades.length} relevant INR buys and ${allUsdtTrades.length} relevant USDT sells for potential daily V6 summaries.`);

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
        
        console.log(`${logPrefix} Asset '${asset}': Found ${uniqueSellDates.length} unique sell dates for daily V6 summaries.`);

        uniqueSellDates.forEach(sellDay => {
          const startOfDay = sellDay; 
          const endOfDay = new Date(Date.UTC(sellDay.getUTCFullYear(), sellDay.getUTCMonth(), sellDay.getUTCDate() + 1)); 
          const sellDateStr = formatDate(sellDay);
          console.log(`${logPrefix} Asset '${asset}', V6 Daily: Analyzing sell date ${sellDateStr}`);

          const dailyUsdtSells = allUsdtTrades.filter(t =>
            t.jsDate &&
            t.jsDate >= startOfDay &&
            t.jsDate < endOfDay
          );

          if (dailyUsdtSells.length === 0) {
            console.log(`${logPrefix} Asset '${asset}', V6 Daily: Skipping ${sellDateStr} - no sells on this day.`);
            return;
          }

          // Include all buys up to the sell date
          const relevantInrBuys = allInrTrades.filter(t =>
            t.jsDate && 
            t.jsDate <= endOfDay
          );

          if (relevantInrBuys.length === 0) {
            console.log(`${logPrefix} Asset '${asset}', V6 Daily: Skipping ${sellDateStr} - no buys up to this day.`);
            return;
          }

          // Sort buys by date (FIFO)
          const sortedBuys = [...relevantInrBuys].sort((a, b) => {
            if (!a.jsDate || !b.jsDate) return 0;
            return a.jsDate.getTime() - b.jsDate.getTime();
          });

          console.log(`${logPrefix} Asset '${asset}', V6 Daily: Processing ${dailyUsdtSells.length} sells against ${sortedBuys.length} buys up to ${sellDateStr}`);

          // Process each sell against available buys
          let remainingBuys = [...sortedBuys];
          let totalMatchedBuyQuantity = 0;
          let totalMatchedBuyValue = 0;
          let totalMatchedSellQuantity = 0;
          let totalMatchedSellValue = 0;
          let totalTds = 0;

          for (const sell of dailyUsdtSells) {
            let remainingSellQuantity = sell.quantity;
            let sellValue = sell.price * sell.quantity;
            totalTds += sell.tds || 0;

            console.log(`${logPrefix} Asset '${asset}', V6 Daily: Processing sell of ${remainingSellQuantity} at price ${sell.price}`);

            while (remainingSellQuantity > 0 && remainingBuys.length > 0) {
              const buy = remainingBuys[0];
              const buyQuantity = buy.quantity;
              const buyValue = (buy.total !== undefined && !isNaN(buy.total) && buy.total > 0) 
                ? buy.total 
                : buy.price * buy.quantity;

              console.log(`${logPrefix} Asset '${asset}', V6 Daily: Matching against buy of ${buyQuantity} at price ${buy.price}`);

              if (buyQuantity >= remainingSellQuantity) {
                // Buy can fully cover the remaining sell quantity
                const matchedQuantity = remainingSellQuantity;
                const matchedBuyValue = (buyValue / buyQuantity) * matchedQuantity;
                const matchedSellValue = (sellValue / sell.quantity) * matchedQuantity;
                
                totalMatchedBuyQuantity += matchedQuantity;
                totalMatchedBuyValue += matchedBuyValue;
                totalMatchedSellQuantity += matchedQuantity;
                totalMatchedSellValue += matchedSellValue;

                console.log(`${logPrefix} Asset '${asset}', V6 Daily: Full match - ${matchedQuantity} units at buy price ${buy.price} and sell price ${sell.price}`);

                // Update remaining buy quantity
                remainingBuys[0] = {
                  ...buy,
                  quantity: buyQuantity - matchedQuantity
                };

                remainingSellQuantity = 0;
              } else {
                // Buy can only partially cover the remaining sell quantity
                const matchedQuantity = buyQuantity;
                const matchedBuyValue = buyValue;
                const matchedSellValue = (sellValue / sell.quantity) * matchedQuantity;
                
                totalMatchedBuyQuantity += matchedQuantity;
                totalMatchedBuyValue += matchedBuyValue;
                totalMatchedSellQuantity += matchedQuantity;
                totalMatchedSellValue += matchedSellValue;

                console.log(`${logPrefix} Asset '${asset}', V6 Daily: Partial match - ${matchedQuantity} units at buy price ${buy.price} and sell price ${sell.price}`);

                remainingSellQuantity -= matchedQuantity;
                remainingBuys.shift(); // Remove the fully used buy
              }
            }

            // If we couldn't match the entire sell, log it
            if (remainingSellQuantity > 0) {
              console.log(`${logPrefix} Asset '${asset}', V6 Daily: Warning - Unmatched sell quantity of ${remainingSellQuantity} on ${sellDateStr}`);
            }
          }

          // Calculate metrics based on matched quantities
          const averageBuyPrice = totalMatchedBuyQuantity > 0 ? totalMatchedBuyValue / totalMatchedBuyQuantity : 0;
          const averageSellPrice = totalMatchedSellQuantity > 0 ? totalMatchedSellValue / totalMatchedSellQuantity : 0;
          const profitLoss = totalMatchedSellValue - totalMatchedBuyValue;
          const profitLossPercentage = totalMatchedBuyValue > 0 ? (profitLoss / totalMatchedBuyValue) * 100 : 0;

          console.log(`${logPrefix} Asset '${asset}', V6 Daily: Summary for ${sellDateStr}:`, {
            totalMatchedBuyQuantity,
            totalMatchedSellQuantity,
            averageBuyPrice,
            averageSellPrice,
            profitLoss,
            profitLossPercentage
          });

          // Create summary for this day
          const summaryForDay: AssetSummaryV6 = {
            asset,
            date: sellDateStr,
            totalBuyAmount: totalMatchedBuyQuantity,
            totalSellAmount: totalMatchedSellQuantity,
            totalBuyValue: totalMatchedBuyValue,
            totalSellValue: totalMatchedSellValue,
            profitLoss,
            profitLossPercentage,
            comment: 'V6 FIFO MATCHING',
            inrPrice: averageBuyPrice,
            usdtPrice: averageSellPrice,
            coinSoldQty: totalMatchedSellQuantity,
            usdtPurchaseCost: averageSellPrice > 0 ? averageBuyPrice / averageSellPrice : 0,
            usdtQuantity: totalMatchedSellValue,
            usdtPurchaseCostInr: averageBuyPrice * totalMatchedSellQuantity,
            tds: totalTds,
            totalRelevantInrValue: totalMatchedBuyValue,
            totalRelevantInrQuantity: totalMatchedBuyQuantity
          };
          
          const existingSummaries = summariesByDateV6.get(sellDateStr) || [];
          summariesByDateV6.set(sellDateStr, [...existingSummaries, summaryForDay]);
        });
        
        if (uniqueSellDates.length === 0 && allUsdtTrades.length > 0 && allInrTrades.length > 0) {
             console.log(`${logPrefix} Asset '${asset}': No unique sell dates found for V6 daily summary, though trades exist.`);
        }
        console.log(`${logPrefix} Asset '${asset}': Completed NORMAL CRYPTO ASSET processing for V6 (daily).`);
      })

      console.log(`${logPrefix} Step 2 Complete: summariesByDateV6 map populated with ${summariesByDateV6.size} dates.`);
      
      if (summariesByDateV6.size === 0 && transactions.length > 0) {
        throw new Error('No matching INR buys and USDT sells found (V6).');
      }

      return summariesByDateV6;

    } catch (err) {
      console.error('Error processing transactions V6:', err);
      throw new Error('Error processing the file (V6). Check console for details.');
    }
};