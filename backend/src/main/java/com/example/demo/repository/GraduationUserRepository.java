package com.example.demo.repository;

import com.example.demo.model.GraduationUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GraduationUserRepository extends JpaRepository<GraduationUser, Long> {
    Optional<GraduationUser> findByFullName(String fullName);
    Optional<GraduationUser> findByFullNameAndEmail(String fullName, String email);
    Optional<GraduationUser> findByFullNameAndEmailAndFacultyIdAndDepartmentId(String fullName, String email, Long facultyId, Long departmentId);
    Optional<GraduationUser> findByFullNameAndEmailAndFacultyIdAndDepartmentIdAndStudentId(String fullName, String email, Long facultyId, Long departmentId, String studentId);
} 