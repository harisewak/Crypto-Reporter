import { AssetSummaryV4, AssetSummaryV5, AssetSummaryV6, AssetSummaryV7, AssetSummaryV8, AssetSummary } from "../types";
import { formatDateTime } from "../utils/dateUtils";

// Function to export V4 summary data to CSV (Client Specific)
export const exportV4SummaryToCSV = (version: string, summaryV4: Map<string, AssetSummaryV4[]>) => {
    if (version !== 'v4' || summaryV4.size === 0) return;

    const csvHeaders = [
      'Date', // A
      'Asset', // B
      'Avg INR Price', // C
      'Avg USDT Price', // D
      'Matched Qty', // E
      'USDT Cost (Ratio)', // F
      'USDT Qty (Derived)', // G
      'USDT Cost (INR)', // H
      'TDS', // I
      '', // J (Empty)
      'BUY IN INR', // K
      'QNTY', // L
      '', // M (Empty)
      '', // N (Empty)
      '"26,27,29&30 AUGOST MY WORKE"' // O (Comment - Ensure quotes are handled)
    ];
    const csvRows: string[] = [csvHeaders.join(',')];

    // Sort by date, then by asset within date
    Array.from(summaryV4.entries())
      .sort((a, b) => {
          const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          if (isNaN(dateA) || isNaN(dateB)) return a[0].localeCompare(b[0]);
          return dateA - dateB;
      })
      .forEach(([date, summariesOnDate]) => {
        // First add all regular rows
        summariesOnDate
        .sort((a,b) => a.asset.localeCompare(b.asset))
        .forEach((item) => {
          const csvRow = [
            `"${date}"`, // A (Quoted date)
            item.asset, // B
            item.inrPrice > 0 ? item.inrPrice.toFixed(10) : '', // C (Precision 10)
            item.usdtPrice > 0 ? item.usdtPrice.toFixed(10) : '', // D (Precision 10)
            item.coinSoldQty ? item.coinSoldQty.toFixed(10) : '0.0000000000', // E
            item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(10) : '', // F (Precision 10)
            item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(10) : '', // G
            item.usdtPurchaseCostInr ? item.usdtPurchaseCostInr.toFixed(10) : '0.0000000000', // H (Precision 10)
            item.tds > 0 ? item.tds.toFixed(10) : '', // I
            '', // J (Empty)
            item.totalRelevantInrValue ? item.totalRelevantInrValue.toFixed(10) : '0.0000000000', // K (Precision 10)
            item.totalRelevantInrQuantity ? item.totalRelevantInrQuantity.toFixed(10) : '0.0000000000', // L
            '', // M (Empty)
            '', // N (Empty)
            '' // O (No comment needed per row based on sample)
          ].join(',');
          csvRows.push(csvRow);
        });

        // Then add the total row for this date
        const totals = {
          coinSoldQty: summariesOnDate.reduce((sum, item) => sum + (item.coinSoldQty || 0), 0),
          usdtQuantity: summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0),
          usdtPurchaseCostInr: summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0),
          tds: summariesOnDate.reduce((sum, item) => sum + (item.tds || 0), 0),
          totalRelevantInrValue: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrValue || 0), 0),
          totalRelevantInrQuantity: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrQuantity || 0), 0),
        };

        const totalRow = [
          `"${date}"`, // A (Quoted date)
          'Total', // B
          '', // C (No avg price for total)
          '', // D (No avg price for total)
          totals.coinSoldQty.toFixed(10), // E
          '', // F (No ratio for total)
          totals.usdtQuantity.toFixed(10), // G
          totals.usdtPurchaseCostInr.toFixed(10), // H
          totals.tds.toFixed(10), // I
          '', // J (Empty)
          totals.totalRelevantInrValue.toFixed(10), // K (Precision 10)
          totals.totalRelevantInrQuantity.toFixed(10), // L
          '', // M (Empty)
          '', // N (Empty)
          '' // O (No comment needed for total)
        ].join(',');
        csvRows.push(totalRow);
        
        // Add a blank row after each date's total for better readability
        csvRows.push('');
      });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `crypto_summary_v4_client.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Function to export V5 summary data to CSV (Duplicate of V4 Client Specific)
  export const exportV5SummaryToCSV = (version: string, summaryV5: Map<string, AssetSummaryV5[]>) => {
    if (version !== 'v5' || summaryV5.size === 0) return;

    const csvHeaders = [
      'Date', // A
      'Asset', // B
      'Avg INR Price', // C
      'Avg USDT Price', // D
      'Matched Qty', // E
      'USDT Cost (Ratio)', // F
      'USDT Qty (Derived)', // G
      'USDT Cost (INR)', // H
      'TDS', // I
      '', // J (Empty)
      'BUY IN INR', // K
      'QNTY', // L
      '', // M (Empty)
      '', // N (Empty)
      '"V5 DUPLICATE OF V4 COMMENT"' // O (Comment - Ensure quotes are handled)
    ];
    const csvRows: string[] = [csvHeaders.join(',')];

    // Sort by date, then by asset within date
    Array.from(summaryV5.entries())
      .sort((a, b) => {
          const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          if (isNaN(dateA) || isNaN(dateB)) return a[0].localeCompare(b[0]);
          return dateA - dateB;
      })
      .forEach(([date, summariesOnDate]) => {
        // First add all regular rows
        summariesOnDate
        .sort((a,b) => a.asset.localeCompare(b.asset))
        .forEach((item) => {
          const csvRow = [
            `"${date}"`, // A (Quoted date)
            item.asset, // B
            item.inrPrice > 0 ? item.inrPrice.toFixed(10) : '', // C (Precision 10)
            item.usdtPrice > 0 ? item.usdtPrice.toFixed(10) : '', // D (Precision 10)
            item.coinSoldQty ? item.coinSoldQty.toFixed(10) : '0.0000000000', // E
            item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(10) : '', // F (Precision 10)
            item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(10) : '', // G
            item.usdtPurchaseCostInr ? item.usdtPurchaseCostInr.toFixed(10) : '0.0000000000', // H (Precision 10)
            item.tds > 0 ? item.tds.toFixed(10) : '', // I
            '', // J (Empty)
            item.totalRelevantInrValue ? item.totalRelevantInrValue.toFixed(10) : '0.0000000000', // K (Precision 10)
            item.totalRelevantInrQuantity ? item.totalRelevantInrQuantity.toFixed(10) : '0.0000000000', // L
            '', // M (Empty)
            '', // N (Empty)
            '' // O (No comment needed per row based on sample)
          ].join(',');
          csvRows.push(csvRow);
        });

        // Then add the total row for this date
        const totals = {
          coinSoldQty: summariesOnDate.reduce((sum, item) => sum + (item.coinSoldQty || 0), 0),
          usdtQuantity: summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0),
          usdtPurchaseCostInr: summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0),
          tds: summariesOnDate.reduce((sum, item) => sum + (item.tds || 0), 0),
          totalRelevantInrValue: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrValue || 0), 0),
          totalRelevantInrQuantity: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrQuantity || 0), 0),
        };

        const totalRow = [
          `"${date}"`, // A (Quoted date)
          'Total', // B
          '', // C (No avg price for total)
          '', // D (No avg price for total)
          totals.coinSoldQty.toFixed(10), // E
          '', // F (No ratio for total)
          totals.usdtQuantity.toFixed(10), // G
          totals.usdtPurchaseCostInr.toFixed(10), // H
          totals.tds.toFixed(10), // I
          '', // J (Empty)
          totals.totalRelevantInrValue.toFixed(10), // K (Precision 10)
          totals.totalRelevantInrQuantity.toFixed(10), // L
          '', // M (Empty)
          '', // N (Empty)
          '' // O (No comment needed for total)
        ].join(',');
        csvRows.push(totalRow);
        
        // Add a blank row after each date's total for better readability
        csvRows.push('');
      });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `crypto_summary_v5_client.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Function to export V6 summary data to CSV (Duplicate of V5)
  export const exportV6SummaryToCSV = (version: string, summaryV6: Map<string, AssetSummaryV6[]>) => {
    if (version !== 'v6' || summaryV6.size === 0) return;

    const headers = [
      'A (Asset)',
      'B (Date)',
      'C (Total Buy Amount)',
      'D (Total Sell Amount)',
      'E (Total Buy Value)',
      'F (Total Sell Value)',
      'G (Profit/Loss)',
      'H (Profit/Loss %)',
      'I (INR Price)',
      'J (USDT Price)',
      'K (Coin Sold Qty)',
      'L (USDT Purchase Cost)',
      'M (USDT Quantity)',
      'N (USDT Purchase Cost INR)',
      'O (TDS)',
      'P (Total Relevant INR Value)',
      'Q (Total Relevant INR Quantity)',
      'R (Comment)'
    ];

    const csvContent = [
      headers.join(','),
      ...Array.from(summaryV6.entries()).flatMap(([date, summaries]) =>
        summaries.map(summary => [
          summary.asset,
          date,
          summary.totalBuyAmount,
          summary.totalSellAmount,
          summary.totalBuyValue,
          summary.totalSellValue,
          summary.profitLoss,
          summary.profitLossPercentage,
          summary.inrPrice,
          summary.usdtPrice,
          summary.coinSoldQty,
          summary.usdtPurchaseCost,
          summary.usdtQuantity,
          summary.usdtPurchaseCostInr,
          summary.tds,
          summary.totalRelevantInrValue,
          summary.totalRelevantInrQuantity,
          '"V6 DUPLICATE OF V5 COMMENT"'
        ].join(','))
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `crypto_summary_v6_client.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  export const exportV7SummaryToCSV = (version: string, summaryV7: Map<string, AssetSummaryV7[]>) => {
    if (version !== 'v7' || summaryV7.size === 0) return;

    const csvHeaders = [
      'Date', // A
      'Asset', // B
      'Avg INR Price', // C
      'Avg USDT Price', // D
      'Matched Qty', // E
      'USDT Cost (Ratio)', // F
      'USDT Qty (Derived)', // G
      'USDT Cost (INR)', // H
      'TDS', // I
      '', // J (Empty)
      'BUY IN INR', // K
      'QNTY', // L
      '', // M (Empty)
      '', // N (Empty)
      '"V7 DUPLICATE OF V5 COMMENT"' // O (Comment - Ensure quotes are handled)
    ];
    const csvRows: string[] = [csvHeaders.join(',')];

    // Sort by date, then by asset within date
    Array.from(summaryV7.entries())
      .sort((a, b) => {
          const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          if (isNaN(dateA) || isNaN(dateB)) return a[0].localeCompare(b[0]);
          return dateA - dateB;
      })
      .forEach(([date, summariesOnDate]) => {
        // First add all regular rows
        summariesOnDate
        .sort((a,b) => a.asset.localeCompare(b.asset))
        .forEach((item) => {
          const csvRow = [
            `"${date}"`, // A (Quoted date)
            item.asset, // B
            item.inrPrice > 0 ? item.inrPrice.toFixed(10) : '', // C (Precision 10)
            item.usdtPrice > 0 ? item.usdtPrice.toFixed(10) : '', // D (Precision 10)
            item.coinSoldQty ? item.coinSoldQty.toFixed(10) : '0.0000000000', // E
            item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(10) : '', // F (Precision 10)
            item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(10) : '', // G
            item.usdtPurchaseCostInr ? item.usdtPurchaseCostInr.toFixed(10) : '0.0000000000', // H (Precision 10)
            item.tds > 0 ? item.tds.toFixed(10) : '', // I
            '', // J (Empty)
            item.totalRelevantInrValue ? item.totalRelevantInrValue.toFixed(10) : '0.0000000000', // K (Precision 10)
            item.totalRelevantInrQuantity ? item.totalRelevantInrQuantity.toFixed(10) : '0.0000000000', // L
            '', // M (Empty)
            '', // N (Empty)
            '' // O (No comment needed per row based on sample)
          ].join(',');
          csvRows.push(csvRow);
        });

        // Then add the total row for this date
        const totals = {
          coinSoldQty: summariesOnDate.reduce((sum, item) => sum + (item.coinSoldQty || 0), 0),
          usdtQuantity: summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0),
          usdtPurchaseCostInr: summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0),
          tds: summariesOnDate.reduce((sum, item) => sum + (item.tds || 0), 0),
          totalRelevantInrValue: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrValue || 0), 0),
          totalRelevantInrQuantity: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrQuantity || 0), 0),
        };

        const totalRow = [
          `"${date}"`, // A (Quoted date)
          'Total', // B
          '', // C (No avg price for total)
          '', // D (No avg price for total)
          '', // E
          totals.usdtQuantity > 0 ? (totals.usdtPurchaseCostInr / totals.usdtQuantity).toFixed(10) : '', // F (USDT Cost Ratio)
          totals.usdtQuantity.toFixed(10), // G
          totals.usdtPurchaseCostInr.toFixed(10), // H
          totals.tds.toFixed(10), // I
          '', // J (Empty)
          totals.totalRelevantInrValue.toFixed(10), // K (Precision 10)
          totals.totalRelevantInrQuantity.toFixed(10), // L
          '', // M (Empty)
          '', // N (Empty)
          '' // O (No comment needed for total)
        ].join(',');
        csvRows.push(totalRow);
        
        // Add a blank row after each date's total for better readability
        csvRows.push('');
      });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `crypto_summary_v7_client.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Add the export function
  export const exportSkippedTradesV7ToCSV = (skippedItemsV7: Map<string, AssetSummaryV7[]>) => {
    try {
      const headers = [
        'Date',
        'Asset',
        'Avg INR Price',
        'Avg USDT Price',
        'Total Qty',
        'USDT Qty',
        'TDS',
        'Total INR Value',
        'Total INR Qty'
      ];

      const csvRows = [headers];

      // Add data rows
      skippedItemsV7.forEach((summaries) => {
        summaries.forEach(summary => {
          csvRows.push([
            summary.displayDate,
            summary.asset,
            summary.inrPrice.toFixed(2),
            summary.usdtPrice.toFixed(2),
            summary.coinSoldQty.toFixed(8),
            summary.usdtQuantity.toFixed(2),
            summary.tds.toFixed(2),
            summary.totalRelevantInrValue.toFixed(2),
            summary.totalRelevantInrQuantity.toFixed(8)
          ]);
        });
      });

      // Convert to CSV string
      const csvContent = csvRows.map(row => row.join(',')).join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `skipped_trades_v7_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting skipped trades to CSV:', err);
      throw new Error('Error exporting skipped trades to CSV. Check console for details.');
    }
  };

  // Function to export V3 summary data to CSV
  export const exportV3SummaryToCSV = (version: string, summary: Map<string, AssetSummary[]>) => {
    if (version !== 'v3' || summary.size === 0) return;
    const strategy = 'proportional'; // <-- Use hardcoded strategy for filename

    const csvHeaders = [
      'Date',
      'Asset',
      'Avg INR Price',
      'Avg USDT Price',
      'Matched Qty',
      'USDT Cost (Ratio)',
      'USDT Qty (Derived)',
      'USDT Cost (INR)',
      'TDS'
    ];
    const csvRows: string[] = [csvHeaders.join(',')];

    // Sort by date, then by asset within date
    Array.from(summary.entries())
    .sort((a, b) => {
        const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
        const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
        if (isNaN(dateA) || isNaN(dateB)) return a[0].localeCompare(b[0]);
        return dateA - dateB;
    })
      .forEach(([date, summariesOnDate]) => {
        summariesOnDate
        .sort((a,b) => a.asset.localeCompare(b.asset))
        .forEach((item) => {
          const csvRow = [
            `"${date}"`, // Add quotes for potential commas
            item.asset,
            item.inrPrice > 0 ? item.inrPrice.toFixed(4) : '',
            item.usdtPrice > 0 ? item.usdtPrice.toFixed(4) : '',
            item.coinSoldQty.toFixed(4),
            item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(4) : '',
            item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(4) : '',
            item.usdtPurchaseCostInr.toFixed(2),
            item.tds > 0 ? item.tds.toFixed(2) : ''
          ].join(',');
          csvRows.push(csvRow);
        });
      });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `crypto_summary_v3_${strategy}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Function to export Sell summary data to CSV
  export const exportSellSummaryToCSV = (sellSummary: Map<string, AssetSummaryV7[]>) => {
    if (sellSummary.size === 0) return;

    const csvHeaders = [
      'Date', // A
      'Asset', // B
      'Avg INR Price', // C
      'Avg USDT Price', // D
      'Matched Qty', // E
      'USDT Cost (Ratio)', // F
      'USDT Qty (Derived)', // G
      'USDT Cost (INR)', // H
      'TDS', // I
      '', // J (Empty)
      'BUY IN INR', // K
      'QNTY', // L
      '', // M (Empty)
      '', // N (Empty)
      '"SELL V7 DUPLICATE OF V5 COMMENT"' // O (Comment - Ensure quotes are handled)
    ];
    const csvRows: string[] = [csvHeaders.join(',')];

    // Sort by date, then by asset within date
    Array.from(sellSummary.entries())
      .sort((a, b) => {
          const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
          if (isNaN(dateA) || isNaN(dateB)) return a[0].localeCompare(b[0]);
          return dateA - dateB;
      })
      .forEach(([date, summariesOnDate]) => {
        // First add all regular rows
        summariesOnDate
        .sort((a,b) => a.asset.localeCompare(b.asset))
        .forEach((item) => {
          const csvRow = [
            `"${date}"`, // A (Quoted date)
            item.asset, // B
            item.inrPrice > 0 ? item.inrPrice.toFixed(10) : '', // C (Precision 10)
            item.usdtPrice > 0 ? item.usdtPrice.toFixed(10) : '', // D (Precision 10)
            item.coinSoldQty ? item.coinSoldQty.toFixed(10) : '0.0000000000', // E
            item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(10) : '', // F (Precision 10)
            item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(10) : '', // G
            item.usdtPurchaseCostInr ? item.usdtPurchaseCostInr.toFixed(10) : '0.0000000000', // H (Precision 10)
            item.tds > 0 ? item.tds.toFixed(10) : '', // I
            '', // J (Empty)
            item.totalRelevantInrValue ? item.totalRelevantInrValue.toFixed(10) : '0.0000000000', // K (Precision 10)
            item.totalRelevantInrQuantity ? item.totalRelevantInrQuantity.toFixed(10) : '0.0000000000', // L
            '', // M (Empty)
            '', // N (Empty)
            '' // O (No comment needed per row based on sample)
          ].join(',');
          csvRows.push(csvRow);
        });

        // Then add the total row for this date
        const totals = {
          coinSoldQty: summariesOnDate.reduce((sum, item) => sum + (item.coinSoldQty || 0), 0),
          usdtQuantity: summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0),
          usdtPurchaseCostInr: summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0),
          tds: summariesOnDate.reduce((sum, item) => sum + (item.tds || 0), 0),
          totalRelevantInrValue: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrValue || 0), 0),
          totalRelevantInrQuantity: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrQuantity || 0), 0),
        };

        const totalRow = [
          `"${date}"`, // A (Quoted date)
          'Total', // B
          '', // C (No avg price for total)
          '', // D (No avg price for total)
          totals.coinSoldQty.toFixed(10), // E
          totals.usdtQuantity > 0 ? (totals.usdtPurchaseCostInr / totals.usdtQuantity).toFixed(10) : '', // F (USDT Cost Ratio)
          totals.usdtQuantity.toFixed(10), // G
          totals.usdtPurchaseCostInr.toFixed(10), // H
          totals.tds.toFixed(10), // I
          '', // J (Empty)
          totals.totalRelevantInrValue.toFixed(10), // K (Precision 10)
          totals.totalRelevantInrQuantity.toFixed(10), // L
          '', // M (Empty)
          '', // N (Empty)
          '' // O (No comment needed for total)
        ].join(',');
        csvRows.push(totalRow);
        
        // Add a blank row after each date's total for better readability
        csvRows.push('');
      });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sell_summary_v7_client.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

