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