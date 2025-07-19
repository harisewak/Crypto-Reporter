import { Box, Button, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';

interface FileUploadProps {
  version: string;
  handleVersionChange: (event: SelectChangeEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeTab: number;
}

export const FileUpload = ({ version, handleVersionChange, handleFileUpload, activeTab }: FileUploadProps) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
      <Button
        variant="contained"
        component="label"
      >
        Upload Excel File
        <input
          type="file"
          hidden
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
        />
      </Button>
      
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel id="version-select-label">Version</InputLabel>
        <Select
          labelId="version-select-label"
          value={version}
          label="Version"
          onChange={handleVersionChange}
        >
          {activeTab === 0 ? (
            // Buy versions
            [
              <MenuItem key="v1" value="v1">Version 1</MenuItem>,
              <MenuItem key="v2" value="v2">Version 2 (Original)</MenuItem>,
              <MenuItem key="v3" value="v3">Version 3 (Daily)</MenuItem>,
              <MenuItem key="v4" value="v4">Version 4 (Client)</MenuItem>,
              <MenuItem key="v5" value="v5">Version 5 (Client Dup)</MenuItem>,
              <MenuItem key="v6" value="v6">Version 6 (Client Dup)</MenuItem>,
              <MenuItem key="v7" value="v7">Version 7 (Higlight Unmatched)</MenuItem>,
              <MenuItem key="v8" value="v8">Version 8 (FIFO Accounting)</MenuItem>,
              <MenuItem key="v9" value="v9">Version 9 (Optimized FIFO)</MenuItem>
            ]
          ) : (
            // Sell versions
            <MenuItem value="v1">Version 1</MenuItem>
          )}
        </Select>
      </FormControl>
    </Box>
  );
}; 