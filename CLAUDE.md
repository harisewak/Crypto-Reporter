# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (access at http://localhost:5173)
- **Build**: `npm run build` (uses TypeScript compiler + Vite)
- **Lint**: `npm run lint` (ESLint with TypeScript support)
- **Preview**: `npm run preview` (preview production build)
- **Deploy**: `npm run deploy` (deploys to GitHub Pages via gh-pages)

## Architecture Overview

This is a React + TypeScript crypto trading data analyzer with three main processing modes:

### Core Application Structure
- **Tab-based interface**: Buy (Tab 0), Sell (Tab 1), P&L (Tab 2)
- **Processing versions**: Multiple algorithms (v1-v10) for different matching strategies
- **Excel file processing**: Uses `xlsx` library to parse trading data
- **FIFO accounting**: Advanced implementations with detailed match tracking

### Key Directories
- `src/processors/`: Contains 10+ processing algorithms for different matching strategies
- `src/components/summary/`: Display components for each processing version
- `src/types/index.ts`: Comprehensive TypeScript interfaces for all data structures
- `src/utils/`: Date handling and export utilities

### Processing Logic Flow
1. User uploads Excel file with columns: Symbol, Side, Price, Quantity, Total (optional), TDS (optional)
2. App parses Excel data and filters by transaction type (buy/sell)
3. Selected processor version applies matching algorithm (FIFO, daily matching, etc.)
4. Results displayed in summary tables with export capabilities

### Data Structures
- **Transaction**: Raw parsed trading data with date handling
- **AssetSummaryV1-V9**: Different summary formats for each processor version
- **FIFOQueue**: Advanced queue management for FIFO accounting (v8-v10)
- **SellMatch**: Individual transaction matching records

### Processing Versions
- **v1-v3**: Basic matching algorithms
- **v4-v7**: Client-specific formats with daily aggregation
- **v8-v10**: Advanced FIFO accounting with detailed match tracking and performance optimizations
- **Sell processor**: Reverse trading pattern (stablecoin → INR)

### State Management
- React useState for all application state
- localStorage persistence for theme and version preferences
- Tab-based processing isolation to prevent cross-contamination

### Export Features
- Client-compatible 15-column CSV format
- Individual FIFO match rows and summary aggregation
- Date-based sorting options
- Precision formatting (10 decimal places)

## Development Notes

- Uses Material-UI for consistent theming (light/dark mode)
- Nodemon configured for hot reloading during development
- Excel date handling uses custom utilities in `dateUtils.ts`
- Large dataset optimization with IndexedDB (v9) and progress indicators
- TypeScript strict mode enabled across all configuration files