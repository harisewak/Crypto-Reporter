import { AssetSummaryV8, Transaction, SellMatch } from "../types";
import { excelSerialDateToJSDate, formatDate } from "../utils/dateUtils";

interface AssetBalance {
  totalQuantity: number;
  weightedCostBasis: number;
  totalCost: number;
}

// IndexedDB utilities for persistent storage
class TransactionDB {
  private db: IDBDatabase | null = null;
  private dbName = 'CryptoTransactionsV9';
  private version = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('buys')) {
          const buyStore = db.createObjectStore('buys', { keyPath: 'id', autoIncrement: true });
          buyStore.createIndex('asset_timestamp', ['asset', 'timestamp']);
          buyStore.createIndex('asset', 'asset');
        }
        
        if (!db.objectStoreNames.contains('sells')) {
          const sellStore = db.createObjectStore('sells', { keyPath: 'id', autoIncrement: true });
          sellStore.createIndex('asset_timestamp', ['asset', 'timestamp']);
        }
      };
    });
  }

  async clearStores(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['buys', 'sells'], 'readwrite');
    const buyStore = transaction.objectStore('buys');
    const sellStore = transaction.objectStore('sells');
    
    await Promise.all([
      new Promise(resolve => { buyStore.clear().onsuccess = () => resolve(void 0); }),
      new Promise(resolve => { sellStore.clear().onsuccess = () => resolve(void 0); })
    ]);
  }

  async addBuy(asset: string, price: number, quantity: number, timestamp: number, date: string): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['buys'], 'readwrite');
    const store = transaction.objectStore('buys');
    
    store.add({
      asset,
      price,
      quantity,
      timestamp,
      date
    });
  }

  async getBuysByAsset(asset: string): Promise<Array<{price: number, quantity: number, timestamp: number, date: string}>> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['buys'], 'readonly');
      const store = transaction.objectStore('buys');
      const index = store.index('asset');
      const request = index.getAll(asset);
      
      request.onsuccess = () => {
        const results = request.result.map(item => ({
          price: item.price,
          quantity: item.quantity,
          timestamp: item.timestamp,
          date: item.date
        }));
        // Sort by timestamp
        results.sort((a, b) => a.timestamp - b.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllAssets(): Promise<string[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['buys'], 'readonly');
      const store = transaction.objectStore('buys');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const assets = new Set<string>();
        request.result.forEach(item => assets.add(item.asset));
        resolve(Array.from(assets));
      };
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const processTransactionsV9 = async (
  transactions: any[][], 
  onProgress?: (progress: { phase: string; current: number; total: number; percentage: number }) => void
): Promise<{
  summaries: Map<string, AssetSummaryV8[]>;
  skippedItems: Map<string, AssetSummaryV8[]>;
}> => {
  const logPrefix = '[V9 INDEXEDDB]';
  const db = new TransactionDB();
  
  try {
    console.log(`${logPrefix} Starting IndexedDB processing for ${transactions.length} rows`);

    // Initialize database
    await db.init();
    await db.clearStores();
    console.log(`${logPrefix} Database initialized and cleared`);

    // Initial progress update
    onProgress?.({ 
      phase: 'Initializing database', 
      current: 0, 
      total: transactions.length,
      percentage: 0
    });

    // Phase 1: Store buys in IndexedDB
    console.log(`${logPrefix} Phase 1: Storing buy transactions to disk...`);
    let buyCount = 0;
    
    for (let i = 0; i < transactions.length; i++) {
      const row = transactions[i];
      if (!row || row.length < 6) continue;

      const dateNum = +row[2];
      if (!dateNum || dateNum < 1) continue;
      
      const side = String(row[3]).trim().toUpperCase();
      if (side !== 'BUY') continue;
      
      const symbol = String(row[0]).trim().toUpperCase();
      const quote = symbol.endsWith('INR') ? 'INR' : null;
      if (quote !== 'INR') continue;
      
      const price = +(String(row[4]).replace(/,/g, ''));
      const quantity = +(String(row[5]).replace(/,/g, ''));
      if (!price || !quantity || price < 0 || quantity < 0) continue;

      let baseAsset: string;
      if (symbol === 'USDTINR') baseAsset = 'USDT';
      else if (symbol === 'USDCINR') baseAsset = 'USDC';  
      else if (symbol === 'DAIINR') baseAsset = 'DAI';
      else baseAsset = symbol.replace(/INR|USDT|USDC|DAI$/, '');
      
      if (!baseAsset) continue;

      const jsDate = excelSerialDateToJSDate(dateNum);
      if (!jsDate) continue;

      await db.addBuy(baseAsset, price, quantity, jsDate.getTime(), String(row[2]).trim());
      buyCount++;

      // Progress reporting and yielding
      if (buyCount % 1000 === 0) {
        onProgress?.({ 
          phase: 'Storing buy transactions', 
          current: buyCount, 
          total: transactions.length,
          percentage: Math.round((buyCount / transactions.length) * 100)
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    console.log(`${logPrefix} Stored ${buyCount} buy transactions`);

    // Phase 2: Build asset balances from IndexedDB
    console.log(`${logPrefix} Phase 2: Building asset balances from disk...`);
    const assets = await db.getAllAssets();
    const assetBalances = new Map<string, AssetBalance>();
    
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const buys = await db.getBuysByAsset(asset);
      
      let totalQuantity = 0;
      let totalCost = 0;
      
      for (const buy of buys) {
        totalCost += buy.price * buy.quantity;
        totalQuantity += buy.quantity;
      }
      
      if (totalQuantity > 0) {
        assetBalances.set(asset, {
          totalQuantity,
          weightedCostBasis: totalCost / totalQuantity,
          totalCost
        });
      }
      
      // Progress reporting
      onProgress?.({ 
        phase: 'Building asset balances', 
        current: i + 1, 
        total: assets.length,
        percentage: Math.round(((i + 1) / assets.length) * 100)
      });
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    console.log(`${logPrefix} Built balances for ${assetBalances.size} assets`);

    // Phase 3: Stream process sell transactions 
    console.log(`${logPrefix} Phase 3: Processing sell transactions...`);
    const summariesByDate = new Map<string, AssetSummaryV8[]>();
    const skippedItemsByDate = new Map<string, AssetSummaryV8[]>();
    const dateFormatCache = new Map<string, string>();
    
    let processedSells = 0;
    
    for (let i = 0; i < transactions.length; i++) {
      const row = transactions[i];
      if (!row || row.length < 6) continue;

      const side = String(row[3]).trim().toUpperCase();
      if (side !== 'SELL') continue;
      
      const symbol = String(row[0]).trim().toUpperCase();
      const quote = symbol.endsWith('USDT') ? 'USDT' : null;
      if (quote !== 'USDT') continue;
      
      const dateNum = +row[2];
      if (!dateNum || dateNum < 1) continue;
      
      const price = +(String(row[4]).replace(/,/g, ''));
      const quantity = +(String(row[5]).replace(/,/g, ''));
      if (!price || !quantity || price < 0 || quantity < 0) continue;

      let baseAsset: string;
      if (symbol === 'USDTINR') baseAsset = 'USDT';
      else if (symbol === 'USDCINR') baseAsset = 'USDC';  
      else if (symbol === 'DAIINR') baseAsset = 'DAI';
      else baseAsset = symbol.replace(/INR|USDT|USDC|DAI$/, '');
      
      if (!baseAsset) continue;

      const jsDate = excelSerialDateToJSDate(dateNum);
      if (!jsDate) continue;

      // Process sell against balance
      const balance = assetBalances.get(baseAsset);
      if (!balance || balance.totalQuantity <= 0) {
        processedSells++;
        continue;
      }
      
      const sellQuantity = Math.min(quantity, balance.totalQuantity);
      const costBasis = balance.weightedCostBasis;
      
      // Update balance immediately
      balance.totalQuantity -= sellQuantity;
      balance.totalCost = balance.totalQuantity * balance.weightedCostBasis;
      
      // Get formatted date (cached)
      const dateStr = String(row[2]).trim();
      let sellDateStr = dateFormatCache.get(dateStr);
      if (!sellDateStr) {
        sellDateStr = formatDate(jsDate);
        dateFormatCache.set(dateStr, sellDateStr);
      }
      
      // Create minimal transaction object
      const sellTx: Transaction = {
        date: dateStr,
        jsDate,
        symbol,
        side,
        price,
        quantity,
        quote,
        tds: row[7] ? +(String(row[7]).replace(/,/g, '')) : 0,
        total: row[6] ? +(String(row[6]).replace(/,/g, '')) : undefined
      };
      
      const sellMatch: SellMatch = {
        sellTransaction: sellTx,
        matchedQuantity: sellQuantity,
        sellPrice: price,
        sellDate: jsDate,
        profitLoss: (price - costBasis) * sellQuantity,
        costBasis: costBasis,
        buyDate: jsDate // For v9, use sell date as buy date since we don't track individual buy dates
      };
      
      const summary: AssetSummaryV8 = {
        displayDate: sellDateStr,
        asset: baseAsset,
        inrPrice: costBasis,
        usdtPrice: price,
        coinSoldQty: sellQuantity,
        usdtPurchaseCost: price > 0 ? costBasis / price : 0,
        usdtQuantity: price * sellQuantity,
        usdtPurchaseCostInr: costBasis * sellQuantity,
        tds: sellTx.tds || 0,
        totalRelevantInrValue: costBasis * sellQuantity,
        totalRelevantInrQuantity: sellQuantity,
        fifoMatches: [sellMatch]
      };
      
      const existing = summariesByDate.get(sellDateStr);
      if (existing) {
        existing.push(summary);
      } else {
        summariesByDate.set(sellDateStr, [summary]);
      }
      
      processedSells++;
      
      // Progress reporting and yielding
      if (processedSells % 500 === 0) {
        onProgress?.({ 
          phase: 'Processing sell transactions', 
          current: processedSells, 
          total: transactions.length,
          percentage: Math.round((i / transactions.length) * 100)
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const totalSummaries = Array.from(summariesByDate.values()).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`${logPrefix} Processing complete: ${summariesByDate.size} trading days, ${totalSummaries} summaries`);
    
    // Final progress update
    onProgress?.({ 
      phase: 'Processing complete', 
      current: transactions.length, 
      total: transactions.length,
      percentage: 100
    });
    
    // Debug logging
    console.log(`${logPrefix} Sample summary data:`, Array.from(summariesByDate.entries()).slice(0, 2));
    console.log(`${logPrefix} Summary map size:`, summariesByDate.size);
    console.log(`${logPrefix} Skipped map size:`, skippedItemsByDate.size);
    
    return {
      summaries: summariesByDate,
      skippedItems: skippedItemsByDate
    };

  } catch (err) {
    console.error(`${logPrefix} Error:`, err);
    throw new Error('Error processing the file (V9 IndexedDB). Check console for details.');
  } finally {
    // Always cleanup database connection
    db.close();
  }
};