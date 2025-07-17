"use client";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileSpreadsheet, Upload } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import Papa from "papaparse";
import axios from "axios";

// Supported import categories
type ImportCategory = "companies" | "ports" | "containers";

// Import status type
type ImportStatus = "idle" | "processing" | "success" | "error";

// Empty CSV template headers for companies
const companyCSVHeaders = [
  "Company Name",
  "Business Type",
  "Address",
  "Phone",
  "Email",
  "Website",
  "Credit Terms",
  "Credit Limit",
  "remarks",
  "Country",
  "Status"
];

// Empty CSV template headers for ports based on screenshot
const portCSVHeaders = [
  "PORT_Code",
  "PORT_Name",
  "PORT_LONG",
  "Country -Full",
  "Country -short",
  "Port Type",
  "Parent Port"
];

// Empty CSV template headers for containers based on Excel template format
const containerCSVHeaders = [
  "ID",
  "Container Number",
  "Container Category", 
  "Container Type",
  "Container Size",
  "Container Class",
  "Capacity",
  "Manufacturer",
  "Build Year",
  "Gross Weight",
  "Tare Weight",
  "Ownership",
  "LEASE REF",
  "LEASE RENTAL",
  "OWNERSHIP",
  "On-Hire Date",
  "Onhire Location",
  "On Hire DEPOT ID",
  "Off-Hire Date",
  "Lease Rent Per Day",
  "remarks",
  "Inspection Date",
  "Inspection Type",
  "Next Due Date",
  "Certificate",
  "Report Date",
  "Report Document"
];

