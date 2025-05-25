package com.example.demo.repository;

import com.example.demo.model.Student;
import com.example.demo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    @Query("SELECT s FROM Student s WHERE s.user = :user")
    Optional<Student> findByUser(User user);

    @Modifying
    @Query("DELETE FROM Student s WHERE s.user.userID = :userId")
    void deleteByUserId(Long userId);

    Optional<Student> findByStudentid(String studentid);

    @Modifying
    @Query("UPDATE Student s SET s.transcriptPath = :path WHERE s.studentid = :studentid")
    void updateTranscriptPathByStudentId(String path, String studentid);

    @Modifying
    @Query("UPDATE Student s SET s.transcriptPath = :path, s.gpa = :gpa WHERE s.studentid = :studentid")
    void updateTranscriptPathAndGpaByStudentId(String path, Double gpa, String studentid);

    @Modifying
    @Query("UPDATE Student s SET s.transcriptPath = :path, s.gpa = :gpa, s.totalEcts = :totalEcts WHERE s.studentid = :studentid")
    void updateTranscriptPathGpaAndEctsByStudentId(String path, Double gpa, Double totalEcts, String studentid);

    @Modifying
    @Query("UPDATE Student s SET s.transcriptPath = :path, s.gpa = :gpa, s.totalEcts = :totalEcts, s.totalCredit = :totalCredit, s.termCount = :termCount WHERE s.studentid = :studentid")
    void updateTranscriptPathGpaEctsCreditAndTermCountByStudentId(String path, Double gpa, Double totalEcts, Double totalCredit, Integer termCount, String studentid);

    @Query("SELECT s FROM Student s WHERE s.user.userID = :userId")
    Optional<Student> findByUserId(Long userId);

    @Modifying
    @Query("UPDATE Student s SET s.lastCheck = :lastCheck WHERE s.user.userID = :userId")
    void updateLastCheckByUserId(LocalDateTime lastCheck, Long userId);

    List<Student> findAllByUser_Department_DepartmentIDAndUser_Role_RoleName(Long departmentId, String roleName);

    List<Student> findAllByGraduationStatus(String graduationStatus);

    List<Student> findAllByGraduationStatusAndUser_Department_DepartmentID(String graduationStatus, Long departmentId);
} 