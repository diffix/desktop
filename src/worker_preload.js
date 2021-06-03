import { ipcRenderer, contextBridge } from "electron";
import { parseCsv, toFrontendTable } from "./compiled/CsvProvider";
import { anonymize } from "./compiled/Anonymizer";

let parsedData;

ipcRenderer.on("anonymize", (event, columns) => {
  console.log("Starting anonymization");
  const result = anonymize(parsedData, columns);
  console.log("Anonymization complete");
  ipcRenderer.send("forwardToFrontend_anonymizedResult", result);
});

ipcRenderer.on("loadedFile", (event, csvContent) => {
  console.log("Got loaded file content");
  console.log("Parsing frontend table");
  parsedData = parseCsv(csvContent, ",");
  console.log("Creating frontend table");
  const frontendTable = toFrontendTable(parsedData);
  console.log("Returning parsed table");
  ipcRenderer.send("forwardToFrontend_frontendTable", frontendTable);
});