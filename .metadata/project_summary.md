# Project Summary

**Purpose:** Analyze crypto trading data from Excel files, specifically focusing on INR/USDT pairs to calculate key trading metrics.
**Tech Stack:** React, TypeScript, Material-UI, Vite, XLSX.

**Getting Started:**
1. Install dependencies: `npm install`
2. Run development server: `npm run dev` (Access via http://localhost:5173)

**Core Workflow & Usage:**
1. User uploads an Excel file via the UI ("Upload Excel File" button).
2. Application parses the Excel data.
3. Matches INR buy orders with corresponding USDT sell orders for the same asset.
4. Calculates metrics (e.g., USDT Range, Units, USDT Purchase Cost) based on the selected processing version.
5. Displays a summary table, individual asset summaries (including latest transaction date), and the raw parsed data.

**Processing Versions (v1 & v2):**
The application supports two distinct processing logic versions selectable in the UI.
- **v1:** Original processing logic.
- **v2 (`processTransactionsV2` in `src/App.tsx`):** Handles a revised data format, extracting additional fields like `Trade_Completion_time` and `TDS amount`. It includes robust Excel date serial number conversion and displays the latest USDT sell date. V2 features revised summary calculations:
    - `Coin Sold Qty`: Derived based on total INR spent and the INR/USDT price ratio.
    - `USDT Purchase Cost`: Effective INR-to-USDT rate (`Avg INR Price / Avg USDT Price`).

**Main Logic Location:** Primarily located in `src/App.tsx`.
**React Entry Point:** `src/main.tsx`. 