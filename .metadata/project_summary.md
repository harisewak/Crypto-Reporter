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

**Processing Versions (v1, v2, v3 & v4):**
The application supports four distinct processing logic versions selectable in the UI.
- **v1:** Original processing logic.
- **v2 (Original):** Aggregates all trades for an asset pair, displaying a single summary row using the latest USDT sell date.
- **v3 (Daily) (`processTransactionsV3` in `src/App.tsx`):** Aggregates trades per asset *per day* (based on USDT sell date). Supports 'Simplified' and 'Proportional' matching strategies. Includes robust Excel date handling (using UTC for consistency) and TDS calculation.
- **v4 (Client Specific) (`processTransactionsV4` in `src/App.tsx`):** Designed for a specific client output format. Aggregates trades per asset *per day* based on the USDT sell date.
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

**Main Logic Location:** Primarily located in `src/App.tsx`. See [Code Structure](mdc:.metadata/code_structure.md) for more details on where specific parts of the application reside.
**React Entry Point:** `src/main.tsx`.

**Deployment (GitHub Pages):**
1. Ensure `vite.config.ts` has the correct `base` path (e.g., `/Repo-Name/`).
2. Run the deployment script:
   ```bash
   npm run deploy
   ```
   This command builds the project and pushes the `dist` folder to the `gh-pages` branch. 