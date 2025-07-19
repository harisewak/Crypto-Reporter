import { AssetSummaryV8, Transaction, FIFOBuyRecord, SellMatch, FIFOQueue } from "../types";
import { excelSerialDateToJSDate, formatDate } from "../utils/dateUtils";

export const processTransactionsV8 = (transactions: any[][]): {
  summaries: Map<string, AssetSummaryV8[]>;
  skippedItems: Map<string, AssetSummaryV8[]>;
} => {
  const logPrefix = '[V8 FIFO LOG]';
  
  try {
    console.log(`${logPrefix} Starting V8 FIFO processing for`, transactions.length, 'raw rows.');

    const assetMap = new Map<string, Transaction[]>();
    const fifoQueues: FIFOQueue = {};

    // 1. Parse and group transactions by asset
    console.log(`${logPrefix} Step 1: Parsing transactions...`);
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
        console.error(`${logPrefix} Row ${rowIndex}: Error processing row:`, err, row);
      }
    });

    console.log(`${logPrefix} Step 1 Complete: assetMap created with ${assetMap.size} assets.`);

    // 2. Build FIFO queues and process transactions
    console.log(`${logPrefix} Step 2: Building FIFO queues and processing...`);
    const summariesByDate = new Map<string, AssetSummaryV8[]>();
    const skippedItemsByDate = new Map<string, AssetSummaryV8[]>();

    assetMap.forEach((transactions, asset) => {
      console.log(`${logPrefix} Processing asset: ${asset}`);
      
      // Initialize FIFO queue for this asset
      fifoQueues[asset] = [];
      
      // Separate and sort transactions by date
      const allTransactions = transactions
        .filter(t => t.jsDate)
        .sort((a, b) => a.jsDate!.getTime() - b.jsDate!.getTime());

      const inrBuys = allTransactions.filter(t => t.quote === 'INR' && t.side === 'BUY');
      const usdtSells = allTransactions.filter(t => t.quote === 'USDT' && t.side === 'SELL');

      if (inrBuys.length === 0 || usdtSells.length === 0) {
        console.log(`${logPrefix} Asset '${asset}': Skipping - no INR buys or USDT sells`);
        return;
      }

      // Add all INR buys to FIFO queue
      inrBuys.forEach((buyTx, index) => {
        const buyRecord: FIFOBuyRecord = {
          transactionId: `${asset}-${buyTx.date}-${index}`,
          price: buyTx.price,
          originalQuantity: buyTx.quantity,
          remainingQuantity: buyTx.quantity,
          purchaseDate: buyTx.jsDate!,
          tds: buyTx.tds || 0,
          total: buyTx.total
        };
        fifoQueues[asset].push(buyRecord);
      });

      console.log(`${logPrefix} Asset '${asset}': Added ${inrBuys.length} buys to FIFO queue`);

      // Process each USDT sell using FIFO matching
      usdtSells.forEach(sellTx => {
        const sellDateStr = formatDate(sellTx.jsDate!);
        console.log(`${logPrefix} Asset '${asset}': Processing sell on ${sellDateStr}, quantity: ${sellTx.quantity}`);
        
        const sellMatches = processSellTransaction(asset, sellTx, fifoQueues);
        
        if (sellMatches.length > 0) {
          // Add to daily summary
          addToDailySummary(summariesByDate, sellDateStr, asset, sellMatches, sellTx);
        } else {
          console.log(`${logPrefix} Asset '${asset}': No matches for sell on ${sellDateStr}`);
        }
      });
    });

    console.log(`${logPrefix} Step 2 Complete: Processing finished`);
    
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
function processSellTransaction(asset: string, sellTx: Transaction, fifoQueues: FIFOQueue): SellMatch[] {
  const logPrefix = '[V8 FIFO SELL]';
  const matches: SellMatch[] = [];
  let remainingToSell = sellTx.quantity;
  
  console.log(`${logPrefix} Asset '${asset}': Processing sell quantity ${remainingToSell}`);
  
  while (remainingToSell > 0 && fifoQueues[asset].length > 0) {
    const oldestBuy = fifoQueues[asset][0];
    const matchQuantity = Math.min(remainingToSell, oldestBuy.remainingQuantity);
    
    // Calculate P&L for this match
    const costBasis = oldestBuy.price;
    const profitLoss = (sellTx.price - costBasis) * matchQuantity;
    
    const sellMatch: SellMatch = {
      sellTransaction: sellTx,
      matchedQuantity: matchQuantity,
      sellPrice: sellTx.price,
      sellDate: sellTx.jsDate!,
      profitLoss: profitLoss,
      costBasis: costBasis
    };
    
    matches.push(sellMatch);
    
    // Update buy record
    oldestBuy.remainingQuantity -= matchQuantity;
    remainingToSell -= matchQuantity;
    
    console.log(`${logPrefix} Asset '${asset}': Matched ${matchQuantity} units at cost basis ${costBasis}, P&L: ${profitLoss.toFixed(2)}`);
    
    // Remove fully consumed buy record
    if (oldestBuy.remainingQuantity <= 0) {
      fifoQueues[asset].shift();
      console.log(`${logPrefix} Asset '${asset}': Fully consumed buy record, removed from queue`);
    }
  }
  
  if (remainingToSell > 0) {
    console.warn(`${logPrefix} Asset '${asset}': Unmatched sell quantity: ${remainingToSell}`);
  }
  
  return matches;
}

function addToDailySummary(
  summariesByDate: Map<string, AssetSummaryV8[]>,
  sellDateStr: string,
  asset: string,
  sellMatches: SellMatch[],
  sellTx: Transaction
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
  summariesByDate.set(sellDateStr, [...existingSummaries, summary]);
  
  console.log(`${logPrefix} Added summary for ${asset} on ${sellDateStr}:`, {
    weightedCostBasis,
    totalMatchedQuantity,
    totalProfitLoss: sellMatches.reduce((sum, match) => sum + match.profitLoss, 0)
  });
}