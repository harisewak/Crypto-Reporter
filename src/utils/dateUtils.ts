// Function to convert Excel serial date number to JavaScript Date object
export function excelSerialDateToJSDate(serial: number): Date | null {
    if (isNaN(serial) || serial <= 0) return null;
    
    // Excel serial date starts from 1 representing 1900-01-01 (or 1904-01-01 on Mac)
    // JavaScript Date epoch starts from 1970-01-01
    // There's also a leap year bug in Excel for 1900
    const excelEpochDiff = 25569; // Days between 1970-01-01 and 1900-01-01 (adjusting for leap year bug)
    const millisecondsPerDay = 86400 * 1000;
    
    // Handle both date and time components
    const totalMilliseconds = (serial - excelEpochDiff) * millisecondsPerDay;
    
    // Basic validation for plausible date range (e.g., after year 1950)
    const jsDate = new Date(totalMilliseconds);
    if (jsDate.getFullYear() < 1950 || jsDate.getFullYear() > 2100) {
        console.warn(`Unusual date generated from serial ${serial}: ${jsDate.toISOString()}`);
        // Handle potential epoch differences or invalid serials more robustly if needed
    }
    return jsDate;
}
  
  // Function to format Date object to '25th April, 2025'
  export function formatDate(date: Date | null): string {
    if (!date) return 'Invalid Date';
  
    // Use UTC methods
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[date.getUTCMonth()]; // Use UTC month
  
    let daySuffix = 'th';
    if (day === 1 || day === 21 || day === 31) {
      daySuffix = 'st';
    } else if (day === 2 || day === 22) {
      daySuffix = 'nd';
    } else if (day === 3 || day === 23) {
      daySuffix = 'rd';
    }
  
    return `${day}${daySuffix} ${monthName}, ${year}`;
  }
  
  // Function to format Date object to '25th April, 2025 HH:MM:SS'
  export function formatDateTime(date: Date | null): string {
    if (!date) return 'Invalid Date';
  
    const datePart = formatDate(date); // Reuse existing UTC date formatting
  
    // Use UTC methods
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const timePart = `${hours}:${minutes}:${seconds}`;
  
    return `${datePart} ${timePart}`;
  }