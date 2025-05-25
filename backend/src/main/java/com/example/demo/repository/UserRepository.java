package com.example.demo.repository;

import com.example.demo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findAllByRole_RoleId(Long roleId);
    List<User> findByEmailContainingIgnoreCaseOrNameContainingIgnoreCaseOrSurnameContainingIgnoreCase(String email, String name, String surname);
    List<User> findAllByDepartment_DepartmentIDAndRole_RoleId(Long departmentId, Long roleId);
} 