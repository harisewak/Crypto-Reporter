import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { execSync } from 'child_process' // Import execSync

// Get current timestamp in UTC ISO 8601 format
const buildTimestamp = execSync("date -u '+%Y-%m-%dT%H:%M:%SZ'").toString().trim();

// Get Git commit hash
const gitCommitHash = execSync('git rev-parse --short HEAD').toString().trim();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Crypto-Reporter/', // Set base path for GitHub Pages
  define: {
    // Define environment variables to be replaced during build
    // Ensure the values are stringified
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(gitCommitHash),
  }
})
