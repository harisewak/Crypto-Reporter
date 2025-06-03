# Project Summary

**Purpose:** Analyze crypto trading data from Excel files, specifically focusing on INR/USDT pairs to calculate key trading metrics.
**Tech Stack:** React, TypeScript, Material-UI, Vite, XLSX. (See [Code Structure](mdc:.metadata/code_structure.md) for details on file organization).

**Getting Started:**
1. Install dependencies: `npm install`
2. Run development server: `npm run dev` (Access via http://localhost:5173)

**Core Workflow & Usage:**
1. User uploads an Excel file via the UI ("Upload Excel File" button). The expected format is detailed in [Data Format](mdc:.metadata/data_format.md).
2. Application parses the Excel data.
3. Matches INR buy orders with corresponding USDT sell orders for the same asset.
4. Calculates metrics (e.g., USDT Range, Units, USDT Purchase Cost) based on the selected processing version.
5. Displays a summary table (with pagination), individual asset summaries (including latest transaction date), and the raw parsed data.
6. Supports dark/light theme persistence via `localStorage`.

**Processing Versions (v1, v2, v3, v4, v5, v6 & v7):**
The application supports seven distinct processing logic versions selectable in the UI.
- **v1:** Original processing logic.
- **v2 (Original):** Aggregates all trades for an asset pair, displaying a single summary row using the latest USDT sell date.
- **v3 (Daily) (`processTransactionsV3` in `src/App.tsx`):** Aggregates trades per asset *per day* (based on USDT sell date). Supports 'Simplified' and 'Proportional' matching strategies. Includes robust Excel date handling (using UTC for consistency) and TDS calculation.
- **v4 (Client Specific) (`processTransactionsV4` in `src/App.tsx`):** Designed for a specific client output format. Aggregates trades per asset *per day* based on the USDT sell date.
    - **Stablecoin Handling:** For stablecoins (e.g., USDT), only the USDT Price (column D) is calculated, while other metrics (Avg INR Price, USDT Cost, etc.) are set to 0 or left empty as they are not applicable for stablecoin trades.
    - **A (Date):** The date of the USDT sell transaction(s).
    - **B (Asset):** The crypto asset.
    - **C (Avg INR Price):** Calculated as `K (BUY IN INR) / L (QNTY)` for the specific day. Represents the average price of INR buy transactions *for that day only*.
    - **D (Avg USDT Price):** Calculated as `G (USDT Qty Derived) / E (Matched Qty)`. Represents an effective INR/USDT exchange rate for the USDT sell transactions *on that day*, based on the 'total' column (column 7, typically `fnet_inr`) from the input file.
    - **E (Matched Qty):** Total quantity of the asset sold in USDT transactions *on that day*.
    - **F (USDT Cost (Ratio)):** Calculated as `H (USDT Cost INR) / G (USDT Qty Derived)`.
    - **G (USDT Qty Derived):** Sum of the 'total' column (column 7, typically `fnet_inr`, representing INR value) from USDT sell transactions *on that day*.
    - **H (USDT Cost (INR)):** Calculated as `E (Matched Qty) * C (Avg INR Price for the day)`. Represents the cost (in INR, using the day's average INR buy price) of acquiring the quantity of coins sold that day.
    - **I (TDS):** Sum of TDS from USDT sell transactions *on that day*.
    - **K (BUY IN INR):** Sum of 'total' (or `price*quantity` if total is invalid) from INR buy transactions *for that specific day only*.
    - **L (QNTY):** Sum of `quantity` from INR buy transactions *for that specific day only*.
- **v5 (Client Dup) (`processTransactionsV5` in `src/App.tsx`):** A direct duplicate of v4. Designed for a specific client output format or testing purposes, maintaining the same daily aggregation logic and output format as v4. Aggregates trades per asset *per day* based on the USDT sell date.
    - **Stablecoin Handling:** Same as v4.
    - **A (Date):** Same as v4.
    - **B (Asset):** Same as v4.
    - **C (Avg INR Price):** Same as v4.
    - **D (Avg USDT Price):** Same as v4.
    - **E (Matched Qty):** Same as v4.
    - **F (USDT Cost (Ratio)):** Same as v4.
    - **G (USDT Qty Derived):** Same as v4.
    - **H (USDT Cost (INR)):** Same as v4.
    - **I (TDS):** Same as v4.
    - **K (BUY IN INR):** Same as v4.
    - **L (QNTY):** Same as v4.
- **v6 (FIFO Matching) (`processTransactionsV6` in `src/App.tsx`):** Implements First-In, First-Out (FIFO) matching logic for buys and sells to calculate profit/loss and other metrics on a daily basis per asset.
    - **Buy Selection:** Considers all buy transactions up to the date of the sell transaction, sorted chronologically.
    - **Quantity Matching:** Accurately handles both full and partial matches between sell and buy quantities. Values are prorated for partial matches.
    - **Profit/Loss Calculation:** Calculated based on the quantities matched, using prorated buy costs against sell revenues.
    - **TDS Handling:** TDS is accumulated from all matched sell transactions.
    - **Daily Summary:** Provides a summary for each asset per day, including metrics like average buy price, average sell price, total profit/loss, and total TDS for matched transactions.
    - **Unmatched Sells:** Logs warnings for any sell quantities that could not be matched with corresponding buys.
- **v7 (Daily Matching) (`processTransactionsV7` in `src/App.tsx`):** Implements a daily matching strategy that processes trades on a day-by-day basis, focusing on same-day matches between buys and sells.
    - **Daily Processing:** Processes trades by matching buys and sells that occur on the same day.
    - **Stablecoin Handling:** Special handling for stablecoins (USDT, USDC, DAI) with direct INR trading pairs.
    - **Metrics Calculation:**
        - **A (Date):** The date of the transactions.
        - **B (Asset):** The crypto asset.
        - **C (Avg INR Price):** Average price of INR buy transactions for the day.
        - **D (Avg USDT Price):** Average price of USDT sell transactions for the day.
        - **E (Matched Qty):** Total quantity of the asset sold in USDT transactions for the day.
        - **F (USDT Cost Ratio):** Ratio of USDT cost to derived quantity.
        - **G (USDT Qty Derived):** Total USDT value of sell transactions for the day.
        - **H (USDT Cost INR):** Cost in INR for the matched quantity.
        - **I (TDS):** Total TDS for the day's transactions.
        - **K (BUY IN INR):** Total INR value of buy transactions for the day.
        - **L (QNTY):** Total quantity of buy transactions for the day.
    - **Error Handling:** Improved error handling and validation for transaction data.
    - **Logging:** Enhanced logging for debugging and tracking transaction processing.
    - **Skipped Trades:** Tracks and displays trades that couldn't be matched on the same day, with a dedicated section showing:
        - Date and asset information
        - Average INR and USDT prices
        - Total quantities and values
        - TDS information
        - Export functionality for skipped trades data
    - **UI Improvements:**
        - Consistent download icons across summary and skipped trades sections
        - Clear visual separation between matched and skipped trades
        - Sortable date columns for better data organization

**Main Logic Location:** Primarily located in `src/App.tsx`. See [Code Structure](mdc:.metadata/code_structure.md) for more details on where specific parts of the application reside.
**React Entry Point:** `src/main.tsx`.

**Deployment (GitHub Pages):**
1. Ensure `vite.config.ts` has the correct `base` path (e.g., `/Repo-Name/`).
2. Run the deployment script:
   ```bash
   ./deploy_script.sh
   ```
   This script will:
   - Build the project
   - Deploy to GitHub Pages
   - Show deployment status and URL
   - Handle basic error cases 