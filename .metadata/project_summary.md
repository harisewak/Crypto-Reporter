# Project Summary

**Purpose:** Analyze crypto trading data from Excel files, supporting both buy and sell scenarios with comprehensive trading metrics and P&L analysis.
**Tech Stack:** React, TypeScript, Material-UI, Vite, XLSX. (See [Code Structure](mdc:.metadata/code_structure.md) for details on file organization).

**Getting Started:**
1. Install dependencies: `npm install`
2. Run development server: `npm run dev` (Access via http://localhost:5173)

**Core Workflow & Usage:**
The application now supports three main tabs for different trading scenarios:

### **Buy Tab (Tab 0):**
- **Purpose:** Analyze buy transactions (Buy in INR → Sell in USDT)
- **Data Format:** Excel file with columns:
  - `Symbol`: Trading pair (e.g., `ZILIINR`, `ZILIUSDT`)
  - `Side`: Transaction side (`BUY`/`SELL`)
  - `Price`: Price per unit
  - `Quantity`: Amount traded
  - `Total`: Total cost (optional)
  - `TDS`: Tax Deducted at Source (optional)

### **Sell Tab (Tab 1):**
- **Purpose:** Analyze sell transactions (Buy in Stablecoin → Sell in INR)
- **Data Format:** Same Excel format as Buy tab
- **Processing:** Uses the new `processSellTransactions` processor
- **Features:** 
  - Supports multiple stablecoins (USDT, USDC, DAI, etc.)
  - Daily aggregation based on sell dates
  - Comprehensive metrics for reverse trading pattern
  - **Client-compatible export format** matching v7 structure

### **P&L Tab (Tab 2):**
- **Purpose:** Profit & Loss analysis (Coming soon)
- **Features:** Will provide comprehensive trading performance metrics

**Application Flow:**
1. User selects the appropriate tab (Buy/Sell/P&L)
2. User uploads an Excel file via the UI ("Upload Excel File" button)
3. Application parses the Excel data and processes it based on the active tab
4. For Buy tab: Matches INR buy orders with corresponding USDT sell orders
5. For Sell tab: Matches stablecoin buy orders with corresponding INR sell orders
6. Calculates metrics based on the selected processing version
7. Displays summary tables, individual asset summaries, and raw parsed data
8. Supports dark/light theme persistence via `localStorage`

**Project Structure:**
- `src/processors/`: Contains all processing logic implementations
  - `v1.ts`: Original processing logic (Buy scenario)
  - `v3.ts`: Daily aggregation with simplified/proportional matching (Buy scenario)
  - `v4.ts`: Client-specific format with daily aggregation (Buy scenario)
  - `v5.ts`: Client duplicate format (same as v4) (Buy scenario)
  - `v6.ts`: FIFO matching implementation (Buy scenario)
  - `v7.ts`: Daily matching strategy (Buy scenario)
  - `v8.ts`: **NEW** - Advanced FIFO accounting with detailed match tracking (Buy scenario)
  - `sell.ts`: **NEW** - Sell processor for reverse trading pattern (Buy in Stablecoin → Sell in INR)
- `src/utils/`: Utility functions
  - `exportUtils.ts`: Data export functionality
  - `dateUtils.ts`: Date handling utilities
- `src/types/`: TypeScript type definitions
- `src/exports/`: Export-related functionality
- `src/components/summary/`: Summary display components
  - `SummaryV8.tsx`: **NEW** - V8 FIFO summary component with detailed match visualization
- `src/App.tsx`: Main application component with tab-based processing logic
- `src/main.tsx`: React entry point
- `src/theme.ts`: Theme configuration for Material-UI
- `src/index.css`: Global styles
- `src/App.css`: App component specific styles
- `src/assets/`: Static assets
- `vite.config.ts`: Build configuration
- `tsconfig.*.json`: TypeScript configuration files
- `deploy_script.sh`: Deployment script for GitHub Pages that:
  - Builds the project using `npm run build`
  - Deploys to GitHub Pages using `npm run deploy`
  - Provides deployment status and live site URL
  - Handles build and deployment failures gracefully

**Processing Versions:**

### **Buy Processing Versions:**
The application supports eight distinct processing logic versions for buy scenarios, selectable in the UI:

- **v1:** Original processing logic.
- **v2 (Original):** Aggregates all trades for an asset pair, displaying a single summary row using the latest USDT sell date.
- **v3 (Daily):** Aggregates trades per asset *per day* (based on USDT sell date). Supports 'Simplified' and 'Proportional' matching strategies. Includes robust Excel date handling (using UTC for consistency) and TDS calculation.
- **v4 (Client Specific):** Designed for a specific client output format. Aggregates trades per asset *per day* based on the USDT sell date.
    - **Stablecoin Handling:** For stablecoins (e.g., USDT), only the USDT Price (column D) is calculated, while other metrics are set to 0 or left empty.
    - **Columns A-L:** Detailed metrics including dates, prices, quantities, and costs. See [Data Format](mdc:.metadata/data_format.md) for complete details.
- **v5 (Client Dup):** A direct duplicate of v4, maintaining the same daily aggregation logic and output format.
- **v6 (FIFO Matching):** Implements First-In, First-Out matching logic:
    - **Buy Selection:** Considers all buy transactions up to the sell date, sorted chronologically
    - **Quantity Matching:** Handles full and partial matches with prorated values
    - **Profit/Loss:** Calculated based on matched quantities
    - **TDS Handling:** Accumulated from matched sell transactions
    - **Daily Summary:** Includes metrics like average prices, profit/loss, and TDS
- **v7 (Daily Matching):** Implements same-day matching strategy:
    - **Daily Processing:** Matches buys and sells occurring on the same day
    - **Stablecoin Handling:** Special handling for stablecoins
    - **Metrics:** Comprehensive daily metrics including prices, quantities, and costs
    - **Skipped Trades:** Tracks and displays unmatched trades
    - **UI Features:** Enhanced visualization and export capabilities
- **v8 (FIFO Accounting):** **NEW** - Advanced FIFO accounting with comprehensive match tracking:
    - **FIFO Queue Management:** Maintains chronological buy order queue for each asset
    - **Detailed Match Tracking:** Records individual FIFO matches with cost basis, sell price, and P&L
    - **Weighted Average Cost Basis:** Calculates FIFO-weighted average cost basis from matched quantities
    - **Comprehensive Metrics:** Includes all v7 metrics plus detailed FIFO match breakdown
    - **Enhanced UI:** Expandable accordion view showing individual FIFO matches and P&L calculations
    - **Export Format:** Client-compatible 15-column structure with FIFO-specific data
    - **Precision:** 10 decimal places for all numeric values in exports
    - **File Naming:** `fifo_summary_v8_client.csv` for consistency

### **Sell Processing:**
- **NEW Sell Processor:** Implements reverse trading pattern analysis:
    - **Trading Pattern:** Buy in Stablecoin (USDT/USDC/DAI) → Sell in INR
    - **Daily Processing:** Matches stablecoin buys and INR sells occurring on the same day
    - **Stablecoin Support:** Handles multiple stablecoins (USDT, USDC, DAI, FDUSD, BUSD, TUSD, etc.)
    - **Metrics:** Comprehensive daily metrics including:
      - INR Price (average sell price in INR)
      - USDT Price (average buy price in stablecoin)
      - Coin Sold Qty (quantity sold in INR)
      - USDT Purchase Cost (ratio calculation: H / G)
      - USDT Quantity (derived: D × E, i.e., Avg USDT Price × Matched Qty)
      - USDT Cost (INR) (**sum of INR received from INR sell trades**)
      - TDS (Tax Deducted at Source)
      - Total Relevant INR Value (stablecoin purchase value)
      - Total Relevant INR Quantity (stablecoin purchase quantity)
    - **Error Handling:** Comprehensive logging and skipped trades tracking
    - **Data Format:** Uses same Excel format as buy processors for consistency
    - **Export Format:** **Client-compatible 15-column structure** matching v7 format:
      - **Columns A-O:** Complete client format with empty column J, M, N and comment in column O
      - **Precision:** 10 decimal places for all numeric values
      - **Total Rows:** Daily totals with proper calculations
      - **File Naming:** `sell_summary_v7_client.csv` for consistency

**Tab-Based Processing Logic:**
- **Smart Processing:** Application automatically selects the appropriate processor based on the active tab
- **Buy Tab (Tab 0):** Uses buy processors (v1-v8) for INR buy → USDT sell analysis
- **Sell Tab (Tab 1):** Uses sell processor for stablecoin buy → INR sell analysis
- **Error Prevention:** Eliminates cross-tab processing errors by isolating processor selection

**Data Export:**
- Supports exporting processed data to Excel format
- Includes date-based sorting options
- Handles both summary and skipped trades data
- Maintains consistent formatting across exports
- Works for both buy and sell scenarios
- **Client Format Compliance:** Both v7, v8, and sell exports use identical 15-column structure with empty column J

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