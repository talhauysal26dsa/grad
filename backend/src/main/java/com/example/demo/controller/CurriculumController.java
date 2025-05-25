package com.example.demo.controller;

import com.example.demo.model.Document;
import com.example.demo.repository.DocumentRepository;
import com.example.demo.service.CurriculumParserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.zip.*;

@RestController
@RequestMapping("/api/curriculum")
public class CurriculumController {

    private static final Logger logger = LoggerFactory.getLogger(CurriculumController.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private CurriculumParserService curriculumParserService;

    @PostMapping("/upload-zip")
    public ResponseEntity<?> uploadCurriculum(@RequestParam("file") MultipartFile file) {
        if (!file.getOriginalFilename().endsWith(".zip")) {
            logger.warn("Uploaded file is not a zip: {}", file.getOriginalFilename());
            return ResponseEntity.badRequest().body("Only .zip files are supported");
        }

        try {
            logger.info("Processing curriculum ZIP file: {}", file.getOriginalFilename());
            
            // Process the curriculum ZIP file
            List<String> processedFiles = curriculumParserService.processCurriculumZip(file);

            if (processedFiles.isEmpty()) {
                logger.warn("No curriculum files were processed from the ZIP file");
                return ResponseEntity.badRequest().body("No curriculum files found in the uploaded zip.");
            }

            logger.info("Successfully processed {} curriculum files", processedFiles.size());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Curriculum files uploaded and processed successfully.");
            response.put("files", processedFiles);
            response.put("count", processedFiles.size());
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error processing curriculum files: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Server error: " + e.getMessage());
        }
    }

    @GetMapping("/files")
    public ResponseEntity<?> getProcessedCurriculumFiles() {
        try {
            List<File> files = curriculumParserService.getProcessedCurriculumFiles();
            
            List<Map<String, Object>> fileInfo = new ArrayList<>();
            for (File file : files) {
                Map<String, Object> info = new HashMap<>();
                info.put("name", file.getName());
                info.put("size", file.length());
                info.put("lastModified", file.lastModified());
                fileInfo.add(info);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("files", fileInfo);
            response.put("count", files.size());
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting curriculum files: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Server error: " + e.getMessage());
        }
    }

    @DeleteMapping("/cleanup")
    public ResponseEntity<?> cleanupCurriculumFiles() {
        try {
            curriculumParserService.cleanupCurriculumFiles();
            logger.info("Curriculum files cleaned up successfully");
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Curriculum files cleaned up successfully");
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error cleaning up curriculum files: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Server error: " + e.getMessage());
        }
    }

    @GetMapping("/download/{fileName}")
    public ResponseEntity<?> downloadCurriculumFile(@PathVariable String fileName) {
        try {
            Path filePath = Paths.get("curriculum_csv", fileName);
            
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            byte[] fileContent = Files.readAllBytes(filePath);
            
            return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                .header("Content-Type", "text/csv")
                .body(fileContent);

        } catch (Exception e) {
            logger.error("Error downloading curriculum file {}: {}", fileName, e.getMessage(), e);
            return ResponseEntity.status(500).body("Server error: " + e.getMessage());
        }
    }
} 