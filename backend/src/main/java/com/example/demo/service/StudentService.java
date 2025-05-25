package com.example.demo.service;

import com.example.demo.model.Student;
import com.example.demo.repository.StudentRepository;
import com.example.demo.model.Document;
import com.example.demo.repository.DocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.io.*;
import java.util.*;

@Service
public class StudentService {
    @Autowired
    private StudentRepository studentRepository;
    @Autowired
    private DocumentRepository documentRepository;

    public Student save(Student student) {
        return studentRepository.save(student);
    }

    public void deleteByUser(Long userId) {
        studentRepository.deleteByUserId(userId);
    }

    // Mezuniyet kontrolü: transcript ve curriculum karşılaştır
    public boolean checkAndSetGraduationStatus(Student student) {
        // 1. En güncel curriculum dosyasını bul
        Optional<Document> curriculumOpt = documentRepository.findFirstByTypeOrderByCreatedAtDesc("curriculum");
        if (curriculumOpt.isEmpty()) return false;
        String curriculumPath = curriculumOpt.get().getFilePath();
        String transcriptPath = student.getTranscriptPath();
        if (curriculumPath == null || transcriptPath == null) return false;
        Set<String> curriculumCourses = new HashSet<>();
        Set<String> transcriptCourses = new HashSet<>();
        // Curriculum dosyasından CENGxxx kodlarını çek
        try (BufferedReader br = new BufferedReader(new FileReader(curriculumPath))) {
            String line;
            while ((line = br.readLine()) != null) {
                String[] parts = line.split(";");
                if (parts.length > 1 && parts[1].matches("CENG\\d{3}")) {
                    curriculumCourses.add(parts[1]);
                }
            }
        } catch (Exception e) { return false; }
        // Transcript dosyasından ders kodlarını çek
        try (BufferedReader br = new BufferedReader(new FileReader(transcriptPath))) {
            String line;
            while ((line = br.readLine()) != null) {
                String[] parts = line.split(";");
                if (parts.length > 1 && parts[1].matches("CENG\\d{3}")) {
                    transcriptCourses.add(parts[1]);
                }
            }
        } catch (Exception e) { return false; }
        // Curriculum'daki tüm dersler transcriptte var mı?
        if (transcriptCourses.containsAll(curriculumCourses)) {
            student.setGraduationStatus("true");
            studentRepository.save(student);
            return true;
        }
        return false;
    }
} 