// Simple file upload component
const FileUploadArea = ({
  onFileChange,
  selectedFile,
  isUploading
}: {
  onFileChange: (file: File | null) => void;
  selectedFile: File | null;
  isUploading: boolean;
}) => {
  return (
    <div className="border border-dashed rounded-md p-4 text-center border-gray-300 mt-4">
      {!selectedFile ? (
        <div>
          <FileSpreadsheet className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            Select your filled CSV file to import
          </p>
          <input
            type="file"
            accept=".csv"
            id="file-upload"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileChange(file);
            }}
            disabled={isUploading}
          />
          <div className="mt-3">
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
            >
              Select CSV File
            </label>
          </div>
        </div>
      ) : (
        <div className="py-2">
          <FileSpreadsheet className="mx-auto h-6 w-6 text-green-500 mb-2" />
          <p className="font-medium text-gray-800">{selectedFile.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {`${(selectedFile.size / 1024).toFixed(2)} KB`}
          </p>
          <button 
            onClick={() => onFileChange(null)} 
            className="text-xs text-red-500 underline mt-2 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

// Main DataImportTable component
const DataImportTable = () => {
  const [selectedCategory, setSelectedCategory] = useState<ImportCategory>("companies");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Handle downloading empty template CSV with just headers
  const handleDownloadEmptyTemplate = () => {
    setIsDownloading(true);
    
    setTimeout(() => {
      if (selectedCategory === "companies") {
        // Create an empty template with just the headers
        const csv = Papa.unparse({
          fields: companyCSVHeaders,
          data: []
        });
        
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", "company_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Template downloaded successfully");
      } else if (selectedCategory === "ports") {
        // Create an empty template for ports with just the headers
        const csv = Papa.unparse({
          fields: portCSVHeaders,
          data: []
        });
        
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", "port_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Port template downloaded successfully");
      } else if (selectedCategory === "containers") {
        // Create an empty template for containers with just the headers
        const csv = Papa.unparse({
          fields: containerCSVHeaders,
          data: []
        });
        
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", "container_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Container template downloaded successfully");
      } else {
        toast.error(`Template download for ${selectedCategory} is not yet available.`);
      }
      setIsDownloading(false);
    }, 300);
  };

  // Map CSV header to API field
  const mapHeaderToField = (header: string) => {
    const fieldMap: Record<string, string> = {
      "Company Name": "companyName",
      "Business Type": "businessType",
      "Address": "address",
      "Phone": "phone",
      "Email": "email",
      "Website": "website",
      "Credit Terms": "creditTerms",
      "Credit Limit": "creditLimit",
      "remarks": "remarks",
      "Country": "countryName", // This will be mapped to countryId later
      "Status": "status"
    };
    
    return fieldMap[header] || header;
  };

  // Validate a single row of CSV data
  const validateCompanyRow = (row: Record<string, string>): string | null => {
    // Required fields for company import
    const requiredFields = ["Company Name", "Country"];
    
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === "") {
        return `Missing required field: ${field}`;
      }
    }
    
    // Validate email format if provided
    if (row["Email"] && !/^\S+@\S+\.\S+$/.test(row["Email"])) {
      return "Invalid email format";
    }
    
    // Just make sure website isn't too long - accept any format
    if (row["Website"] && row["Website"].trim().length > 500) {
      return "Website URL is too long (max 500 characters)";
    }
    
    return null; // No validation errors
  };

  // Map port CSV header to API field
  const mapPortHeaderToField = (header: string) => {
    const portFieldMap: Record<string, string> = {
      "PORT_Code": "portCode",
      "PORT_Name": "portName",
      "PORT_LONG": "portLongName",
      "Country -Full": "countryName", // This will be mapped to countryId later
      "Country -short": "countryCode", // This will be used for reference/validation
      "Port Type": "portType",
      "Parent Port": "parentPortName" // This will be mapped to parentPortId later
    };
    
    return portFieldMap[header] || header;
  };

  // Validate a single row of port CSV data
  const validatePortRow = (row: Record<string, string>): string | null => {
    // Required fields for port import
    const requiredFields = ["PORT_Code", "PORT_Name", "PORT_LONG", "Country -Full", "Port Type"];
    
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === "") {
        return `Missing required field: ${field}`;
      }
    }
    
    // Validate port type is valid - case insensitive comparison
    const portType = row["Port Type"].trim().toUpperCase();
    if (portType !== "MAIN" && portType !== "ICD") {
      return `Invalid Port Type: ${row["Port Type"]}. Must be either "Main" or "ICD"`;
    }
    
    // If port type is ICD, parent port is required
    if (portType === "ICD" && (!row["Parent Port"] || row["Parent Port"].trim() === "")) {
      return "Parent Port is required for ICD port types";
    }
    
    return null; // No validation errors
  };

  // Map container CSV header to API field based on Excel template headers
  const mapContainerHeaderToField = (header: string) => {
    const containerFieldMap: Record<string, string> = {
      "ID": "id",
      "Container Number": "containerNumber",
      "Container Category": "containerCategory",
      "Container Type": "containerType",
      "Container Size": "containerSize",
      "Container Class": "containerClass",
      "Capacity": "containerCapacity",
      "Manufacturer": "manufacturer",
      "Build Year": "buildYear",
      "Gross Weight": "grossWeight",
      "Tare Weight": "tareWeight",
      "Ownership": "ownership",
      "LEASE REF": "leasingRefNo",
      "LEASE RENTAL": "leaseRentPerDay",
      "OWNERSHIP": "ownership",
      "On-Hire Date": "onHireDate",
      "Onhire Location": "onHireLocation",
      "On Hire DEPOT ID": "onHireDepotId",
      "Off-Hire Date": "offHireDate",
      "Lease Rent Per Day": "leaseRentPerDay",
      "remarks": "remarks",
      "Inspection Date": "inspectionDate",
      "Inspection Type": "inspectionType",
      "Next Due Date": "nextDueDate",
      "Certificate": "certificate",
      "Report Date": "reportDate",
      "Report Document": "reportDocument"
    };
    
    return containerFieldMap[header] || header;
  };

  // Validate a single row of container CSV data
  const validateContainerRow = (row: Record<string, string>): string | null => {
    // Required fields for container import based on Excel template headers
    const requiredFields = ["Container Number", "Container Category", "Container Type", "Container Class"];
    
    for (const field of requiredFields) {
      if (!row[field] || row[field].trim() === "") {
        return `Missing required field: ${field}`;
      }
    }
    
    // Validate container number format
    const containerNumber = row["Container Number"].trim();
    if (containerNumber.length < 3) {
      return `Invalid container number: ${containerNumber}. Must be at least 3 characters.`;
    }
    
    // Validate container category
    const category = row["Container Category"].trim();
    if (!["Tank", "Dry", "Refrigerated"].includes(category)) {
      return `Invalid Container Category: ${category}. Must be "Tank", "Dry", or "Refrigerated"`;
    }
    
    // Validate ownership type if provided - case sensitive as in the system
    if (row["Ownership"] && row["Ownership"].trim() !== "") {
      const ownership = row["Ownership"].trim();
      if (ownership !== "OWN" && ownership !== "LEASED") {
        return `Invalid Ownership: ${ownership}. Must be either "Own" or "Leased"`;
      }
      
      // All fields are now optional for both Own and Leased containers
      // No required validation for lease fields - they are all optional
    }
    
    // Validate capacity is a number if provided (optional)
    if (row["Capacity"] && row["Capacity"].trim() !== "") {
      const capacity = parseFloat(row["Capacity"].trim().replace(/,/g, ''));
      if (isNaN(capacity)) {
        return `Invalid Capacity: ${row["Capacity"]}. Must be a number.`;
      }
    }
    
    // Validate weights are numbers if provided (optional)
    if (row["Gross Weight"] && row["Gross Weight"].trim() !== "") {
      const grossWeight = parseFloat(row["Gross Weight"].trim().replace(/,/g, ''));
      if (isNaN(grossWeight)) {
        return `Invalid Gross Weight: ${row["Gross Weight"]}. Must be a number.`;
      }
    }
    
    if (row["Tare Weight"] && row["Tare Weight"].trim() !== "") {
      const tareWeight = parseFloat(row["Tare Weight"].trim().replace(/,/g, ''));
      if (isNaN(tareWeight)) {
        return `Invalid Tare Weight: ${row["Tare Weight"]}. Must be a number.`;
      }
    }
    
    // Validate dates if provided (all optional now)
    const dateFields = ["On-Hire Date", "Off-Hire Date", "Inspection Date", "Next Due Date", "Report Date"];
    for (const field of dateFields) {
      if (row[field] && row[field].trim() !== "") {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{2}-\d{2}-\d{4}$/; 
        if (!dateRegex.test(row[field].trim())) {
          return `Invalid date format for ${field}: ${row[field]}. Use formats like YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, DD-MMM-YY (18-Sep-24), or DD-MMM-YYYY.`;
        }
      }
    }
    
    return null; // No validation errors
  };

  // Process and upload the CSV file
  const handleProcessCSV = async () => {
    if (!selectedFile) return;
    
    if (selectedCategory !== "companies" && selectedCategory !== "ports" && selectedCategory !== "containers") {
      toast.error(`Import for ${selectedCategory} is not yet available.`);
      return;
    }

    setImportStatus("processing");
    setImportStats({ success: 0, failed: 0 });
    setErrorMessages([]);
    
    // Parse the CSV file
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          setImportStatus("error");
          setErrorMessages(results.errors.map(err => `CSV parsing error: ${err.message} at row ${err.row}`));
          return;
        }
        
        const data = results.data as Record<string, string>[];
        
        // Check if the CSV is empty
        if (data.length === 0) {
          setImportStatus("error");
          setErrorMessages(["The CSV file is empty or contains no valid data"]);
          return;
        }

        if (selectedCategory === "companies") {
          await processCompanyImport(data);
        } else if (selectedCategory === "ports") {
          await processPortImport(data);
        } else if (selectedCategory === "containers") {
          await processContainerImport(data);
        }
      },
      error: (error) => {
        setImportStatus("error");
        setErrorMessages([`Failed to parse CSV: ${error.message}`]);
      }
    });
  };

  // Process company import data
  const processCompanyImport = async (data: Record<string, string>[]) => {
    // Check if the CSV has the required headers
    const requiredHeaders = ["Company Name", "Country"];
    const headers = Object.keys(data[0]);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      setImportStatus("error");
      setErrorMessages([`Missing required headers: ${missingHeaders.join(", ")}`]);
      return;
    }
    
    const successCount = { value: 0 };
    const failedCount = { value: 0 };
    const errors: string[] = [];
    
    try {
      // Fetch all countries to map country names to IDs
      const countriesResponse = await axios.get("http://128.199.19.28:8000/country");
      const countries = countriesResponse.data;
      
      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Validate the row
          const validationError = validateCompanyRow(row);
          if (validationError) {
            throw new Error(validationError);
          }
          
          // Create a payload for the addressbook API
          const payload: Record<string, any> = {
            refId: "", // Will be auto-generated by the backend
            bankDetails: [],
            businessPorts: [],
            contacts: []
          };
          
          // Map each CSV field to its API equivalent
          Object.keys(row).forEach(header => {
            if (row[header] && row[header].trim() !== "") {
              const field = mapHeaderToField(header);
              if (field !== header) { // if we have a mapping
                payload[field] = row[header].trim();
              }
            }
          });
          
          // Set default status if not provided
          if (!payload.status) {
            payload.status = "Active";
          }
          
          // Convert credit limit to string
          if (payload.creditLimit) {
            // Handle any format and convert to a simple string
            const cleanedLimit = payload.creditLimit.replace(/[^0-9.]/g, '');
            payload.creditLimit = cleanedLimit || "0";
          } else {
            payload.creditLimit = "0";
          }
          
          // Map country name to country ID
          if (payload.countryName) {
            // Case-insensitive search with trimming
            const country = countries.find(
              (c: any) => c.countryName.toLowerCase().trim() === payload.countryName.toLowerCase().trim()
            );
            
            if (country) {
              payload.countryId = country.id;
              delete payload.countryName;
            } else {
              throw new Error(`Country not found: ${payload.countryName}. Please check the country name matches exactly with a country in the system.`);
            }
          } else {
            throw new Error(`Country is required and was not provided.`);
          }
          
          // Submit to API
          await axios.post("http://128.199.19.28:8000/addressbook", payload);
          successCount.value++;
        } catch (error: any) {
          failedCount.value++;
          const errorMessage = error.response?.data?.message || error.message;
          errors.push(`Row ${i+1}: ${errorMessage}`);
        }
      }
      
      // Update statistics
      setImportStats({ 
        success: successCount.value, 
        failed: failedCount.value 
      });
      setErrorMessages(errors);
      
      if (errors.length > 0 && successCount.value === 0) {
        setImportStatus("error");
      } else if (errors.length > 0) {
        setImportStatus("success"); // Partial success
        toast.success(`${successCount.value} companies imported with ${errors.length} errors`);
      } else {
        setImportStatus("success");
        toast.success(`${successCount.value} companies imported successfully`);
      }
    } catch (error: any) {
      setImportStatus("error");
      setErrorMessages([`General error: ${error.message}`]);
    }
  };

  // Process port import data
  const processPortImport = async (data: Record<string, string>[]) => {
    // Check if the CSV has the required headers
    const requiredHeaders = ["PORT_Code", "PORT_Name", "PORT_LONG", "Country -Full", "Port Type"];
    const headers = Object.keys(data[0]);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      setImportStatus("error");
      setErrorMessages([`Missing required headers: ${missingHeaders.join(", ")}`]);
      return;
    }
    
    const successCount = { value: 0 };
    const failedCount = { value: 0 };
    const errors: string[] = [];
    
    try {
      // Fetch all countries to map country names to IDs
      const countriesResponse = await axios.get("http://128.199.19.28:8000/country");
      const countries = countriesResponse.data;
      
      // Fetch all ports to map parent port names to IDs
      const portsResponse = await axios.get("http://128.199.19.28:8000/ports");
      const ports = portsResponse.data;
      
      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Validate the row
          const validationError = validatePortRow(row);
          if (validationError) {
            throw new Error(validationError);
          }
          
          // Create a payload for the ports API
          const payload: Record<string, any> = {
            status: "Active" // Default status
          };
          
          // Map each CSV field to its API equivalent
          Object.keys(row).forEach(header => {
            if (row[header] && row[header].trim() !== "") {
              const field = mapPortHeaderToField(header);
              if (field !== header) { // if we have a mapping
                payload[field] = row[header].trim();
              }
            }
          });
          
          // Map country name to country ID
          if (payload.countryName) {
            // Case-insensitive search with trimming
            const country = countries.find(
              (c: any) => c.countryName.toLowerCase().trim() === payload.countryName.toLowerCase().trim()
            );
            
            if (country) {
              payload.countryId = country.id;
              payload.currencyId = country.currencyId; // Get currency ID from the country
              delete payload.countryName;
              delete payload.countryCode; // We don't need this in the payload
            } else {
              throw new Error(`Country not found: ${payload.countryName}. Please check the country name matches exactly with a country in the system.`);
            }
          } else {
            throw new Error(`Country is required and was not provided.`);
          }
          
          // Normalize port type to match expected format
          if (payload.portType) {
            // Convert to title case for consistent format (e.g., "MAIN" → "Main", "icd" → "ICD")
            if (payload.portType.toUpperCase() === "MAIN") {
              payload.portType = "Main";
            } else if (payload.portType.toUpperCase() === "ICD") {
              payload.portType = "ICD";
            }
          }
          
          // Map parent port name to parent port ID if provided
          if (payload.parentPortName && payload.portType === "ICD") {
            // Try to find port by exact name or code
            let parentPort = ports.find(
              (p: any) => p.portName.toLowerCase().trim() === payload.parentPortName.toLowerCase().trim() ||
                          p.portCode.toLowerCase().trim() === payload.parentPortName.toLowerCase().trim()
            );
            
            if (parentPort) {
              payload.parentPortId = parentPort.id;
              delete payload.parentPortName;
            } else {
              throw new Error(`Parent Port not found: ${payload.parentPortName}. Please check the port name or code matches exactly with a port in the system.`);
            }
          }
          
          delete payload.parentPortName; // Remove this field even if not used
          
          // Submit to API
          await axios.post("http://128.199.19.28:8000/ports", payload);
          successCount.value++;
        } catch (error: any) {
          failedCount.value++;
          const errorMessage = error.response?.data?.message || error.message;
          errors.push(`Row ${i+1}: ${errorMessage}`);
        }
      }
      
      // Update statistics
      setImportStats({ 
        success: successCount.value, 
        failed: failedCount.value 
      });
      setErrorMessages(errors);
      
      if (errors.length > 0 && successCount.value === 0) {
        setImportStatus("error");
      } else if (errors.length > 0) {
        setImportStatus("success"); // Partial success
        toast.success(`${successCount.value} ports imported with ${errors.length} errors`);
      } else {
        setImportStatus("success");
        toast.success(`${successCount.value} ports imported successfully`);
      }
    } catch (error: any) {
      setImportStatus("error");
      setErrorMessages([`General error: ${error.message}`]);
    }
  };

  // Process container import data
  const processContainerImport = async (data: Record<string, string>[]) => {
    // Check if the CSV has the required headers based on Excel template headers
    const requiredHeaders = ["Container Number", "Container Category", "Container Type", "Container Class"];
    const headers = Object.keys(data[0]);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      setImportStatus("error");
      setErrorMessages([`Missing required headers: ${missingHeaders.join(", ")}`]);
      return;
    }
    
    const successCount = { value: 0 };
    const failedCount = { value: 0 };
    const errors: string[] = [];
    
    try {
      // Fetch all address book entries to map names to IDs
      const addressBookResponse = await axios.get("http://128.199.19.28:8000/addressbook");
      const addressBookEntries = addressBookResponse.data;
      
      // Fetch all ports to map port names to IDs
      const portsResponse = await axios.get("http://128.199.19.28:8000/ports");
      const portsEntries = portsResponse.data;
      
      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Validate the row
          const validationError = validateContainerRow(row);
          if (validationError) {
            throw new Error(validationError);
          }
          
          // Step 1: Create a payload for the inventory API using Excel template field names
          const inventoryPayload: Record<string, any> = {
            containerCategory: row["Container Category"]?.trim() || "Tank", // Use CSV value or default to Tank
            status: "Active", // Default status
            containerNumber: row["Container Number"].trim(),
            containerType: row["Container Type"].trim(),
            containerSize: row["Container Size"]?.trim() || "20TK", // Default size if not provided
            containerClass: row["Container Class"].trim(),
            containerCapacity: row["Capacity"]?.trim() || "",
            capacityUnit: "MTN", // Default capacity unit
            manufacturer: row["Manufacturer"]?.trim() || "",
            buildYear: row["Build Year"]?.trim() || "",
            grossWeight: (row["Gross Wt"] && String(row["Gross Wt"]).trim() !== "") ? String(row["Gross Wt"]).trim() : "",
            tareWeight: (row["Tare Wt"] && String(row["Tare Wt"]).trim() !== "") ? String(row["Tare Wt"]).trim() : "",
            InitialSurveyDate: "", // Not in Excel template, leave empty
            ownership: row["Ownership"]?.trim() || ""
          };
          
          
          // Step 2: Submit to inventory API and get the ID
          const inventoryResponse = await axios.post("http://128.199.19.28:8000/inventory", inventoryPayload);
          const inventoryId = inventoryResponse.data.id;
          
          // Debug: Log the response to see if gross/tare weights were saved
          console.log(`Inventory created with ID ${inventoryId}. Response data:`, inventoryResponse.data);
          
          // For "Own" containers, create a leasing info record with ownership type "Own"
          if (row["Ownership"] && row["Ownership"].trim() === "Own") {
      
            // Find depot ID from address book - be more flexible with matching
            let depotId = null;
            if (row["On Hire DEPOT ID"] && row["On Hire DEPOT ID"].trim() !== "") {
              // If it's a number, use it directly as ID
              if (!isNaN(Number(row["On Hire DEPOT ID"].trim()))) {
                depotId = Number(row["On Hire DEPOT ID"].trim());
                console.log(`Using depot ID: ${depotId}`);
              } else {
                // Otherwise try to find by name
                const depot = addressBookEntries.find(
                  (a: any) => a.companyName.toLowerCase().trim() === row["On Hire DEPOT ID"].toLowerCase().trim()
                );
                if (depot) {
                  depotId = depot.id;
                  console.log(`Found depot by name: ${depot.companyName} (ID: ${depot.id})`);
                } else {
                  console.warn(`Depot not found: ${row["On Hire DEPOT ID"]}`);
                }
              }
            }
            
            // If depot not found by name, try to find any depot terminal
            if (!depotId) {
              const depotEntries = addressBookEntries.filter((a: any) => 
                a.businessType && (
                  a.businessType.toLowerCase().includes("depot") || 
                  a.businessType.toLowerCase().includes("terminal") ||
                  a.businessType.toLowerCase().includes("deport") // Handle typo in business type
                )
              );
              
              if (depotEntries.length > 0) {
                depotId = depotEntries[0].id;
                console.log(`Using fallback depot: ${depotEntries[0].companyName} (ID: ${depotId})`);
              }
            }
            
            // Find port ID based on "Onhire Location"
            let portId = null;
            if (row["Onhire Location"] && row["Onhire Location"].trim() !== "") {
              const port = portsEntries.find(
                (p: any) => p.portName.toLowerCase().trim() === row["Onhire Location"].toLowerCase().trim()
              );
              if (port) {
                portId = port.id;
                console.log(`Found port by name: ${port.portName} (ID: ${port.id})`);
              } else {
                console.warn(`Port not found: ${row["Onhire Location"]}`);
              }
            }
            
            // If port not found by name, use the first available port as fallback
            if (!portId && portsEntries.length > 0) {
              portId = portsEntries[0].id;
              console.log(`Using fallback port: ${portsEntries[0].portName} (ID: ${portId})`);
            }
            
            // Ensure we have both depot and port (use fallbacks if necessary)
            if (!depotId) {
              console.warn(`No depot found for Own container ${row["Container Number"]}. Skipping leasing info creation.`);
              // Skip leasing info creation if no depot found
            } else if (!portId) {
              console.warn(`No port found for Own container ${row["Container Number"]}. Skipping leasing info creation.`);
              // Skip leasing info creation if no port found
            } else {
            const ownLeasingPayload = {
              inventoryId: inventoryId,
              ownershipType: "Own",
              leasingRefNo: `OWN-${row["Container Number"].trim()}`, // Generate reference for Own containers
              leaseRentPerDay: "0", // No rent for owned containers
              leasoraddressbookId: depotId, // Use depot as leasor for "Own" containers
              onHireDepotaddressbookId: depotId,
              portId: portId,
              onHireDate: row["On-Hire Date"] && row["On-Hire Date"].trim() !== "" ? formatDate(row["On-Hire Date"].trim()) : null, // Make optional
              offHireDate: row["Off-Hire Date"]?.trim() ? formatDate(row["Off-Hire Date"].trim()) : null,
              remarks: row["remarks"]?.trim() || ""
            };
              
              console.log(`Creating leasing info for Own container:`, ownLeasingPayload);
              
              // Submit to leasing info API
              await axios.post("http://128.199.19.28:8000/leasinginfo", ownLeasingPayload);
              console.log(`Successfully created leasing info for Own container ${row["Container Number"]}`);
            } // Close the else block for Own container leasing creation
          } // Close the if block for Own ownership
          
          // If leased, create leasing info record using LEASE RENTAL as lease rent amount
          if (row["Ownership"] && row["Ownership"].trim() === "LEASED") {
            console.log(`Processing Leased container: ${row["Container Number"]}`);
            
            // Check if we have minimum required data for leasing info
            const hasOnHireDate = row["On-Hire Date"] && row["On-Hire Date"].trim() !== "";
            
            if (!hasOnHireDate) {
              console.warn(`Skipping leasing info for Leased container ${row["Container Number"]} - no on-hire date provided`);
              // Continue without creating leasing info - just create the inventory record
            } else {
              // Find port ID for leasing info (required field)
              let portId = null;
              if (row["Onhire Location"] && row["Onhire Location"].trim() !== "") {
                const port = portsEntries.find(
                  (p: any) => p.portName.toLowerCase().trim() === row["Onhire Location"].toLowerCase().trim()
                );
                portId = port?.id;
              }
              
              if (!portId) {
                console.warn(`Port not found for location: ${row["Onhire Location"]}. Using default port.`);
                portId = portsEntries.length > 0 ? portsEntries[0].id : 1; // Use first available port or default
              }
              
              // Find depot ID from address book (required field)
              let depotId = null;
              if (row["On Hire DEPOT ID"] && row["On Hire DEPOT ID"].trim() !== "") {
                // If it's a number, use it directly as ID
                if (!isNaN(Number(row["On Hire DEPOT ID"].trim()))) {
                  depotId = Number(row["On Hire DEPOT ID"].trim());
                } else {
                  // Otherwise try to find by company name
                  const depot = addressBookEntries.find(
                    (a: any) => a.companyName.toLowerCase().trim() === row["On Hire DEPOT ID"].toLowerCase().trim()
                  );
                  if (depot) {
                    depotId = depot.id;
                  }
                }
              }
              
              // If no depot found, use the first available depot as fallback (required field)
              if (!depotId && addressBookEntries.length > 0) {
                depotId = addressBookEntries[0].id;
                console.warn(`No depot specified for Leased container ${row["Container Number"]}. Using fallback depot: ${addressBookEntries[0].companyName}`);
              }
              
              // For leasor, we'll use the same depot as fallback since we don't have leasor identification in the CSV
              const leasorId = depotId; // Use depot as leasor fallback since it's required
              
              if (depotId && leasorId && portId) {
                const leasedLeasingPayload = {
                  inventoryId: inventoryId,
                  ownershipType: "LEASED",
                  leasingRefNo: row["LEASE REF"]?.trim() || `LEASE-${row["Container Number"].trim()}`, // Use LEASE REF as reference
                  leasoraddressbookId: leasorId, // Required - use depot as fallback
                  onHireDepotaddressbookId: depotId, // Required
                  portId: portId, // Required field
                  onHireDate: formatDate(row["On-Hire Date"].trim()), // Required - we already checked it exists
                  offHireDate: row["Off-Hire Date"]?.trim() ? formatDate(row["Off-Hire Date"].trim()) : null,
                  leaseRentPerDay: row["LEASE RENTAL"]?.trim() || "0", // Use LEASE RENTAL as the lease rent per day
                  remarks: row["remarks"]?.trim() || `Imported leased container - LEASE REF: ${row["LEASE REF"]?.trim() || "N/A"}, LEASE RENTAL: ${row["LEASE RENTAL"]?.trim() || "N/A"}`
                };
                
                console.log(`Creating leasing info for Leased container:`, leasedLeasingPayload);
                
                try {
                  // Submit to leasing info API
                  await axios.post("http://128.199.19.28:8000/leasinginfo", leasedLeasingPayload);
                  console.log(`Successfully created leasing info for Leased container ${row["Container Number"]}`);
                  
                  // Create on-hire report
                  try {
                    const onHireReportPayload = {
                      inventoryId: inventoryId,
                      reportDate: formatDate(row["On-Hire Date"].trim())
                    };
                    
                    // Submit to on-hire report API
                    await axios.post("http://128.199.19.28:8000/onhirereport", onHireReportPayload);
                  } catch (reportError: any) {
                    console.warn(`On-hire report creation failed for row ${i+1}: ${reportError.message}`);
                    // We don't fail the whole import for this, just log a warning
                  }
                } catch (leasingError: any) {
                  console.warn(`Leasing info creation failed for Leased container ${row["Container Number"]}: ${leasingError.message}`);
                  // We don't fail the whole import for this, just log a warning
                }
              } else {
                console.warn(`Skipping leasing info for Leased container ${row["Container Number"]} - missing required data (depot: ${depotId}, leasor: ${leasorId}, port: ${portId})`);
              }
            }
          }
          
          // If inspection date and type are provided, create tank certificate using Excel headers
          if (row["Inspection Date"] && row["Inspection Date"].trim() !== "") {
            const certificatePayload = {
              inventoryId: inventoryId,
              inspectionDate: formatDate(row["Inspection Date"].trim()),
              inspectionType: row["Inspection Type"]?.trim() || "Periodic 2.5Yr", // Use Inspection Type from Excel
              nextDueDate: row["Next Due Date"]?.trim() ? formatDate(row["Next Due Date"].trim()) : ""
            };
            
            // Submit to tank certificate API
            await axios.post("http://128.199.19.28:8000/tankcertificate", certificatePayload);
          }
          
          successCount.value++;
        } catch (error: any) {
          failedCount.value++;
          let errorMessage = error.response?.data?.message || error.message || "Unknown error";
          
          // Make error messages more user-friendly
          if (errorMessage.includes("duplicate key") && errorMessage.includes("containerNumber")) {
            errorMessage = `Container number ${row["Container Number"]} already exists in the system`;
          } else if (errorMessage.includes("foreign key constraint")) {
            errorMessage = `Referenced entity not found. Please check your data references.`;
          }
          
          errors.push(`Row ${i+1}: ${errorMessage}`);
        }
      }
      
      // Update statistics
      setImportStats({ 
        success: successCount.value, 
        failed: failedCount.value 
      });
      setErrorMessages(errors);
      
      if (errors.length > 0 && successCount.value === 0) {
        setImportStatus("error");
      } else if (errors.length > 0) {
        setImportStatus("success"); // Partial success
        toast.success(`${successCount.value} containers imported with ${errors.length} errors`);
      } else {
        setImportStatus("success");
        toast.success(`${successCount.value} containers imported successfully`);
      }
    } catch (error: any) {
      setImportStatus("error");
      setErrorMessages([`General error: ${error.message}`]);
    }
  };

  // Helper function to format dates consistently for API
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    
    // Try to parse various date formats
    let date: Date | null = null;
    
    // Try MM/DD/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/');
      date = new Date(`${year}-${month}-${day}`);
    } 
    // Try YYYY-MM-DD format
    else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      date = new Date(dateStr);
    }
    // Try DD-MM-YYYY format
    else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      date = new Date(`${year}-${month}-${day}`);
    }
    // Try dates with periods DD.MM.YYYY
    else if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('.');
      date = new Date(`${year}-${month}-${day}`);
    }
    // Try DD-MMM-YY format (like 18-Sep-24)
    else if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(dateStr)) {
      const [day, monthStr, year] = dateStr.split('-');
      const monthMap: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const month = monthMap[monthStr];
      if (month) {
        const fullYear = parseInt(year) + 2000; // Convert 24 to 2024
        date = new Date(`${fullYear}-${month}-${day.padStart(2, '0')}`);
      }
    }
    // Try DD-MMM-YYYY format (like 18-Sep-2024)
    else if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
      const [day, monthStr, year] = dateStr.split('-');
      const monthMap: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      const month = monthMap[monthStr];
      if (month) {
        date = new Date(`${year}-${month}-${day.padStart(2, '0')}`);
      }
    }
    
    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
    }
    
    // Last resort - try to let JavaScript parse it
    try {
      const fallbackDate = new Date(dateStr);
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.toISOString().split('T')[0];
      }
    } catch (e) {
      // Failed to parse
    }
    
    return dateStr; // Return original if parsing fails
  };

  // Reset the import process
  const handleReset = () => {
    setSelectedFile(null);
    setImportStatus("idle");
    setImportStats({ success: 0, failed: 0 });
    setErrorMessages([]);
  };

  return (
    <div className="container mx-auto py-6">
      <Toaster position="top-center" toastOptions={{
        success: { duration: 3000, style: { background: '#10B981', color: 'white' } },
        error: { duration: 4000, style: { background: '#EF4444', color: 'white' } },
      }} />
      <h1 className="text-2xl font-bold mb-6">Data Import</h1>
      
      <Tabs defaultValue="companies" onValueChange={(value) => setSelectedCategory(value as ImportCategory)}>
        <TabsList className="mb-4">
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="ports">Ports</TabsTrigger>
          <TabsTrigger value="containers">Containers</TabsTrigger>
        </TabsList>
        
        {/* Companies Import */}
        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Import Companies</span>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadEmptyTemplate}
                  disabled={isDownloading}
                  className="flex items-center gap-2 bg-transparent border-gray-300 text-black hover:bg-gray-100"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Download CSV Template
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {importStatus === "idle" && (
                <>
                  <div className="mb-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <h3 className="font-medium text-gray-800 mb-2">How to import companies:</h3>
                      <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                        <li>Download the CSV template</li>
                        <li>Fill it with your company data (Company Name & Country required)</li>
                        <li>Upload the completed file</li>
                        <li>Data will be automatically added to the Address Book</li>
                      </ol>
                    </div>
                  </div>
                  
                  <FileUploadArea 
                    onFileChange={setSelectedFile}
                    selectedFile={selectedFile}
                    isUploading={importStatus === ("processing" as ImportStatus)}
                  />
                  
                  {selectedFile && (
                    <div className="mt-4 flex justify-end">
                      <Button 
                        onClick={handleProcessCSV}
                        className="flex items-center gap-2 bg-black text-white hover:bg-gray-800"
                      >
                        <Upload className="h-4 w-4" />
                        Upload and Process
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              {importStatus === "processing" && (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Processing your data...</p>
                </div>
              )}
              
              {importStatus === "success" && (
                <div className="py-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">Import Successful</h3>
                    <p className="text-gray-600">
                      {importStats.success} companies have been successfully imported.
                      {importStats.failed > 0 && ` (${importStats.failed} failed)`}
                    </p>
                  </div>
                  
                  {importStats.failed > 0 && (
                    <div className="mt-6 max-w-md mx-auto">
                      <h4 className="font-medium text-red-600">The following errors occurred:</h4>
                      <ul className="list-disc pl-5 mt-2">
                        {errorMessages.slice(0, 3).map((error, index) => (
                          <li key={index} className="text-red-600 text-sm mb-1">{error}</li>
                        ))}
                        {errorMessages.length > 3 && (
                          <li className="text-red-600 text-sm">...and {errorMessages.length - 3} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-center space-x-4">
                    <Button onClick={handleReset} className="bg-black text-white hover:bg-gray-800">
                      Import Another File
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = "/addressbook"}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      View Companies
                    </Button>
                  </div>
                </div>
              )}
              
              {importStatus === "error" && (
                <div className="py-4">
                  <div className="flex flex-col items-center">
                    <div className="text-center">
                      <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
                      <h3 className="text-lg font-semibold mt-2 text-red-600">Import Failed</h3>
                    </div>
                    
                    {importStats.success > 0 && (
                      <p className="mb-4 mt-2">Partially imported: {importStats.success} companies were successfully imported.</p>
                    )}
                    
                    <div className="w-full mt-4 max-w-md">
                      <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
                      <ul className="list-disc pl-5">
                        {errorMessages.map((error, index) => (
                          <li key={index} className="text-red-700 mb-2">{error}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-6">
                      <Button onClick={handleReset} className="bg-black text-white hover:bg-gray-800">Try Again</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Ports Import */}
        <TabsContent value="ports">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Import Ports</span>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadEmptyTemplate}
                  disabled={isDownloading}
                  className="flex items-center gap-2 bg-transparent border-gray-300 text-black hover:bg-gray-100"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Download CSV Template
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {importStatus === "idle" && (
                <>
                  <div className="mb-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <h3 className="font-medium text-gray-800 mb-2">How to import ports:</h3>
                      <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                        <li>Download the CSV template</li>
                        <li>Fill it with your port data (PORT_Code, PORT_Name, PORT_LONG, Country -Full & Port Type required)</li>
                        <li>For ICD port types, a Parent Port must be specified</li>
                        <li>Upload the completed file</li>
                        <li>Data will be automatically added to the Ports database</li>
                      </ol>
                    </div>
                  </div>
                  
                  <FileUploadArea 
                    onFileChange={setSelectedFile}
                    selectedFile={selectedFile}
                    isUploading={importStatus === ("processing" as ImportStatus)}
                  />
                  
                  {selectedFile && (
                    <div className="mt-4 flex justify-end">
                      <Button 
                        onClick={handleProcessCSV}
                        className="flex items-center gap-2 bg-black text-white hover:bg-gray-800"
                      >
                        <Upload className="h-4 w-4" />
                        Upload and Process
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              {importStatus === "processing" && (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Processing your data...</p>
                </div>
              )}
              
              {importStatus === "success" && (
                <div className="py-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">Import Successful</h3>
                    <p className="text-gray-600">
                      {importStats.success} ports have been successfully imported.
                      {importStats.failed > 0 && ` (${importStats.failed} failed)`}
                    </p>
                  </div>
                  
                  {importStats.failed > 0 && (
                    <div className="mt-6 max-w-md mx-auto">
                      <h4 className="font-medium text-red-600">The following errors occurred:</h4>
                      <ul className="list-disc pl-5 mt-2">
                        {errorMessages.slice(0, 3).map((error, index) => (
                          <li key={index} className="text-red-600 text-sm mb-1">{error}</li>
                        ))}
                        {errorMessages.length > 3 && (
                          <li className="text-red-600 text-sm">...and {errorMessages.length - 3} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-center space-x-4">
                    <Button onClick={handleReset} className="bg-black text-white hover:bg-gray-800">
                      Import Another File
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = "/port-location/ports"}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      View Ports
                    </Button>
                  </div>
                </div>
              )}
              
              {importStatus === "error" && (
                <div className="py-4">
                  <div className="flex flex-col items-center">
                    <div className="text-center">
                      <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
                      <h3 className="text-lg font-semibold mt-2 text-red-600">Import Failed</h3>
                    </div>
                    
                    {importStats.success > 0 && (
                      <p className="mb-4 mt-2">Partially imported: {importStats.success} ports were successfully imported.</p>
                    )}
                    
                    <div className="w-full mt-4 max-w-md">
                      <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
                      <ul className="list-disc pl-5">
                        {errorMessages.map((error, index) => (
                          <li key={index} className="text-red-700 mb-2">{error}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-6">
                      <Button onClick={handleReset} className="bg-black text-white hover:bg-gray-800">Try Again</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Containers Import */}
        <TabsContent value="containers">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Import Containers</span>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadEmptyTemplate}
                  disabled={isDownloading}
                  className="flex items-center gap-2 bg-transparent border-gray-300 text-black hover:bg-gray-100"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Download CSV Template
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {importStatus === "idle" && (
                <>
                  <div className="mb-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <h3 className="font-medium text-gray-800 mb-2">How to import containers:</h3>
                      <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                        <li>Download the CSV template</li>
                        <li>Fill it with your container data (containerNumber, containerCategory, containerType, and containerClass required)</li>
                        <li>For leased containers, OWNER, LEASE REF, and On-hire Date are also required</li>
                        <li>Dates should be in YYYY-MM-DD or MM/DD/YYYY format</li>
                        <li>Upload the completed file</li>
                        <li>Data will be automatically added to the system (Inventory, Leasing Info, Tank Certificates, and On-Hire Reports)</li>
                      </ol>
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Note: The system will create related records based on your data:</p>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>Container details will be added to Inventory</li>
                          <li>If leased, leasing information will be recorded</li> 
                          <li>If inspection dates are provided, tank certificates will be created</li>
                          <li>For leased containers, on-hire reports will also be generated</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <FileUploadArea 
                    onFileChange={setSelectedFile}
                    selectedFile={selectedFile}
                    isUploading={importStatus === ("processing" as ImportStatus)}
                  />
                  
                  {selectedFile && (
                    <div className="mt-4 flex justify-end">
                      <Button 
                        onClick={handleProcessCSV}
                        className="flex items-center gap-2 bg-black text-white hover:bg-gray-800"
                      >
                        <Upload className="h-4 w-4" />
                        Upload and Process
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              {importStatus === "processing" && (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Processing your data...</p>
                </div>
              )}
              
              {importStatus === "success" && (
                <div className="py-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">Import Successful</h3>
                    <p className="text-gray-600">
                      {importStats.success} containers have been successfully imported.
                      {importStats.failed > 0 && ` (${importStats.failed} failed)`}
                    </p>
                  </div>
                  
                  {importStats.failed > 0 && (
                    <div className="mt-6 max-w-md mx-auto">
                      <h4 className="font-medium text-red-600">The following errors occurred:</h4>
                      <ul className="list-disc pl-5 mt-2">
                        {errorMessages.slice(0, 3).map((error, index) => (
                          <li key={index} className="text-red-600 text-sm mb-1">{error}</li>
                        ))}
                        {errorMessages.length > 3 && (
                          <li className="text-red-600 text-sm">...and {errorMessages.length - 3} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-center space-x-4">
                    <Button onClick={handleReset} className="bg-black text-white hover:bg-gray-800">
                      Import Another File
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = "/products-inventory/inventory"}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      View Containers
                    </Button>
                  </div>
                </div>
              )}
              
              {importStatus === "error" && (
                <div className="py-4">
                  <div className="flex flex-col items-center">
                    <div className="text-center">
                      <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
                      <h3 className="text-lg font-semibold mt-2 text-red-600">Import Failed</h3>
                    </div>
                    
                    {importStats.success > 0 && (
                      <p className="mb-4 mt-2">Partially imported: {importStats.success} containers were successfully imported.</p>
                    )}
                    
                    <div className="w-full mt-4 max-w-md">
                      <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
                      <ul className="list-disc pl-5">
                        {errorMessages.map((error, index) => (
                          <li key={index} className="text-red-700 mb-2">{error}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-6">
                      <Button onClick={handleReset} className="bg-black text-white hover:bg-gray-800">Try Again</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataImportTable;