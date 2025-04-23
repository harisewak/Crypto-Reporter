# Crypto Trading Summary

A web application that processes and analyzes cryptocurrency trading data from Excel files. The application calculates important metrics like USDT Range and Units for crypto assets traded between INR and USDT pairs.

## Features

- Excel file upload and parsing
- Automatic matching of INR buys with USDT sells
- Calculation of USDT Range and Units
- Handling of quantity mismatches
- Detailed transaction summary
- Raw data display

## Technologies Used

- React
- TypeScript
- Material-UI
- XLSX library for Excel processing
- Vite for development and building

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:5173 in your browser

## Usage

1. Click the "Upload Excel File" button
2. Select your Excel file containing trading data
3. The application will automatically:
   - Parse the Excel data
   - Match INR buys with USDT sells
   - Calculate USDT Range and Units
   - Display the summary and raw data

## Data Format

The Excel file should contain the following columns:
- Symbol (e.g., ZILIINR, ZILIUSDT)
- Side (INR or USDT)
- Price
- Quantity

## License

MIT

## Development Summary (Recent V2 Updates)

The application recently underwent significant updates to handle a revised data format (Version 2) and calculation logic:

-   **V2 Data Handling**: Introduced logic (`processTransactionsV2`) to parse a new Excel format, extracting additional fields like `Trade_Completion_time` and `TDS amount`.
-   **Date Conversion**: Implemented robust conversion from Excel serial date numbers to standard JavaScript Date objects, displaying the latest USDT sell date for each asset summary.
-   **Revised Calculations**: Refined the V2 summary calculations based on specific user requirements:
    -   `Coin Sold Qty`: Now represents a derived quantity based on total INR spent and the INR/USDT price ratio.
    -   `USDT Purchase Cost`: Represents the effective INR-to-USDT conversion rate achieved (`Avg INR Price / Avg USDT Price`).
-   **Debugging & Deployment**: Utilized console logging for step-by-step diagnostics and iterative deployment via GitHub Pages to troubleshoot and verify changes.
