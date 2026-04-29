CREATE TABLE IF NOT EXISTS department_rules (
  id                         CHAR(36)  PRIMARY KEY,
  department_id              CHAR(36)  NOT NULL,
  paid_leave_days            TINYINT   NOT NULL DEFAULT 0,
  full_attendance_bonus_days TINYINT   NOT NULL DEFAULT 0,
  created_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dr_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  UNIQUE KEY uq_dr_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
