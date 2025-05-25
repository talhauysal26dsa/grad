package com.example.demo.model;

import jakarta.persistence.*;

@Entity
public class Faculty {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long facultyID;

    private String name;

    // Getters and setters
    public Long getFacultyID() { return facultyID; }
    public void setFacultyID(Long facultyID) { this.facultyID = facultyID; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
} 