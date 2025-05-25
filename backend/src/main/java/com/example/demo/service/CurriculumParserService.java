package com.example.demo.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class CurriculumParserService {

    private static final String TEMP_DIR = "temp_curriculum";
    private static final String OUTPUT_DIR = "uploads/curriculums";

    public List<String> processCurriculumZip(MultipartFile zipFile) throws Exception {
        // Create temporary directories
        Path tempDir = Paths.get(TEMP_DIR);
        Path outputDir = Paths.get(OUTPUT_DIR);
        Files.createDirectories(tempDir);
        Files.createDirectories(outputDir);

        List<String> processedFiles = new ArrayList<>();

        try {
            // Extract ZIP file
            List<String> pdfFiles = extractZipFile(zipFile, tempDir);

            // Process each PDF file
            for (String pdfFile : pdfFiles) {
                String department = extractDepartmentCode(pdfFile);
                String outputCsv = department + "_curriculum.csv";
                
                Path pdfPath = tempDir.resolve(pdfFile);
                Path csvPath = outputDir.resolve(outputCsv);

                if (parseCurriculumPdf(pdfPath, csvPath)) {
                    processedFiles.add(outputCsv);
                }
            }

        } finally {
            // Clean up temporary files
            deleteDirectory(tempDir);
        }

        return processedFiles;
    }

    private List<String> extractZipFile(MultipartFile zipFile, Path extractDir) throws IOException {
        List<String> pdfFiles = new ArrayList<>();

        try (ZipInputStream zipInputStream = new ZipInputStream(zipFile.getInputStream())) {
            ZipEntry entry;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().toLowerCase().endsWith(".pdf")) {
                    String fileName = Paths.get(entry.getName()).getFileName().toString();
                    Path filePath = extractDir.resolve(fileName);
                    
                    try (FileOutputStream fos = new FileOutputStream(filePath.toFile())) {
                        byte[] buffer = new byte[1024];
                        int length;
                        while ((length = zipInputStream.read(buffer)) > 0) {
                            fos.write(buffer, 0, length);
                        }
                    }
                    
                    pdfFiles.add(fileName);
                }
                zipInputStream.closeEntry();
            }
        }

        return pdfFiles;
    }

    private String extractDepartmentCode(String fileName) {
        // Extract department code from filename like "ceng_curriculum.pdf"
        String baseName = fileName.replaceAll("\\.pdf$", "");
        if (baseName.contains("_curriculum")) {
            return baseName.replace("_curriculum", "").toUpperCase();
        }
        return baseName.toUpperCase();
    }

    private boolean parseCurriculumPdf(Path pdfPath, Path csvPath) {
        try {
            // Setup Python environment
            setupPythonEnvironment();

            // Get Python executable
            String pythonCmd = getPythonExecutable();
            
            // Get parser script path
            ClassPathResource parserResource = new ClassPathResource("curriculum_parser.py");
            Path parserScript = extractResourceToTemp(parserResource, "curriculum_parser.py");

            // Build command
            ProcessBuilder processBuilder = new ProcessBuilder(
                pythonCmd,
                parserScript.toString(),
                pdfPath.toString(),
                csvPath.toString()
            );

            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            // Read output
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            int exitCode = process.waitFor();
            
            if (exitCode == 0) {
                System.out.println("Curriculum parsing successful: " + output.toString());
                return Files.exists(csvPath);
            } else {
                System.err.println("Curriculum parsing failed with exit code: " + exitCode);
                System.err.println("Output: " + output.toString());
                return false;
            }

        } catch (Exception e) {
            System.err.println("Error parsing curriculum PDF: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    private void setupPythonEnvironment() throws Exception {
        // Install PyPDF2 if not already installed
        String pythonCmd = getPythonExecutable();
        
        ProcessBuilder pipCheck = new ProcessBuilder(pythonCmd, "-c", "import PyPDF2");
        pipCheck.redirectErrorStream(true);
        Process checkProcess = pipCheck.start();
        int checkExitCode = checkProcess.waitFor();
        
        if (checkExitCode != 0) {
            System.out.println("Installing PyPDF2...");
            ProcessBuilder pipInstall = new ProcessBuilder(pythonCmd, "-m", "pip", "install", "PyPDF2");
            pipInstall.redirectErrorStream(true);
            Process installProcess = pipInstall.start();
            
            // Read installation output
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(installProcess.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("pip: " + line);
                }
            }
            
            int installExitCode = installProcess.waitFor();
            if (installExitCode != 0) {
                throw new RuntimeException("Failed to install PyPDF2");
            }
        }
    }

    private String getPythonExecutable() {
        // Try common Python executable names
        String[] pythonCommands = {"python3", "python", "py"};
        
        for (String cmd : pythonCommands) {
            try {
                ProcessBuilder pb = new ProcessBuilder(cmd, "--version");
                pb.redirectErrorStream(true);
                Process process = pb.start();
                int exitCode = process.waitFor();
                if (exitCode == 0) {
                    return cmd;
                }
            } catch (Exception e) {
                // Try next command
            }
        }
        
        throw new RuntimeException("Python executable not found");
    }

    private Path extractResourceToTemp(ClassPathResource resource, String fileName) throws IOException {
        Path tempFile = Files.createTempFile("curriculum_parser", ".py");
        
        try (InputStream inputStream = resource.getInputStream();
             FileOutputStream outputStream = new FileOutputStream(tempFile.toFile())) {
            
            byte[] buffer = new byte[1024];
            int length;
            while ((length = inputStream.read(buffer)) > 0) {
                outputStream.write(buffer, 0, length);
            }
        }
        
        return tempFile;
    }

    private void deleteDirectory(Path directory) {
        try {
            if (Files.exists(directory)) {
                Files.walk(directory)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            }
        } catch (IOException e) {
            System.err.println("Error deleting directory: " + e.getMessage());
        }
    }

    public List<File> getProcessedCurriculumFiles() {
        List<File> files = new ArrayList<>();
        Path outputDir = Paths.get(OUTPUT_DIR);
        
        if (Files.exists(outputDir)) {
            try {
                Files.list(outputDir)
                    .filter(path -> path.toString().endsWith(".csv"))
                    .map(Path::toFile)
                    .forEach(files::add);
            } catch (IOException e) {
                System.err.println("Error listing curriculum files: " + e.getMessage());
            }
        }
        
        return files;
    }

    public void cleanupCurriculumFiles() {
        try {
            Path outputDir = Paths.get(OUTPUT_DIR);
            deleteDirectory(outputDir);
        } catch (Exception e) {
            System.err.println("Error cleaning up curriculum files: " + e.getMessage());
        }
    }
} 