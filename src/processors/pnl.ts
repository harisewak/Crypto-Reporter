import { AssetSummaryV7 } from "../types";

export interface PnLMatch {
  asset: string;
  date: string;
  buyRecord: AssetSummaryV7;
  sellRecord: AssetSummaryV7;
  matchedQuantity: number;
  buyPrice: number;
  sellPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface PnLSummary {
  matches: PnLMatch[];
  totalProfitLoss: number;
  totalInvestment: number;
  overallReturn: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  assetBreakdown: Map<string, {
    totalPnL: number;
    totalInvestment: number;
    returnPercentage: number;
    trades: number;
  }>;
}

export const processPnLAnalysis = (
  buyData: Map<string, AssetSummaryV7[]>,
  sellData: Map<string, AssetSummaryV7[]>
): PnLSummary => {
  const logPrefix = '[P&L PROCESSOR]';
  console.log(`${logPrefix} Starting P&L analysis with ${buyData.size} buy dates and ${sellData.size} sell dates`);

  const matches: PnLMatch[] = [];
  const assetInventory = new Map<string, AssetSummaryV7[]>();

  // 1. Build FIFO inventory from buy data
  console.log(`${logPrefix} Building FIFO inventory from buy data...`);
  for (const [, buyRecords] of buyData.entries()) {
    for (const buyRecord of buyRecords) {
      const asset = buyRecord.asset;
      if (!assetInventory.has(asset)) {
        assetInventory.set(asset, []);
      }
      assetInventory.get(asset)!.push({
        ...buyRecord,
        remainingQty: buyRecord.coinSoldQty || 0 // Track remaining quantity for FIFO
      } as AssetSummaryV7 & { remainingQty: number });
    }
  }

  // Sort inventory by date for FIFO (oldest first)
  for (const [asset, inventory] of assetInventory.entries()) {
    inventory.sort((a, b) => new Date(a.displayDate).getTime() - new Date(b.displayDate).getTime());
    console.log(`${logPrefix} Asset ${asset}: ${inventory.length} buy records in FIFO queue`);
  }

  // 2. Process sell data against FIFO inventory
  console.log(`${logPrefix} Processing sell data against FIFO inventory...`);
  for (const [date, sellRecords] of sellData.entries()) {
    for (const sellRecord of sellRecords) {
      const asset = sellRecord.asset;
      const inventory = assetInventory.get(asset);
      
      if (!inventory || inventory.length === 0) {
        console.warn(`${logPrefix} No buy inventory for asset ${asset} on ${date}`);
        continue;
      }

      let remainingToMatch = sellRecord.coinSoldQty || 0;
      console.log(`${logPrefix} Matching sell ${asset} quantity ${remainingToMatch} on ${date}`);

      // FIFO matching against buy inventory
      for (const buyRecord of inventory) {
        if (remainingToMatch <= 0) break;
        
        const buyRecordWithQty = buyRecord as AssetSummaryV7 & { remainingQty: number };
        if (buyRecordWithQty.remainingQty <= 0) continue;

        const matchQuantity = Math.min(remainingToMatch, buyRecordWithQty.remainingQty);
        const buyPrice = buyRecord.inrPrice;
        const sellPrice = sellRecord.inrPrice;
        const profitLoss = (sellPrice - buyPrice) * matchQuantity;
        const profitLossPercentage = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;

        const match: PnLMatch = {
          asset,
          date: sellRecord.displayDate,
          buyRecord,
          sellRecord,
          matchedQuantity: matchQuantity,
          buyPrice,
          sellPrice,
          profitLoss,
          profitLossPercentage
        };

        matches.push(match);
        buyRecordWithQty.remainingQty -= matchQuantity;
        remainingToMatch -= matchQuantity;

        console.log(`${logPrefix} Match: ${asset} ${matchQuantity} units, P&L: ${profitLoss.toFixed(2)} INR (${profitLossPercentage.toFixed(2)}%)`);
      }

      if (remainingToMatch > 0) {
        console.warn(`${logPrefix} Unmatched sell quantity for ${asset}: ${remainingToMatch}`);
      }
    }
  }

  // 3. Calculate summary statistics
  console.log(`${logPrefix} Calculating summary statistics from ${matches.length} matches...`);
  const totalProfitLoss = matches.reduce((sum, match) => sum + match.profitLoss, 0);
  const totalInvestment = matches.reduce((sum, match) => sum + (match.buyPrice * match.matchedQuantity), 0);
  const overallReturn = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;
  
  const winningTrades = matches.filter(match => match.profitLoss > 0).length;
  const losingTrades = matches.filter(match => match.profitLoss < 0).length;
  const winRate = matches.length > 0 ? (winningTrades / matches.length) * 100 : 0;

  // 4. Asset breakdown
  const assetBreakdown = new Map<string, {
    totalPnL: number;
    totalInvestment: number;
    returnPercentage: number;
    trades: number;
  }>();

  matches.forEach(match => {
    const asset = match.asset;
    const existing = assetBreakdown.get(asset) || {
      totalPnL: 0,
      totalInvestment: 0,
      returnPercentage: 0,
      trades: 0
    };

    existing.totalPnL += match.profitLoss;
    existing.totalInvestment += match.buyPrice * match.matchedQuantity;
    existing.trades += 1;
    existing.returnPercentage = existing.totalInvestment > 0 ? 
      (existing.totalPnL / existing.totalInvestment) * 100 : 0;

    assetBreakdown.set(asset, existing);
  });

  console.log(`${logPrefix} P&L Analysis Complete:`, {
    totalMatches: matches.length,
    totalProfitLoss: totalProfitLoss.toFixed(2),
    overallReturn: overallReturn.toFixed(2) + '%',
    winRate: winRate.toFixed(1) + '%'
  });

  return {
    matches,
    totalProfitLoss,
    totalInvestment,
    overallReturn,
    winningTrades,
    losingTrades,
    winRate,
    assetBreakdown
  };
};