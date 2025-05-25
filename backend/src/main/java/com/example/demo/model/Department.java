package com.example.demo.model;

import jakarta.persistence.*;

@Entity
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "departmentid")
    private Long departmentID;

    private String name;

    @Column(name = "short_name")
    private String shortName;

    @ManyToOne
    @JoinColumn(name = "faculty_id")
    private Faculty faculty;

    // Getters and setters
    public Long getDepartmentID() { return departmentID; }
    public void setDepartmentID(Long departmentID) { this.departmentID = departmentID; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Faculty getFaculty() { return faculty; }
    public void setFaculty(Faculty faculty) { this.faculty = faculty; }
    public String getShortName() { return shortName; }
    public void setShortName(String shortName) { this.shortName = shortName; }
} 