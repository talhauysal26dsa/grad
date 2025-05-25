package com.example.demo.controller;

import com.example.demo.repository.StudentRepository;
import com.example.demo.service.TranscriptParserService;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.*;
import java.util.zip.*;
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/transcripts")
public class TranscriptController {

    private static final Logger logger = LoggerFactory.getLogger(TranscriptController.class);

    @Autowired
    private StudentRepository studentRepository;
    
    @Autowired
    private TranscriptParserService transcriptParserService;
    
    @PostConstruct
    public void init() {
        // Initialize Python environment on startup
        transcriptParserService.initPythonEnvironment();
    }

    @PostMapping("/upload-zip")
    @Transactional
    public ResponseEntity<?> uploadTranscripts(@RequestParam("file") MultipartFile file, 
                                               @RequestParam("fileType") String fileType) {
        List<String> uploadedFiles = new ArrayList<>();
        
        if (!file.getOriginalFilename().endsWith(".zip")) {
            logger.warn("Uploaded file is not a zip: {}", file.getOriginalFilename());
            return ResponseEntity.badRequest().body("Only .zip files are supported");
        }
        
        try {
            // Save the uploaded ZIP file to a temporary location
            File tempZipFile = File.createTempFile("transcripts-", ".zip");
            try (FileOutputStream fos = new FileOutputStream(tempZipFile)) {
                file.getInputStream().transferTo(fos);
            }
            
            // Define the output directory
            String outputDir = "uploads/transcripts";
            File outputDirFile = new File(outputDir);
            if (!outputDirFile.exists()) {
                outputDirFile.mkdirs();
            }
            
            List<String> processedFiles;
            
            if ("pdf".equals(fileType)) {
                // Process the transcripts using the Python parser for PDF files (which now computes term_count)
                logger.info("Processing ZIP file containing PDF transcripts");
                processedFiles = transcriptParserService.processTranscripts(
                        tempZipFile.getAbsolutePath(), 
                        outputDirFile.getAbsolutePath()
                );
            } else if ("csv".equals(fileType)) {
                // Process the ZIP file containing CSV files directly (assume CSV contains a "Term Count: ..." row)
                logger.info("Processing ZIP file containing CSV transcripts");
                processedFiles = processCsvZipFile(tempZipFile, outputDirFile);
            } else {
                logger.warn("Invalid file type: {}", fileType);
                return ResponseEntity.badRequest().body("Invalid file type. Expected 'pdf' or 'csv'.");
            }
            
            if (processedFiles.isEmpty()) {
                logger.warn("No transcripts were processed from the ZIP file");
                return ResponseEntity.badRequest().body("No transcripts found in the uploaded zip.");
            }
            
            // Update the database with the processed CSV files
            for (String csvFilename : processedFiles) {
                // Extract student ID from filename (assuming filename is studentId.csv)
                String studentId = csvFilename.replace(".csv", "");
                String csvFilePath = Paths.get(outputDir, csvFilename).toString();
                File csvFile = new File(csvFilePath);
                
                if (csvFile.exists()) {
                    try {
                        Double gpa = extractGpaFromCsv(csvFile);
                        Double ects = extractEctsFromCsv(csvFile);
                        Double totalCredit = extractTotalCreditFromCsv(csvFile);
                        Integer termCount = extractTermCountFromCsv(csvFile); // new helper to read term_count (e.g. "Term Count: ...")
                        
                        // Update the student record in the database (using the new query)
                        studentRepository.updateTranscriptPathGpaEctsCreditAndTermCountByStudentId(
                                csvFilePath, gpa, ects, totalCredit, termCount, studentId);
                        
                        uploadedFiles.add(csvFilename);
                        logger.info("Updated database for student {} (term_count: {})", studentId, termCount);
                    } catch (Exception e) {
                        logger.error("Error processing CSV for student {}: {}", studentId, e.getMessage(), e);
                    }
                } else {
                    logger.warn("CSV file not found for student {}: {}", studentId, csvFilePath);
                }
            }
            
            // Clean up the temporary zip file
            tempZipFile.delete();
            
        } catch (Exception e) {
            logger.error("Error processing transcripts: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Server error: " + e.getMessage());
        }
        
        if (uploadedFiles.isEmpty()) {
            return ResponseEntity.badRequest().body("No valid transcripts could be processed from the ZIP file.");
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Transcripts uploaded and assigned.");
        response.put("files", uploadedFiles);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Process a ZIP file containing CSV files directly
     */
    private List<String> processCsvZipFile(File zipFile, File outputDir) {
        List<String> processedFiles = new ArrayList<>();
        
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipFile))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().toLowerCase().endsWith(".csv")) {
                    String fileName = new File(entry.getName()).getName();
                    // Only process files that appear to be student IDs (numeric names)
                    if (fileName.replaceAll("\\D", "").length() > 0) {
                        // Extract the student ID from the file name
                        String studentId = fileName.replaceAll("\\D", "");
                        
                        // Create a destination file
                        File destFile = new File(outputDir, studentId + ".csv");
                        
                        // Copy the file
                        try (FileOutputStream fos = new FileOutputStream(destFile)) {
                            byte[] buffer = new byte[1024];
                            int len;
                            while ((len = zis.read(buffer)) > 0) {
                                fos.write(buffer, 0, len);
                            }
                        }
                        
                        // Verify that the file has the expected format
                        if (isValidTranscriptCsv(destFile)) {
                            processedFiles.add(studentId + ".csv");
                            logger.info("Successfully processed CSV file: {}", studentId + ".csv");
                        } else {
                            logger.warn("CSV file does not have expected transcript format: {}", fileName);
                            destFile.delete();
                        }
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Error processing CSV ZIP file: {}", e.getMessage(), e);
        }
        
        return processedFiles;
    }
    
