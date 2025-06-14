import { Box, Button, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';

interface FileUploadProps {
  version: string;
  handleVersionChange: (event: SelectChangeEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileUpload = ({ version, handleVersionChange, handleFileUpload }: FileUploadProps) => {
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
          <MenuItem value="v1">Version 1</MenuItem>
          <MenuItem value="v2">Version 2 (Original)</MenuItem>
          <MenuItem value="v3">Version 3 (Daily)</MenuItem>
          <MenuItem value="v4">Version 4 (Client)</MenuItem>
          <MenuItem value="v5">Version 5 (Client Dup)</MenuItem>
          <MenuItem value="v6">Version 6 (Client Dup)</MenuItem>
          <MenuItem value="v7">Version 7 (Higlight Unmatched)</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}; 