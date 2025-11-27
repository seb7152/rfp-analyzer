// Test script to debug export configuration
const XLSX = require("xlsx");

// Simulate your configuration
const configDetails = {
  start_row: 3,
  include_headers: true,
  column_mappings: [
    { column: "B", field: "requirement_code", header_name: "Exigence" },
    { column: "C", field: "requirement_title", header_name: "Titre" },
    { column: "D", field: "requirement_weight", header_name: "Poid" },
    { column: "E", field: "manual_score", header_name: "Note" },
    { column: "F", field: "manual_comment", header_name: "Commentaire" },
  ],
};

// Create a simple worksheet
const workbook = XLSX.utils.book_new();
const worksheet = {};

// MODE 2: Simple Insertion
const startRow = (configDetails.start_row || 2) - 1; // Convert to 0-based
console.log("Start row (0-based):", startRow);
console.log("Start row (Excel):", startRow + 1);

let currentRow = startRow;

// Add headers if requested
if (configDetails.include_headers !== false) {
  console.log(
    "Writing headers at row:",
    currentRow,
    "(Excel row:",
    currentRow + 1,
    ")"
  );

  configDetails.column_mappings.forEach((mapping) => {
    const columnIndex = mapping.column.charCodeAt(0) - 65;
    const headerValue = mapping.header_name || mapping.column;

    const headerCellAddress = XLSX.utils.encode_cell({
      r: currentRow,
      c: columnIndex,
    });

    console.log(
      `  Writing header "${headerValue}" to cell ${headerCellAddress}`
    );
    worksheet[headerCellAddress] = { v: headerValue, t: "s" };
  });
  currentRow++;
}

// Add some sample data
const sampleData = [
  { B: "REQ-001", C: "Title 1", D: 3.5, E: 4, F: "Comment 1" },
  { B: "REQ-002", C: "Title 2", D: 2.5, E: 3, F: "Comment 2" },
];

console.log(
  "\nWriting data starting at row:",
  currentRow,
  "(Excel row:",
  currentRow + 1,
  ")"
);

sampleData.forEach((dataRow, idx) => {
  console.log(`  Row ${idx + 1}:`, dataRow);

  configDetails.column_mappings.forEach((mapping) => {
    const columnIndex = mapping.column.charCodeAt(0) - 65;
    const cellValue = dataRow[mapping.column] || "";

    const cellAddress = XLSX.utils.encode_cell({
      r: currentRow,
      c: columnIndex,
    });

    worksheet[cellAddress] = { v: cellValue, t: "s" };
  });
  currentRow++;
});

// Update worksheet range
const lastDataRow = currentRow - 1;
const lastDataCol = Math.max(
  ...configDetails.column_mappings.map((m) => m.column.charCodeAt(0) - 65)
);

worksheet["!ref"] = XLSX.utils.encode_range({
  s: { r: 0, c: 0 },
  e: { r: lastDataRow, c: lastDataCol },
});

console.log("\nWorksheet range:", worksheet["!ref"]);
console.log("\nWorksheet cells:");
Object.keys(worksheet)
  .filter((k) => k !== "!ref")
  .forEach((key) => {
    console.log(`  ${key}: "${worksheet[key].v}"`);
  });

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, "Test");

// Write to file
XLSX.writeFile(
  workbook,
  "/Users/seb7152/Documents/RFP analyzer/RFP-Analyer/test-export.xlsx"
);

console.log("\nTest file written to: test-export.xlsx");
console.log("Open it to verify headers are in row 3 and data starts in row 4");
