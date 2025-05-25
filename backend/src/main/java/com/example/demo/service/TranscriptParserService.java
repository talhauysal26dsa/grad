package com.example.demo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileCopyUtils;

import java.io.*;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class TranscriptParserService {
    
    private static final Logger logger = LoggerFactory.getLogger(TranscriptParserService.class);
    private static final String PYTHON_EXECUTABLE = determinePythonExecutable();
    private static final String PARSER_SCRIPT_NAME = "transcript_parser.py";
    
    private static String determinePythonExecutable() {
        // Try to determine the Python executable based on OS
        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("win")) {
            // First try python3, then python
            if (isPythonAvailable("python3")) {
                return "python3";
            } else {
                return "python";
            }
        } else {
            // On Unix systems, prefer python3
            return "python3";
        }
    }
    
    private static boolean isPythonAvailable(String pythonCmd) {
        try {
            Process process = new ProcessBuilder(pythonCmd, "--version").start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Initialize the Python environment if needed
     */
    public void initPythonEnvironment() {
        try {
            // Check if Python is installed
            Process pythonVersionProcess = new ProcessBuilder(PYTHON_EXECUTABLE, "--version").start();
            int exitCode = pythonVersionProcess.waitFor();
            if (exitCode != 0) {
                logger.error("Python is not installed. Please install Python 3.x");
                return;
            }
            
            // Check if PyPDF2 is installed, install if not
            Process pipProcess = new ProcessBuilder(PYTHON_EXECUTABLE, "-m", "pip", "install", "-r", 
                    getResourceFilePath("requirements.txt").toString()).start();
            exitCode = pipProcess.waitFor();
            
            if (exitCode != 0) {
                BufferedReader errorReader = new BufferedReader(new InputStreamReader(pipProcess.getErrorStream()));
                String line;
                StringBuilder error = new StringBuilder();
                while ((line = errorReader.readLine()) != null) {
                    error.append(line).append("\n");
                }
                logger.error("Failed to install Python dependencies: {}", error.toString());
            } else {
                logger.info("Python environment initialized successfully");
            }
        } catch (Exception e) {
            logger.error("Error initializing Python environment", e);
        }
    }
    
    /**
     * Get a Path to a resource file, copying it to a temp location if needed
     */
    private Path getResourceFilePath(String resourceName) throws IOException {
        ClassPathResource resource = new ClassPathResource(resourceName);
        if (!resource.exists()) {
            throw new FileNotFoundException("Resource not found: " + resourceName);
        }
        
        // Copy the resource to a temp file that can be accessed by the Python script
        Path tempFile = Files.createTempFile(resourceName, null);
        try (InputStream is = resource.getInputStream();
             OutputStream os = Files.newOutputStream(tempFile)) {
            FileCopyUtils.copy(is, os);
        }
        
        // Make sure the file is deleted when the JVM exits
        tempFile.toFile().deleteOnExit();
        return tempFile;
    }
    
    /**
     * Process transcripts using the Python parser
     * 
     * @param zipFilePath Path to the zip file containing transcript PDFs
     * @param outputDirectory Path to the directory where CSV files will be saved
     * @return List of processed file names
     */
    public List<String> processTranscripts(String zipFilePath, String outputDirectory) {
        List<String> processedFiles = new ArrayList<>();
        
        try {
            // Get path to the Python script
            Path scriptPath = getResourceFilePath(PARSER_SCRIPT_NAME);
            
            // Create the output directory if it doesn't exist
            Files.createDirectories(Paths.get(outputDirectory));
            
            // Build and execute the command
            ProcessBuilder processBuilder = new ProcessBuilder(
                PYTHON_EXECUTABLE,
                scriptPath.toString(),
                zipFilePath,
                outputDirectory
            );
            
            // Merge error stream with input stream
            processBuilder.redirectErrorStream(true);
            
            logger.info("Executing command: {}", String.join(" ", processBuilder.command()));
            Process process = processBuilder.start();
            
            // Read the output
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                boolean success = false;
                
                while ((line = reader.readLine()) != null) {
                    if (line.equals("SUCCESS")) {
                        success = true;
                    } else if (success && !line.startsWith("ERROR:")) {
                        processedFiles.add(line.trim());
                    }
                    logger.info("Python output: {}", line);
                }
            }
            
            // Wait for the process to complete
            boolean completed = process.waitFor(5, TimeUnit.MINUTES);
            if (!completed) {
                logger.error("Python script execution timed out");
                process.destroyForcibly();
            } else if (process.exitValue() != 0) {
                logger.error("Python script exited with code: {}", process.exitValue());
            }
            
        } catch (Exception e) {
            logger.error("Error executing Python script", e);
        }
        
        return processedFiles;
    }
} 