    /**
     * Validate that a CSV file has the expected transcript format
     */
    private boolean isValidTranscriptCsv(File csvFile) {
        try (BufferedReader br = new BufferedReader(new FileReader(csvFile))) {
            // Check for Student ID row
            String line = br.readLine();
            if (line == null || (!line.startsWith("Student ID") && !line.startsWith("StudentID"))) {
                return false;
            }
            
            // Check for header row
            boolean foundHeader = false;
            while ((line = br.readLine()) != null) {
                if (line.contains("Term") && line.contains("Course Code") && line.contains("Course Name")) {
                    foundHeader = true;
                    break;
                }
            }
            
            // Check for GANO row
            boolean foundGano = false;
            while ((line = br.readLine()) != null) {
                if (line.contains("GANO:")) {
                    foundGano = true;
                    break;
                }
            }
            
            return foundHeader && foundGano;
        } catch (Exception e) {
            logger.error("Error validating CSV file: {}", e.getMessage(), e);
            return false;
        }
    }

    public String extractStudentIdFromCsv(File csvFile) throws IOException, CsvValidationException {
        try (FileReader fr = new FileReader(csvFile); CSVReader reader = new CSVReader(fr)) {
            // Skip first line (header)
            reader.readNext();
            // Read second line (student id)
            String[] line = reader.readNext();
            if (line != null && line.length > 0) {
                // Remove non-digit characters (if any)
                String studentId = line[0].replaceAll("\\D", "");
                if (!studentId.isEmpty()) {
                    return studentId;
                }
            }
        }
        return null;
    }

    public Double extractGpaFromCsv(File csvFile) throws IOException {
        try (BufferedReader br = new BufferedReader(new FileReader(csvFile))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.contains("GANO:")) {
                    // örnek: ;;;Total Credit: 126;Total ECTS: 211;;GANO: 1.82
                    int idx = line.indexOf("GANO:");
                    if (idx != -1) {
                        String gpaStr = line.substring(idx + 5).trim().replace(",", ".");
                        try {
                            return Double.parseDouble(gpaStr);
                        } catch (NumberFormatException e) {
                            return null;
                        }
                    }
                }
            }
        }
        return null;
    }

    public Double extractEctsFromCsv(File csvFile) throws IOException {
        try (BufferedReader br = new BufferedReader(new FileReader(csvFile))) {
            String line;
            while ((line = br.readLine()) != null) {
                String lowerLine = line.toLowerCase();
                if (lowerLine.contains("total ects:")) {
                    int idx = lowerLine.indexOf("total ects:");
                    if (idx != -1) {
                        String after = line.substring(idx + 11);
                        String[] parts = after.split("[^0-9.,]+");
                        for (String part : parts) {
                            if (!part.isBlank()) {
                                String ectsStr = part.trim().replace(",", ".");
                                try {
                                    return Double.parseDouble(ectsStr);
                                } catch (NumberFormatException e) {
                                    return null;
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    public Double extractTotalCreditFromCsv(File csvFile) throws IOException {
        try (BufferedReader br = new BufferedReader(new FileReader(csvFile))) {
            String line;
            while ((line = br.readLine()) != null) {
                String lowerLine = line.toLowerCase();
                if (lowerLine.contains("total credit:")) {
                    int idx = lowerLine.indexOf("total credit:");
                    if (idx != -1) {
                        String after = line.substring(idx + 13);
                        String[] parts = after.split("[^0-9.,]+");
                        for (String part : parts) {
                            if (!part.isBlank()) {
                                String creditStr = part.trim().replace(",", ".");
                                try {
                                    return Double.parseDouble(creditStr);
                                } catch (NumberFormatException e) {
                                    return null;
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    // New helper to extract term_count (e.g. "Term Count: ...") from the CSV summary row
    public Integer extractTermCountFromCsv(File csvFile) throws IOException {
        List<String> terms = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(csvFile))) {
            String line;
            while ((line = br.readLine()) != null) {
                // Her satırda ilk sütunda term bilgisi var mı kontrol et
                String[] parts = line.split(";");
                if (parts.length > 0) {
                    String termCandidate = parts[0].trim();
                    // Yıl ve dönem formatı: 2021-2022 Fall veya 2021-2022 Spring
                    if (termCandidate.matches("\\d{4}-\\d{4} (Fall|Spring|Güz|Bahar)")) {
                        terms.add(termCandidate);
                    }
                }
            }
        }
        if (terms.size() > 0) {
            String firstTerm = terms.get(0); // örn: 2022-2023 Fall
            String lastTerm = terms.get(terms.size() - 1); // örn: 2024-2025 Fall veya Spring
            int firstYear = Integer.parseInt(firstTerm.split("-")[0].trim());
            int lastYear = Integer.parseInt(lastTerm.split("-")[1].split(" ")[0].trim());
            int termCount = (lastYear - firstYear) * 2;
            String lastSemester = lastTerm.toLowerCase();
            if (lastSemester.contains("fall") || lastSemester.contains("güz")) {
                termCount -= 1;
            }
            return termCount;
        }
        return null;
    }
} 