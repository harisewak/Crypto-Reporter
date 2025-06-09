import { AssetSummaryV1, Transaction } from "../types"

// V1 processing logic (original)
export const processTransactionsV1 = (transactions: any[][]): AssetSummaryV1[] => {
    try {
      console.log('Processing transactions (V1):', transactions.length, 'rows')
      
      const assetMap = new Map<string, Transaction[]>()
      
      transactions.forEach((row, index) => {
        try {
          if (!row || !Array.isArray(row) || row.length < 6) {
            console.log(`Skipping row ${index} due to insufficient columns:`, row)
            return
          }

          // Extract data using fixed indices
          const symbol = String(row[0]).trim()        // Pair
          const side = String(row[3]).trim().toUpperCase() // Side
          let priceStr = String(row[4])              // Price
          let quantityStr = String(row[5])           // Quantity
          let totalStr = String(row[6] || '');        // Total Cost (Column 7, index 6)

          let price = NaN
          let quantity = NaN
          let total = NaN; // Initialize total

          try {
            price = parseFloat(priceStr.replace(/,/g, ''))
            quantity = parseFloat(quantityStr.replace(/,/g, ''))
            if (totalStr) { // Parse total only if it exists
                total = parseFloat(totalStr.replace(/,/g, ''))
            }
          } catch (parseError) {
            console.log(`Skipping row ${index} due to invalid number format:`, row)
            return
          }
          
          if (!symbol || !side || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
            console.log(`Skipping row ${index} due to invalid/missing data:`, { symbol, side, price, quantity, rawRow: row })
            return
          }

          let baseAsset: string;
          const upperSymbolV1 = symbol.toUpperCase();
          if (upperSymbolV1 === 'USDTINR') {
            baseAsset = 'USDT';
          } else if (upperSymbolV1 === 'USDCINR') {
            baseAsset = 'USDC';
          } else if (upperSymbolV1 === 'DAIINR') {
            baseAsset = 'DAI';
          } else {
            baseAsset = symbol.replace(/INR|USDT|USDC|DAI$/, '');
          }
          
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
            console.warn(`Row ${index} (V1): Unrecognized quote currency for symbol '${symbol}'.`);
            quote = 'UNKNOWN';
          }
          
          if (!assetMap.has(baseAsset)) {
            assetMap.set(baseAsset, [])
          }
          
          const transaction: Transaction = {
            date: '', // Not used in V1
            jsDate: null,
            symbol,
            side,
            price,
            quantity,
            quote,
            total: isNaN(total) ? undefined : total // Add total to transaction object
          }

          assetMap.get(baseAsset)?.push(transaction)
        } catch (err) {
          console.error(`Error processing row ${index}:`, err, row)
        }
      })

      const summaries: AssetSummaryV1[] = []
      
      assetMap.forEach((transactions, asset) => {
        const inrTrades = transactions.filter(t => t.quote === 'INR' && t.side === 'BUY')
        const usdtTrades = transactions.filter(t => t.quote === 'USDT' && t.side === 'SELL')
        
        if (inrTrades.length > 0 && usdtTrades.length > 0) {
          // Calculate total values
          const totalInrValue = inrTrades.reduce((sum, t) => {
              const cost = (t.total !== undefined && !isNaN(t.total) && t.total > 0) ? t.total : t.price * t.quantity;
              return sum + cost;
          }, 0);
          const totalInrQuantity = inrTrades.reduce((sum, t) => sum + t.quantity, 0)
          const totalUsdtValue = usdtTrades.reduce((sum, t) => sum + t.price * t.quantity, 0)
          const totalUsdtQuantity = usdtTrades.reduce((sum, t) => sum + t.quantity, 0)

          // Calculate average prices
          const averageInrPrice = totalInrQuantity > 0 ? totalInrValue / totalInrQuantity : 0
          const averageUsdtPrice = totalUsdtQuantity > 0 ? totalUsdtValue / totalUsdtQuantity : 0
          
          // Use the total quantities calculated from filtered trades
          const inrQuantity = totalInrQuantity
          const usdtQuantity = totalUsdtQuantity
          
          // Use the minimum quantity of matched trades for calculations
          const matchedQuantity = Math.min(inrQuantity, usdtQuantity)
          
          // Calculate USDT Range: Ratio of average INR buy price to average USDT sell price.
          const usdtRange = averageUsdtPrice > 0 ? averageInrPrice / averageUsdtPrice : 0
          
          // Calculate USDT Units: Total INR cost for matched quantity divided by USDT Range.
          const totalInrCostForMatchedQuantity = averageInrPrice * matchedQuantity
          const usdtUnits = usdtRange > 0 ? totalInrCostForMatchedQuantity / usdtRange : 0

          summaries.push({
            asset,
            inrPrice: averageInrPrice,
            usdtPrice: averageUsdtPrice,
            usdtRange,
            usdtUnits,
            matchedQuantity,
            inrQuantity,
            usdtQuantity
          })
        }
      })
      
      if (summaries.length === 0 && transactions.length > 0) {
        throw new Error('No matching INR buys and USDT sells found in the processed data.')
      }

      return summaries;
    } catch (err) {
      console.error('Error processing transactions:', err)
      throw new Error('Error processing the file. Please check the console for details.')
    }
  }