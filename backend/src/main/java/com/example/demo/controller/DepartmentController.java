package com.example.demo.controller;

import com.example.demo.model.Department;
import com.example.demo.repository.DepartmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@CrossOrigin(origins = "http://localhost:5173")
public class DepartmentController {
    @Autowired
    private DepartmentRepository departmentRepository;

    @GetMapping
    public List<Department> getAll() {
        return departmentRepository.findAll();
    }

    @GetMapping("/by-faculty/{facultyId}")
    public List<Department> getByFaculty(@PathVariable Long facultyId) {
        return departmentRepository.findByFaculty_FacultyID(facultyId);
    }
} 