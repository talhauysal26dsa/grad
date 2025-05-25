package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Student {
    @Id
    @Column(name = "studentid")
    private String studentid; // Student Number

    private String graduationStatus;
    private String disengagementStatus;
    private String transcriptPath;
    private Double gpa;
    @Column(name = "total_ects")
    private Double totalEcts;
    private Double totalCredit;
    @Column(name = "term_count")
    private Integer termCount;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "last_check")
    private LocalDateTime lastCheck;

    // Getters and setters
    public String getStudentid() { return studentid; }
    public void setStudentid(String studentid) { this.studentid = studentid; }
    public String getGraduationStatus() { return graduationStatus; }
    public void setGraduationStatus(String graduationStatus) { this.graduationStatus = graduationStatus; }
    public String getDisengagementStatus() { return disengagementStatus; }
    public void setDisengagementStatus(String disengagementStatus) { this.disengagementStatus = disengagementStatus; }
    public String getTranscriptPath() { return transcriptPath; }
    public void setTranscriptPath(String transcriptPath) { this.transcriptPath = transcriptPath; }
    public Double getGpa() { return gpa; }
    public void setGpa(Double gpa) { this.gpa = gpa; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Double getTotalEcts() { return totalEcts; }
    public void setTotalEcts(Double totalEcts) { this.totalEcts = totalEcts; }
    public Double getTotalCredit() { return totalCredit; }
    public void setTotalCredit(Double totalCredit) { this.totalCredit = totalCredit; }
    public Integer getTermCount() { return termCount; }
    public void setTermCount(Integer termCount) { this.termCount = termCount; }
    public LocalDateTime getLastCheck() { return lastCheck; }
    public void setLastCheck(LocalDateTime lastCheck) { this.lastCheck = lastCheck; }
} 