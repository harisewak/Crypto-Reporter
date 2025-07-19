import { AssetSummaryV8, Transaction, SellMatch, FIFOQueue } from "../types";
import { excelSerialDateToJSDate, formatDate } from "../utils/dateUtils";

export const processTransactionsV8 = async (transactions: any[][]): Promise<{
  summaries: Map<string, AssetSummaryV8[]>;
  skippedItems: Map<string, AssetSummaryV8[]>;
}> => {
  const logPrefix = '[V8 FIFO LOG]';
  const isLargeDataset = transactions.length > 1000;
  const shouldLog = !isLargeDataset; // Disable logging for large datasets
  
  try {
    if (shouldLog) console.log(`${logPrefix} Starting V8 FIFO processing for`, transactions.length, 'raw rows.');

    const assetMap = new Map<string, Transaction[]>();
    const fifoQueues: FIFOQueue = {};

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

    // 2. Build FIFO queues and process transactions
    if (shouldLog) console.log(`${logPrefix} Step 2: Building FIFO queues and processing...`);
    const summariesByDate = new Map<string, AssetSummaryV8[]>();
    const skippedItemsByDate = new Map<string, AssetSummaryV8[]>();

    const assets = Array.from(assetMap.entries());
    let processedCount = 0;
    
    for (const [asset, transactions] of assets) {
      if (shouldLog) console.log(`${logPrefix} Processing asset: ${asset} (${++processedCount}/${assets.length})`);
      
      // Initialize FIFO queue for this asset
      fifoQueues[asset] = { records: [], startIndex: 0 };
      
      // Separate and sort transactions by date
      const allTransactions = transactions
        .filter(t => t.jsDate)
        .sort((a, b) => a.jsDate!.getTime() - b.jsDate!.getTime());

      const inrBuys = allTransactions.filter(t => t.quote === 'INR' && t.side === 'BUY');
      const usdtSells = allTransactions.filter(t => t.quote === 'USDT' && t.side === 'SELL');

      if (inrBuys.length === 0 || usdtSells.length === 0) {
        if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Skipping - no INR buys or USDT sells`);
        continue;
      }

      // Add all INR buys to FIFO queue - optimized for performance
      const queueRecords = fifoQueues[asset].records;
      for (let i = 0; i < inrBuys.length; i++) {
        const buyTx = inrBuys[i];
        queueRecords.push({
          transactionId: `${asset}-${buyTx.date}-${i}`,
          price: buyTx.price,
          originalQuantity: buyTx.quantity,
          remainingQuantity: buyTx.quantity,
          purchaseDate: buyTx.jsDate!,
          tds: buyTx.tds || 0,
          total: buyTx.total
        });
      }

      if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Added ${inrBuys.length} buys to FIFO queue`);

      // Process each USDT sell using FIFO matching
      usdtSells.forEach(sellTx => {
        let sellDateStr = dateFormatCache.get(sellTx.date);
        if (!sellDateStr) {
          sellDateStr = formatDate(sellTx.jsDate!);
          dateFormatCache.set(sellTx.date, sellDateStr);
        }
        
        if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Processing sell on ${sellDateStr}, quantity: ${sellTx.quantity}`);
        
        const sellMatches = processSellTransaction(asset, sellTx, fifoQueues, shouldLog);
        
        if (sellMatches.length > 0) {
          // Add to daily summary
          addToDailySummary(summariesByDate, sellDateStr, asset, sellMatches, sellTx, shouldLog);
        } else if (shouldLog) {
          console.log(`${logPrefix} Asset '${asset}': No matches for sell on ${sellDateStr}`);
        }
      });

      // Yield control every 10 assets
      if (processedCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    if (shouldLog) console.log(`${logPrefix} Step 2 Complete: Processing finished`);
    
    return {
      summaries: summariesByDate,
      skippedItems: skippedItemsByDate
    };

  } catch (err) {
    console.error(`${logPrefix} Error:`, err);
    throw new Error('Error processing the file (V8 FIFO). Check console for details.');
  }
};

// FIFO queue management functions
function processSellTransaction(asset: string, sellTx: Transaction, fifoQueues: FIFOQueue, shouldLog = true): SellMatch[] {
  const logPrefix = '[V8 FIFO SELL]';
  const matches: SellMatch[] = [];
  let remainingToSell = sellTx.quantity;
  
  if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Processing sell quantity ${remainingToSell}`);
  
  const queue = fifoQueues[asset];
  while (remainingToSell > 0 && queue.startIndex < queue.records.length) {
    const oldestBuy = queue.records[queue.startIndex];
    const matchQuantity = Math.min(remainingToSell, oldestBuy.remainingQuantity);
    
    // Calculate P&L for this match
    const costBasis = oldestBuy.price;
    const profitLoss = (sellTx.price - costBasis) * matchQuantity;
    
    matches.push({
      sellTransaction: sellTx,
      matchedQuantity: matchQuantity,
      sellPrice: sellTx.price,
      sellDate: sellTx.jsDate!,
      profitLoss: profitLoss,
      costBasis: costBasis
    });
    
    // Update buy record
    oldestBuy.remainingQuantity -= matchQuantity;
    remainingToSell -= matchQuantity;
    
    if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Matched ${matchQuantity} units at cost basis ${costBasis}, P&L: ${profitLoss.toFixed(2)}`);
    
    // Move pointer instead of shifting array
    if (oldestBuy.remainingQuantity <= 0) {
      queue.startIndex++;
      if (shouldLog) console.log(`${logPrefix} Asset '${asset}': Fully consumed buy record, moved queue pointer`);
    }
  }
  
  if (remainingToSell > 0 && shouldLog) {
    console.warn(`${logPrefix} Asset '${asset}': Unmatched sell quantity: ${remainingToSell}`);
  }
  
  return matches;
}

function addToDailySummary(
  summariesByDate: Map<string, AssetSummaryV8[]>,
  sellDateStr: string,
  asset: string,
  sellMatches: SellMatch[],
  sellTx: Transaction,
  shouldLog = true
) {
  const logPrefix = '[V8 DAILY SUMMARY]';
  
  // Calculate weighted average cost basis from FIFO matches
  const totalMatchedQuantity = sellMatches.reduce((sum, match) => sum + match.matchedQuantity, 0);
  const weightedCostBasis = sellMatches.reduce((sum, match) => 
    sum + (match.costBasis * match.matchedQuantity), 0) / totalMatchedQuantity;
  
  const totalValue = sellMatches.reduce((sum, match) => 
    sum + (match.costBasis * match.matchedQuantity), 0);
  
  const summary: AssetSummaryV8 = {
    displayDate: sellDateStr,
    asset: asset,
    inrPrice: weightedCostBasis, // FIFO weighted average cost basis
    usdtPrice: sellTx.price, // Sell price in USDT
    coinSoldQty: totalMatchedQuantity,
    usdtPurchaseCost: sellTx.price > 0 ? weightedCostBasis / sellTx.price : 0,
    usdtQuantity: sellTx.price * totalMatchedQuantity,
    usdtPurchaseCostInr: weightedCostBasis * totalMatchedQuantity,
    tds: sellTx.tds || 0,
    totalRelevantInrValue: totalValue,
    totalRelevantInrQuantity: totalMatchedQuantity,
    fifoMatches: sellMatches
  };
  
  const existingSummaries = summariesByDate.get(sellDateStr) || [];
  existingSummaries.push(summary);
  summariesByDate.set(sellDateStr, existingSummaries);
  
  if (shouldLog) {
    console.log(`${logPrefix} Added summary for ${asset} on ${sellDateStr}:`, {
      weightedCostBasis,
      totalMatchedQuantity,
      totalProfitLoss: sellMatches.reduce((sum, match) => sum + match.profitLoss, 0)
    });
  }
}