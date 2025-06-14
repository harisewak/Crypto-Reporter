import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
} from '@mui/material';
import { formatDateTime } from '../../utils/dateUtils';
import { excelSerialDateToJSDate } from '../../utils/dateUtils';

interface RawTransactionDataProps {
  data: any[][];
  headers: string[];
  page: number;
  rowsPerPage: number;
  onPageChange: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RawTransactionData: React.FC<RawTransactionDataProps> = ({
  data,
  headers,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  if (data.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Raw Transaction Data ({data.length} Rows)
      </Typography>
      <TableContainer component={Paper} elevation={3} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {headers.map((header, index) => (
                <TableCell key={index} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, rowIndex) => (
                <TableRow
                  key={page * rowsPerPage + rowIndex}
                  sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}
                >
                  {row.map((cell: any, colIndex: number) => {
                    if (colIndex === 2) {
                      const dateNum = parseFloat(cell);
                      if (!isNaN(dateNum)) {
                        const jsDate = excelSerialDateToJSDate(dateNum);
                        return <TableCell key={colIndex}>{formatDateTime(jsDate)}</TableCell>;
                      }
                    }
                    return <TableCell key={colIndex}>{cell}</TableCell>;
                  })}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100, 250, 500, { label: 'All', value: data.length }]}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </Box>
  );
}; 