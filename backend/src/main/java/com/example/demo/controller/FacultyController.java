package com.example.demo.controller;

import com.example.demo.model.Faculty;
import com.example.demo.repository.FacultyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faculties")
@CrossOrigin(origins = "http://localhost:5173")
public class FacultyController {
    @Autowired
    private FacultyRepository facultyRepository;

    @GetMapping
    public List<Faculty> getAll() {
        return facultyRepository.findAll();
    }
} 