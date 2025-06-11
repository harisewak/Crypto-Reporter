# Project Summary

**Purpose:** Analyze crypto trading data from Excel files, specifically focusing on INR/USDT pairs to calculate key trading metrics.
**Tech Stack:** React, TypeScript, Material-UI, Vite, XLSX. (See [Code Structure](mdc:.metadata/code_structure.md) for details on file organization).

**Getting Started:**
1. Install dependencies: `npm install`
2. Run development server: `npm run dev` (Access via http://localhost:5173)

**Core Workflow & Usage:**
1. User uploads an Excel file via the UI ("Upload Excel File" button). The expected format requires the following columns:
   - `Symbol`: Trading pair (e.g., `ZILIINR`, `ZILIUSDT`)
   - `Side`: Transaction side (`INR` for buy, `USDT` for sell)
   - `Price`: Price per unit
   - `Quantity`: Amount traded
2. Application parses the Excel data.
3. Matches INR buy orders with corresponding USDT sell orders for the same asset.
4. Calculates metrics based on the selected processing version.
5. Displays a summary table (with pagination), individual asset summaries (including latest transaction date), and the raw parsed data.
6. Supports dark/light theme persistence via `localStorage`.

**Project Structure:**
- `src/processors/`: Contains all processing logic implementations
  - `v1.ts`: Original processing logic
  - `v3.ts`: Daily aggregation with simplified/proportional matching
  - `v4.ts`: Client-specific format with daily aggregation
  - `v5.ts`: Client duplicate format (same as v4)
  - `v6.ts`: FIFO matching implementation
  - `v7.ts`: Daily matching strategy
- `src/utils/`: Utility functions
  - `exportUtils.ts`: Data export functionality
  - `dateUtils.ts`: Date handling utilities
- `src/types/`: TypeScript type definitions
- `src/exports/`: Export-related functionality
- `src/App.tsx`: Main application component containing all UI components and state management
- `src/main.tsx`: React entry point
- `src/theme.ts`: Theme configuration for Material-UI
- `src/index.css`: Global styles
- `src/App.css`: App component specific styles
- `src/assets/`: Static assets
- `vite.config.ts`: Build configuration
- `tsconfig.*.json`: TypeScript configuration files

**Processing Versions:**
The application supports seven distinct processing logic versions selectable in the UI, each implemented in its own file under `src/processors/`:

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

**Data Export:**
- Supports exporting processed data to Excel format
- Includes date-based sorting options
- Handles both summary and skipped trades data
- Maintains consistent formatting across exports

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