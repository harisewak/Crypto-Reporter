import { AssetSummaryV8, Transaction, SellMatch } from "../types";
import { excelSerialDateToJSDate, formatDate } from "../utils/dateUtils";

export const processTransactionsV10 = async (transactions: any[][]): Promise<{
  summaries: Map<string, AssetSummaryV8[]>;
  skippedItems: Map<string, AssetSummaryV8[]>;
}> => {
  const logPrefix = '[V10 CHRONOLOGICAL FIFO LOG]';
  const isLargeDataset = transactions.length > 1000;
  const shouldLog = !isLargeDataset; // Disable logging for large datasets
  
  try {
    if (shouldLog) console.log(`${logPrefix} Starting V10 Chronological FIFO processing for`, transactions.length, 'raw rows.');

    const assetMap = new Map<string, Transaction[]>();

    // 1. Parse and group transactions by asset
    if (shouldLog) console.log(`${logPrefix} Step 1: Parsing transactions...`);
    
    // Pre-allocate maps for better performance
    const dateFormatCache = new Map<string, string>();
    
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
        let totalStr = String(row[6] || '');
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
        if (shouldLog) console.error(`${logPrefix} Row ${rowIndex}: Error processing row:`, err, row);
      }
    });

    if (shouldLog) console.log(`${logPrefix} Step 1 Complete: assetMap created with ${assetMap.size} assets.`);

    // 2. Process transactions with chronological FIFO
    if (shouldLog) console.log(`${logPrefix} Step 2: Processing with chronological FIFO...`);
    const summariesByDate = new Map<string, AssetSummaryV8[]>();
    const skippedItemsByDate = new Map<string, AssetSummaryV8[]>();

    const assets = Array.from(assetMap.entries());
    let processedCount = 0;
    
    for (const [asset, transactions] of assets) {
      if (shouldLog) console.log(`${logPrefix} Processing asset: ${asset} (${++processedCount}/${assets.length})`);
      
      // Separate and sort transactions by date
      const allTransactions = transactions
        .filter(t => t.jsDate)
        .sort((a, b) => a.jsDate!.getTime() - b.jsDate!.getTime());

      // Handle stablecoins with special logic (same as v8)
      const STABLECOINS_V10 = [
        'USDT', 'USDC', 'DAI', 'FDUSD', 'BUSD', 'TUSD', 'USDP', 'GUSD', 
        'FRAX', 'LUSD', 'sUSD', 'MIM', 'USDJ', 'USDK'
      ];

      if (STABLECOINS_V10.includes(asset)) {
        if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Processing as STABLECOIN (V10)`);
        
        const stablecoinInrBuyTrades = allTransactions.filter(t => 
          t.symbol.toUpperCase() === `${asset}INR` && t.side === 'BUY'
        );

        if (stablecoinInrBuyTrades.length > 0) {
          // Process each buy as an individual match (no aggregation for proper audit trail)
          stablecoinInrBuyTrades.forEach(buyTx => {
            if (buyTx.jsDate) {
              const dateKey = formatDate(buyTx.jsDate);
              const inrCost = (buyTx.total !== undefined && !isNaN(buyTx.total) && buyTx.total > 0) 
                ? buyTx.total : buyTx.price * buyTx.quantity;
              
              // Create individual FIFO match for each stablecoin buy
              const fifoMatch: SellMatch = {
                sellTransaction: buyTx,
                matchedQuantity: buyTx.quantity,
                sellPrice: buyTx.price, // Use INR price for stablecoins
                sellDate: buyTx.jsDate,
                profitLoss: 0, // No P&L for stablecoins
                costBasis: buyTx.price,
                buyDate: buyTx.jsDate // Buy date same as sell date for stablecoins
              };

              // Create individual summary for this specific buy transaction
              const summaryForBuy: AssetSummaryV8 = {
                displayDate: dateKey,
                asset: asset,
                inrPrice: buyTx.price,
                usdtPrice: buyTx.price, // Use INR price as USDT price for stablecoins
                coinSoldQty: buyTx.quantity,
                usdtPurchaseCost: 1, // Ratio of 1 for same currency (INR to INR)
                usdtQuantity: buyTx.quantity,
                usdtPurchaseCostInr: inrCost,
                tds: buyTx.tds || 0,
                totalRelevantInrValue: inrCost,
                totalRelevantInrQuantity: buyTx.quantity,
                fifoMatches: [fifoMatch]
              };

              const existingSummaries = summariesByDate.get(dateKey) || [];
              summariesByDate.set(dateKey, [...existingSummaries, summaryForBuy]);
            }
          });
        }
        if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Completed STABLECOIN processing (V10)`);
        continue; // Skip normal FIFO processing for stablecoins
      }

      // Normal FIFO processing for non-stablecoin assets
      if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Processing as NORMAL CRYPTO ASSET with chronological FIFO (V10)`);
      
      const inrBuys = allTransactions.filter(t => t.quote === 'INR' && t.side === 'BUY');
      const usdtSells = allTransactions.filter(t => t.quote === 'USDT' && t.side === 'SELL');

      if (inrBuys.length === 0 || usdtSells.length === 0) {
        if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Skipping - no INR buys or USDT sells`);
        continue;
      }

      if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Starting chronological FIFO with ${inrBuys.length} buys and ${usdtSells.length} sells`);

      // Maintain buy inventory with remaining quantities
      const buyInventory = inrBuys.map(buyTx => ({
        transaction: buyTx,
        remainingQuantity: buyTx.quantity,
        consumed: false
      }));

      // Process each USDT sell chronologically
      usdtSells.forEach(sellTx => {
        let sellDateStr = dateFormatCache.get(sellTx.date);
        if (!sellDateStr) {
          sellDateStr = formatDate(sellTx.jsDate!);
          dateFormatCache.set(sellTx.date, sellDateStr);
        }
        
        if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Processing sell on ${sellDateStr}, quantity: ${sellTx.quantity}`);
        
        // CHRONOLOGICAL FIFO: Only consider buys that occurred before or on sell date
        const availableBuys = buyInventory.filter(buyRecord => 
          !buyRecord.consumed && 
          buyRecord.remainingQuantity > 0 && 
          buyRecord.transaction.jsDate!.getTime() <= sellTx.jsDate!.getTime()
        );

        if (availableBuys.length === 0) {
          if (shouldLog) console.warn(`${logPrefix} Asset '${asset}': No available buys for sell on ${sellDateStr} (chronological FIFO)`);
          return;
        }

        // Sort available buys by date (oldest first) for FIFO
        availableBuys.sort((a, b) => a.transaction.jsDate!.getTime() - b.transaction.jsDate!.getTime());

        let remainingToSell = sellTx.quantity;
        const sellMatches: SellMatch[] = [];

        for (const buyRecord of availableBuys) {
          if (remainingToSell <= 0) break;

          const matchQuantity = Math.min(remainingToSell, buyRecord.remainingQuantity);
          const costBasis = buyRecord.transaction.price;
          const profitLoss = (sellTx.price - costBasis) * matchQuantity;

          // Create individual FIFO match
          const match: SellMatch = {
            sellTransaction: sellTx,
            matchedQuantity: matchQuantity,
            sellPrice: sellTx.price,
            sellDate: sellTx.jsDate!,
            profitLoss: profitLoss,
            costBasis: costBasis,
            buyDate: buyRecord.transaction.jsDate!
          };

          sellMatches.push(match);

          // Update buy record
          buyRecord.remainingQuantity -= matchQuantity;
          if (buyRecord.remainingQuantity <= 0) {
            buyRecord.consumed = true;
          }
          
          remainingToSell -= matchQuantity;

          if (shouldLog) {
            console.log(`${logPrefix} Asset '${asset}': Matched ${matchQuantity} units (buy: ${formatDate(buyRecord.transaction.jsDate!)}, sell: ${sellDateStr}), cost basis: ${costBasis}, P&L: ${profitLoss.toFixed(2)}`);
          }
        }

        if (remainingToSell > 0) {
          if (shouldLog) console.warn(`${logPrefix} Asset '${asset}': Unmatched sell quantity: ${remainingToSell} on ${sellDateStr} (insufficient chronological buys)`);
        }

        // Create individual summary for each FIFO match (no aggregation)
        sellMatches.forEach(match => {
          const individualSummary: AssetSummaryV8 = {
            displayDate: sellDateStr,
            asset: asset,
            inrPrice: match.costBasis,
            usdtPrice: match.sellPrice,
            coinSoldQty: match.matchedQuantity,
            usdtPurchaseCost: match.sellPrice > 0 ? match.costBasis / match.sellPrice : 0,
            usdtQuantity: match.sellPrice * match.matchedQuantity,
            usdtPurchaseCostInr: match.costBasis * match.matchedQuantity,
            tds: sellTx.tds || 0, // TDS from sell transaction
            totalRelevantInrValue: match.costBasis * match.matchedQuantity,
            totalRelevantInrQuantity: match.matchedQuantity,
            fifoMatches: [match] // Single match per summary
          };

          const existingSummaries = summariesByDate.get(sellDateStr) || [];
          summariesByDate.set(sellDateStr, [...existingSummaries, individualSummary]);
        });
      });

      // Yield control every 10 assets
      if (processedCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    if (shouldLog) console.log(`${logPrefix} Step 2 Complete: Chronological FIFO processing finished`);
    
    return {
      summaries: summariesByDate,
      skippedItems: skippedItemsByDate
    };

  } catch (err) {
    console.error(`${logPrefix} Error:`, err);
    throw new Error('Error processing the file (V10 Chronological FIFO). Check console for details.');
  }
};