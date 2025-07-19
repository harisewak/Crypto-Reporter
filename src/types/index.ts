export interface Transaction {
    date: string; // Store original date string/serial from Excel
    jsDate: Date | null; // Add JS Date object
    symbol: string;
    side: string;
    price: number;
    quantity: number;
    quote: string;
    tds?: number;
    total?: number; // Add optional total cost field
  }
  
  export interface AssetSummary {
    displayDate: string; // Formatted date for display
    asset: string;
    inrPrice: number;
    usdtPrice: number;
    coinSoldQty: number; // Will be Math.min(inrQty, usdtQty)
    usdtPurchaseCost: number; // Ratio
    usdtQuantity: number; // New column: derived value (totalINR / Ratio)
    usdtPurchaseCostInr: number;
    tds: number;
  }

  // V1 summary interface (original format)
  export interface AssetSummaryV1 {
    asset: string;
    inrPrice: number;
    usdtPrice: number;
    usdtRange: number;
    usdtUnits: number;
    matchedQuantity: number;
    inrQuantity: number;
    usdtQuantity: number;
  }
  
  // V4 summary interface (Client specific)
  export interface AssetSummaryV4 {
    displayDate: string; // A
    asset: string; // B
    inrPrice: number; // C (Avg INR Price)
    usdtPrice: number; // D (Avg USDT Price)
    coinSoldQty: number; // E (Matched Qty / Daily Sell Qty)
    usdtPurchaseCost: number; // F (USDT Cost Ratio H/G)
    usdtQuantity: number; // G (USDT Qty Derived / Daily Sell Value)
    usdtPurchaseCostInr: number; // H (USDT Cost INR E*C)
    tds: number; // I
    totalRelevantInrValue: number; // K (BUY IN INR)
    totalRelevantInrQuantity: number; // L (QNTY)
  }
  
  // V5 summary interface (Duplicate of V4)
  export interface AssetSummaryV5 {
    displayDate: string; // A
    asset: string; // B
    inrPrice: number; // C (Avg INR Price)
    usdtPrice: number; // D (Avg USDT Price)
    coinSoldQty: number; // E (Matched Qty / Daily Sell Qty)
    usdtPurchaseCost: number; // F (USDT Cost Ratio H/G)
    usdtQuantity: number; // G (USDT Qty Derived / Daily Sell Value)
    usdtPurchaseCostInr: number; // H (USDT Cost INR E*C)
    tds: number; // I
    totalRelevantInrValue: number; // K (BUY IN INR)
    totalRelevantInrQuantity: number; // L (QNTY)
  }
  
  export interface AssetSummaryV7 {
    displayDate: string; // A
    asset: string; // B
    inrPrice: number; // C (Avg INR Price)
    usdtPrice: number; // D (Avg USDT Price)
    coinSoldQty: number; // E (Matched Qty / Daily Sell Qty)
    usdtPurchaseCost: number; // F (USDT Cost Ratio H/G)
    usdtQuantity: number; // G (USDT Qty Derived / Daily Sell Value)
    usdtPurchaseCostInr: number; // H (USDT Cost INR E*C)
    tds: number; // I
    totalRelevantInrValue: number; // K (BUY IN INR)
    totalRelevantInrQuantity: number; // L (QNTY)
  }
  
  // V6 summary interface (Duplicate of V5)
  export interface AssetSummaryV6 {
    asset: string;
    date: string;
    totalBuyAmount: number;
    totalSellAmount: number;
    totalBuyValue: number;
    totalSellValue: number;
    profitLoss: number;
    profitLossPercentage: number;
    comment: string;
    inrPrice: number;
    usdtPrice: number;
    coinSoldQty: number;
    usdtPurchaseCost: number;
    usdtQuantity: number;
    usdtPurchaseCostInr: number;
    tds: number;
    totalRelevantInrValue: number;
    totalRelevantInrQuantity: number;
  }

  export interface SellTransaction {
    pair: string;
    base_currency: string;
    Trade_Completion_time: string;
    side: 'buy' | 'sell';
    price: number;
    quantity: number;
    net_inr: number;
  }

  export interface SellSummary {
    date: string;
    asset: string;
    avgInrPrice: number;
    avgUsdtPrice: number;
    matchedQty: number;
    usdtReceivedRatio: number;
    usdtQtyDerived: number;
    usdtReceivedInr: number;
    tds: number;
    buyInUsdt: number;
    quantity: number;
    error?: string;
    balQuantity: number;
  }

  export interface DailySellSummary {
    summaries: SellSummary[];
    totalUsdtQty: number;
    totalUsdtReceivedInr: number;
    totalTds: number;
  }

  // V8 FIFO-specific interfaces
  export interface FIFOBuyRecord {
    transactionId: string;
    price: number;
    originalQuantity: number;
    remainingQuantity: number;
    purchaseDate: Date;
    tds: number;
    total?: number;
  }

  export interface SellMatch {
    sellTransaction: Transaction;
    matchedQuantity: number;
    sellPrice: number;
    sellDate: Date;
    profitLoss: number;
    costBasis: number;
  }

  export interface FIFOQueue {
    [asset: string]: {
      records: FIFOBuyRecord[];
      startIndex: number;
    };
  }

  export interface AssetSummaryV8 {
    displayDate: string; // A
    asset: string; // B
    inrPrice: number; // C (FIFO weighted average cost basis)
    usdtPrice: number; // D (Avg USDT Price)
    coinSoldQty: number; // E (Matched Qty / Daily Sell Qty)
    usdtPurchaseCost: number; // F (USDT Cost Ratio H/G)
    usdtQuantity: number; // G (USDT Qty Derived / Daily Sell Value)
    usdtPurchaseCostInr: number; // H (USDT Cost INR E*C)
    tds: number; // I
    totalRelevantInrValue: number; // K (BUY IN INR)
    totalRelevantInrQuantity: number; // L (QNTY)
    fifoMatches: SellMatch[]; // Additional FIFO tracking data
  }

  // V9 uses same structure as V8 for compatibility
  export type AssetSummaryV9 = AssetSummaryV8;