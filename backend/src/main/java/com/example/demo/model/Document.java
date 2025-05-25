package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "document")
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "doc_id")
    private Long docId;

    @Column(name = "type")
    private String type;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "file_path")
    private String filePath;

    // Getters and setters
    public Long getDocId() { return docId; }
    public void setDocId(Long docId) { this.docId = docId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
} 