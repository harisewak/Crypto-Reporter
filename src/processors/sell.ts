import { SellTransaction, SellSummary, DailySellSummary } from '../types';

export const processSellTransactions = (transactions: SellTransaction[]): Map<string, DailySellSummary> => {
  const dailySummaries = new Map<string, DailySellSummary>();
  
  // Group transactions by date
  const transactionsByDate = new Map<string, SellTransaction[]>();
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.Trade_Completion_time).toLocaleDateString();
    if (!transactionsByDate.has(date)) {
      transactionsByDate.set(date, []);
    }
    transactionsByDate.get(date)?.push(transaction);
  });

  // Process each day's transactions
  transactionsByDate.forEach((dayTransactions, date) => {
    const summaries: SellSummary[] = [];
    let totalUsdtQty = 0;
    let totalUsdtReceivedInr = 0;
    let totalTds = 0;

    // Group by asset
    const assetGroups = new Map<string, SellTransaction[]>();
    dayTransactions.forEach(transaction => {
      const asset = transaction.pair.replace(/USDT|INR/g, '');
      if (!assetGroups.has(asset)) {
        assetGroups.set(asset, []);
      }
      assetGroups.get(asset)?.push(transaction);
    });

    // Process each asset
    assetGroups.forEach((assetTransactions, asset) => {
      const buys = assetTransactions.filter(t => t.side === 'buy');
      const sells = assetTransactions.filter(t => t.side === 'sell');

      // Calculate averages and matched quantities
      const avgInrPrice = calculateAveragePrice(sells, 'INR');
      const avgUsdtPrice = calculateAveragePrice(sells, 'USDT');
      const matchedQty = calculateMatchedQuantity(sells);
      const usdtReceivedInr = calculateUsdtReceivedInr(sells);
      const usdtReceivedRatio = usdtReceivedInr / matchedQty;
      const usdtQtyDerived = avgUsdtPrice * matchedQty;
      const tds = calculateTds(usdtReceivedInr);
      const buyInUsdt = calculateBuyInUsdt(buys);
      const balQuantity = calculateBalanceQuantity(buys, sells);

      const summary: SellSummary = {
        date,
        asset,
        avgInrPrice,
        avgUsdtPrice,
        matchedQty,
        usdtReceivedRatio,
        usdtQtyDerived,
        usdtReceivedInr,
        tds,
        buyInUsdt,
        quantity: matchedQty,
        error: determineError(asset, buys, sells),
        balQuantity
      };

      summaries.push(summary);
      totalUsdtQty += usdtQtyDerived;
      totalUsdtReceivedInr += usdtReceivedInr;
      totalTds += tds;
    });

    // Add totals
    summaries.push({
      date,
      asset: 'TOTAL',
      avgInrPrice: 0,
      avgUsdtPrice: 0,
      matchedQty: 0,
      usdtReceivedRatio: 0,
      usdtQtyDerived: totalUsdtQty,
      usdtReceivedInr: totalUsdtReceivedInr,
      tds: totalTds,
      buyInUsdt: 0,
      quantity: 0,
      balQuantity: 0
    });

    dailySummaries.set(date, {
      summaries,
      totalUsdtQty,
      totalUsdtReceivedInr,
      totalTds
    });
  });

  return dailySummaries;
};

// Helper functions
const calculateAveragePrice = (transactions: SellTransaction[], currency: 'INR' | 'USDT'): number => {
  const relevantTransactions = transactions.filter(t => 
    t.base_currency === currency || t.pair.includes(currency)
  );
  if (relevantTransactions.length === 0) return NaN;
  
  const total = relevantTransactions.reduce((sum, t) => sum + t.price * t.quantity, 0);
  const totalQty = relevantTransactions.reduce((sum, t) => sum + t.quantity, 0);
  return total / totalQty;
};

const calculateMatchedQuantity = (sells: SellTransaction[]): number => {
  return sells.reduce((sum, t) => sum + t.quantity, 0);
};

const calculateUsdtReceivedInr = (sells: SellTransaction[]): number => {
  return sells.reduce((sum, t) => sum + t.net_inr, 0);
};

const calculateTds = (amount: number): number => {
  return amount * 0.001; // 0.1% TDS
};

const calculateBuyInUsdt = (buys: SellTransaction[]): number => {
  return buys.reduce((sum, t) => sum + t.net_inr, 0);
};

const calculateBalanceQuantity = (buys: SellTransaction[], sells: SellTransaction[]): number => {
  const totalBuy = buys.reduce((sum, t) => sum + t.quantity, 0);
  const totalSell = sells.reduce((sum, t) => sum + t.quantity, 0);
  return totalBuy - totalSell;
};

const determineError = (asset: string, buys: SellTransaction[], sells: SellTransaction[]): string | undefined => {
  if (asset === 'USDT' || asset === 'USDC') return 'USDT/USDC';
  if (buys.length === 0 && sells.length > 0) return 'SELL';
  if (buys.length > 0 && sells.length === 0) return 'BUY';
  return undefined;
}; 