// Function to export V8 summary data to CSV (FIFO)
export const exportV8SummaryToCSV = (version: string, summaryV8: Map<string, AssetSummaryV8[]>) => {
  if (version !== 'v8' || summaryV8.size === 0) return;

  const csvHeaders = [
    'Date', // A
    'Asset', // B
    'FIFO Cost Basis', // C
    'Avg USDT Price', // D
    'Matched Qty', // E
    'USDT Cost (Ratio)', // F
    'USDT Qty (Derived)', // G
    'USDT Cost (INR)', // H
    'TDS', // I
    '', // J (Empty)
    'BUY IN INR', // K
    'QNTY', // L
    'Buy Date & Time', // M (NEW - Buy transaction date and time)
    'Sell Date & Time', // N (NEW - Sell transaction date and time)
    '"V8 FIFO ACCOUNTING"' // O (Comment - Ensure quotes are handled)
  ];
  const csvRows: string[] = [csvHeaders.join(',')];

  // Sort by date, then by asset within date
  Array.from(summaryV8.entries())
    .sort((a, b) => {
        const dateA = new Date(a[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
        const dateB = new Date(b[0].replace(/(\d+)(st|nd|rd|th)/, '$1')).getTime(); 
        if (isNaN(dateA) || isNaN(dateB)) return a[0].localeCompare(b[0]);
        return dateA - dateB;
    })
    .forEach(([date, summariesOnDate]) => {
      // First add individual FIFO match rows
      summariesOnDate
      .sort((a,b) => a.asset.localeCompare(b.asset))
      .forEach((item) => {
        // Add individual FIFO match rows
        item.fifoMatches.forEach((match, matchIndex) => {
          const buyDateStr = formatDateTime(match.buyDate);
          const sellDateStr = formatDateTime(match.sellDate);
          
          const csvRow = [
            `"${date}"`, // A (Quoted date)
            item.asset, // B
            match.costBasis > 0 ? match.costBasis.toFixed(10) : '', // C (Individual FIFO Cost Basis)
            match.sellPrice > 0 ? match.sellPrice.toFixed(10) : '', // D (Individual Sell Price)
            match.matchedQuantity ? match.matchedQuantity.toFixed(10) : '0.0000000000', // E
            match.sellPrice > 0 ? (match.costBasis / match.sellPrice).toFixed(10) : '', // F (Individual Ratio)
            match.sellPrice * match.matchedQuantity > 0 ? (match.sellPrice * match.matchedQuantity).toFixed(10) : '', // G
            match.costBasis * match.matchedQuantity ? (match.costBasis * match.matchedQuantity).toFixed(10) : '0.0000000000', // H
            '', // I (TDS not available per match)
            '', // J (Empty)
            match.costBasis * match.matchedQuantity ? (match.costBasis * match.matchedQuantity).toFixed(10) : '0.0000000000', // K
            match.matchedQuantity ? match.matchedQuantity.toFixed(10) : '0.0000000000', // L
            `"${buyDateStr}"`, // M (Buy Date)
            `"${sellDateStr}"`, // N (Sell Date)
            `"FIFO Match ${matchIndex + 1}"` // O (Comment for individual matches)
          ].join(',');
          csvRows.push(csvRow);
        });

        // Then add the aggregated summary row for this asset
        const csvRow = [
          `"${date}"`, // A (Quoted date)
          item.asset, // B
          item.inrPrice > 0 ? item.inrPrice.toFixed(10) : '', // C (FIFO Cost Basis - Precision 10)
          item.usdtPrice > 0 ? item.usdtPrice.toFixed(10) : '', // D (Precision 10)
          item.coinSoldQty ? item.coinSoldQty.toFixed(10) : '0.0000000000', // E
          item.usdtPurchaseCost > 0 ? item.usdtPurchaseCost.toFixed(10) : '', // F (Precision 10)
          item.usdtQuantity > 0 ? item.usdtQuantity.toFixed(10) : '', // G
          item.usdtPurchaseCostInr ? item.usdtPurchaseCostInr.toFixed(10) : '0.0000000000', // H (Precision 10)
          item.tds > 0 ? item.tds.toFixed(10) : '', // I
          '', // J (Empty)
          item.totalRelevantInrValue ? item.totalRelevantInrValue.toFixed(10) : '0.0000000000', // K (Precision 10)
          item.totalRelevantInrQuantity ? item.totalRelevantInrQuantity.toFixed(10) : '0.0000000000', // L
          '', // M (Empty for summary row)
          '', // N (Empty for summary row)
          '"V8 FIFO Summary"' // O (Comment for summary row)
        ].join(',');
        csvRows.push(csvRow);
      });

      // Then add the total row for this date
      const totals = {
        coinSoldQty: summariesOnDate.reduce((sum, item) => sum + (item.coinSoldQty || 0), 0),
        usdtQuantity: summariesOnDate.reduce((sum, item) => sum + (item.usdtQuantity || 0), 0),
        usdtPurchaseCostInr: summariesOnDate.reduce((sum, item) => sum + (item.usdtPurchaseCostInr || 0), 0),
        tds: summariesOnDate.reduce((sum, item) => sum + (item.tds || 0), 0),
        totalRelevantInrValue: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrValue || 0), 0),
        totalRelevantInrQuantity: summariesOnDate.reduce((sum, item) => sum + (item.totalRelevantInrQuantity || 0), 0),
      };

      const totalRow = [
        `"${date}"`, // A (Quoted date)
        'Total', // B
        '', // C (No avg price for total)
        '', // D (No avg price for total)
        totals.coinSoldQty.toFixed(10), // E
        totals.usdtQuantity > 0 ? (totals.usdtPurchaseCostInr / totals.usdtQuantity).toFixed(10) : '', // F (USDT Cost Ratio)
        totals.usdtQuantity.toFixed(10), // G
        totals.usdtPurchaseCostInr.toFixed(10), // H
        totals.tds.toFixed(10), // I
        '', // J (Empty)
        totals.totalRelevantInrValue.toFixed(10), // K (Precision 10)
        totals.totalRelevantInrQuantity.toFixed(10), // L
        '', // M (Empty for total)
        '', // N (Empty for total)
        '"V8 FIFO Daily Total"' // O (Comment for total)
      ].join(',');
      csvRows.push(totalRow);
      
      // Add a blank row after each date's total for better readability
      csvRows.push('');
    });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fifo_summary_v8_client.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Function to export V10 summary data to CSV (Individual Match Rows Only - No Duplicates)
export const exportV10SummaryToCSV = (summaryV10: Map<string, AssetSummaryV8[]>) => {
  console.log('Starting V10 Chronological FIFO CSV export...');
  
  if (summaryV10.size === 0) {
    console.log('No V10 data to export');
    return;
  }

  // CSV Headers (15 columns - same as V8 but with V10 comment)
  const csvHeaders = [
    'Date', // A
    'Asset', // B
    'FIFO Cost Basis', // C
    'USDT Price', // D
    'Matched Qty', // E
    'USDT Cost (Ratio)', // F
    'USDT Qty (Derived)', // G
    'USDT Cost (INR)', // H
    'TDS', // I
    '', // J (Empty)
    'BUY IN INR', // K
    'QNTY', // L
    'Buy Date & Time', // M
    'Sell Date & Time', // N
    '"V10 CHRONOLOGICAL FIFO"' // O (Comment)
  ];
  const csvRows: string[] = [csvHeaders.join(',')];

  // Sort by date, then by asset within date
  Array.from(summaryV10.entries())
    .sort((a, b) => {
        const dateA = new Date(a[0]).getTime();
        const dateB = new Date(b[0]).getTime();
        return dateA - dateB;
    })
    .forEach(([date, summariesOnDate]) => {
      // V10: ONLY individual FIFO match rows (no summary duplicates)
      summariesOnDate
      .sort((a,b) => a.asset.localeCompare(b.asset))
      .forEach((item) => {
        // Each item has exactly one FIFO match (no aggregation in V10)
        item.fifoMatches.forEach((match) => {
          const buyDateStr = formatDateTime(match.buyDate);
          const sellDateStr = formatDateTime(match.sellDate);
          
          const csvRow = [
            `"${date}"`, // A (Quoted date)
            item.asset, // B
            match.costBasis > 0 ? match.costBasis.toFixed(10) : '', // C (Individual FIFO Cost Basis)
            match.sellPrice > 0 ? match.sellPrice.toFixed(10) : '', // D (Individual Sell Price)
            match.matchedQuantity ? match.matchedQuantity.toFixed(10) : '0.0000000000', // E
            match.sellPrice > 0 ? (match.costBasis / match.sellPrice).toFixed(10) : '', // F (Individual Ratio)
            match.sellPrice * match.matchedQuantity > 0 ? (match.sellPrice * match.matchedQuantity).toFixed(10) : '', // G
            match.costBasis * match.matchedQuantity ? (match.costBasis * match.matchedQuantity).toFixed(10) : '0.0000000000', // H
            item.tds > 0 ? item.tds.toFixed(10) : '', // I (TDS from sell transaction)
            '', // J (Empty)
            match.costBasis * match.matchedQuantity ? (match.costBasis * match.matchedQuantity).toFixed(10) : '0.0000000000', // K
            match.matchedQuantity ? match.matchedQuantity.toFixed(10) : '0.0000000000', // L
            `"${buyDateStr}"`, // M (Buy Date)
            `"${sellDateStr}"`, // N (Sell Date)
            `"V10 Chronological FIFO Match"` // O (Comment for individual matches)
          ].join(',');
          csvRows.push(csvRow);
        });
      });
    });

  // Calculate and add daily totals
  const dailyTotals = new Map<string, {
    totalRelevantInrValue: number;
    totalRelevantInrQuantity: number;
    totalUsdtQuantity: number;
    totalUsdtPurchaseCostInr: number;
  }>();

  Array.from(summaryV10.entries()).forEach(([date, summariesOnDate]) => {
    const totals = summariesOnDate.reduce((acc, item) => ({
      totalRelevantInrValue: acc.totalRelevantInrValue + (item.totalRelevantInrValue || 0),
      totalRelevantInrQuantity: acc.totalRelevantInrQuantity + (item.totalRelevantInrQuantity || 0),
      totalUsdtQuantity: acc.totalUsdtQuantity + (item.usdtQuantity || 0),
      totalUsdtPurchaseCostInr: acc.totalUsdtPurchaseCostInr + (item.usdtPurchaseCostInr || 0)
    }), {
      totalRelevantInrValue: 0,
      totalRelevantInrQuantity: 0,
      totalUsdtQuantity: 0,
      totalUsdtPurchaseCostInr: 0
    });
    
    dailyTotals.set(date, totals);
  });

  // Add daily total rows
  Array.from(dailyTotals.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .forEach(([date, totals]) => {
      const totalRow = [
        `"${date}"`, // A (Quoted date)
        'TOTAL', // B
        '', // C (Empty for total)
        '', // D (Empty for total)
        totals.totalRelevantInrQuantity.toFixed(10), // E
        '', // F (Empty for total)
        totals.totalUsdtQuantity.toFixed(10), // G
        totals.totalUsdtPurchaseCostInr.toFixed(10), // H
        '', // I (Empty for total)
        '', // J (Empty)
        totals.totalRelevantInrValue.toFixed(10), // K (Precision 10)
        totals.totalRelevantInrQuantity.toFixed(10), // L
        '', // M (Empty for total)
        '', // N (Empty for total)
        '"V10 Chronological FIFO Daily Total"' // O (Comment for total)
      ].join(',');
      csvRows.push(totalRow);
      
      // Add empty row after each day's total for readability
      csvRows.push(',,,,,,,,,,,,,,,');
    });

  // Create CSV content
  const csvContent = csvRows.join('\n');
  
  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `chronological_fifo_summary_v10_client.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log('✓ V10 Chronological FIFO Summary CSV download complete');
};

// Function to export V8 skipped trades to CSV
export const exportSkippedTradesV8ToCSV = (skippedItems: Map<string, AssetSummaryV8[]>) => {
  if (skippedItems.size === 0) return;

  const csvHeaders = [
    'Date',
    'Asset',
    'FIFO Cost Basis',
    'Avg USDT Price',
    'Total Qty',
    'USDT Qty',
    'TDS',
    'Total INR Value',
    'Total INR Qty'
  ];
  const csvRows: string[] = [csvHeaders.join(',')];

  Array.from(skippedItems.entries()).forEach(([, summaries]) => {
    summaries.forEach(summary => {
      const csvRow = [
        `"${summary.displayDate}"`,
        summary.asset,
        summary.inrPrice.toFixed(2),
        summary.usdtPrice.toFixed(2),
        summary.coinSoldQty.toFixed(8),
        summary.usdtQuantity.toFixed(2),
        summary.tds.toFixed(2),
        summary.totalRelevantInrValue.toFixed(2),
        summary.totalRelevantInrQuantity.toFixed(8)
      ].join(',');
      csvRows.push(csvRow);
    });
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `skipped_trades_v8_fifo.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};