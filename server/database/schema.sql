
-- ============================================
-- UNIVERSITY PLATFORM DATABASE
-- PostgreSQL / Supabase
-- ============================================

-- 1. USER ROLE
CREATE TYPE user_role AS ENUM (
    'STUDENT',
    'PROFESSOR',
    'DEPARTMENT_COORDINATOR',
    'SECRETARY',
    'ADMIN'
);

-- 2. STUDENT STATUS
CREATE TYPE student_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'GRADUATED',
    'WITHDRAWN'
);

-- 3. COURSE REQUIREMENT TYPE
CREATE TYPE course_requirement_type AS ENUM (
    'REQUIRED',
    'ELECTIVE',
    'FREE_ELECTIVE'
);

-- 4. SECTION STATUS
CREATE TYPE section_status AS ENUM (
    'PLANNED',
    'OPEN',
    'CLOSED',
    'CANCELLED'
);

-- 5. ENROLLMENT STATUS
CREATE TYPE enrollment_status AS ENUM (
    'ENROLLED',
    'COMPLETED',
    'DROPPED',
    'WITHDRAWN'
);

-- 6. REGISTRATION REQUEST TYPE
CREATE TYPE registration_request_type AS ENUM (
    'ADD',
    'DROP'
);

-- 7. REQUEST STATUS
CREATE TYPE request_status AS ENUM (
    'PENDING',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

-- 8. GRADE STATUS
CREATE TYPE grade_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'PUBLISHED'
);

-- 9. ASSESSMENT TYPE
CREATE TYPE assessment_type AS ENUM (
    'MIDTERM',
    'FINAL',
    'ASSIGNMENT',
    'PROJECT',
    'QUIZ',
    'OTHER'
);

-- 10. TRANSCRIPT STATUS
CREATE TYPE transcript_status AS ENUM (
    'DRAFT',
    'ISSUED',
    'REVOKED'
);


-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    image_url TEXT,
    role user_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role_active
ON users(role, is_active);


-- ============================================
-- FACULTIES
-- ============================================

CREATE TABLE faculties (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- DEPARTMENTS
-- ============================================

CREATE TABLE departments (
    id TEXT PRIMARY KEY,
    faculty_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_departments_faculty
        FOREIGN KEY (faculty_id)
        REFERENCES faculties(id)
);

CREATE INDEX idx_departments_faculty
ON departments(faculty_id);


-- ============================================
-- STUDENTS
-- ============================================

CREATE TABLE students (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    student_number VARCHAR(50) NOT NULL UNIQUE,
    department_id TEXT NOT NULL,
    enrollment_year INTEGER NOT NULL,
    year_level INTEGER NOT NULL,
    status student_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_students_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_students_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
);

CREATE INDEX idx_students_department_status
ON students(department_id, status);


-- ============================================
-- PROFESSORS
-- ============================================

CREATE TABLE professors (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    department_id TEXT NOT NULL,
    employee_number VARCHAR(50) NOT NULL UNIQUE,
    academic_title VARCHAR(100),

    CONSTRAINT fk_professors_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_professors_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
);


-- ============================================
-- COURSES
-- ============================================

CREATE TABLE courses (
    id TEXT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL,
    ects INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_name
ON courses(name);


-- ============================================
-- COURSE DEPARTMENTS
-- ============================================

CREATE TABLE course_departments (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    department_id TEXT NOT NULL,
    requirement_type course_requirement_type NOT NULL DEFAULT 'REQUIRED',
    elective_group VARCHAR(100),
    default_quota INTEGER,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_course_departments_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id),

    CONSTRAINT fk_course_departments_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id),

    CONSTRAINT uq_course_department
        UNIQUE (course_id, department_id)
);

CREATE INDEX idx_course_departments_department_requirement
ON course_departments(department_id, requirement_type);


-- ============================================
-- ACADEMIC TERMS
-- ============================================

CREATE TABLE academic_terms (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester INTEGER NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_academic_year_semester
        UNIQUE (academic_year, semester)
);


-- ============================================
-- DEPARTMENT COURSE QUOTAS
-- ============================================

CREATE TABLE department_course_quotas (
    id TEXT PRIMARY KEY,
    course_department_id TEXT NOT NULL,
    term_id TEXT NOT NULL,
    quota INTEGER NOT NULL,

    CONSTRAINT fk_department_course_quotas_course_department
        FOREIGN KEY (course_department_id)
        REFERENCES course_departments(id),

    CONSTRAINT fk_department_course_quotas_term
        FOREIGN KEY (term_id)
        REFERENCES academic_terms(id),

    CONSTRAINT uq_department_course_term
        UNIQUE (course_department_id, term_id)
);

CREATE INDEX idx_department_course_quotas_term
ON department_course_quotas(term_id);


-- ============================================
-- COURSE SECTIONS
-- ============================================

CREATE TABLE course_sections (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    term_id TEXT NOT NULL,
    section_code VARCHAR(50) NOT NULL,
    instructor_id TEXT,
    capacity INTEGER NOT NULL,
    status section_status NOT NULL DEFAULT 'PLANNED',
    room VARCHAR(100),
    schedule JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_course_sections_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id),

    CONSTRAINT fk_course_sections_term
        FOREIGN KEY (term_id)
        REFERENCES academic_terms(id),

    CONSTRAINT fk_course_sections_instructor
        FOREIGN KEY (instructor_id)
        REFERENCES professors(id),

    CONSTRAINT uq_course_term_section
        UNIQUE (course_id, term_id, section_code)
);

CREATE INDEX idx_course_sections_term_status
ON course_sections(term_id, status);

CREATE INDEX idx_course_sections_instructor
ON course_sections(instructor_id);


-- ============================================
-- SECTION DEPARTMENT QUOTAS
-- ============================================

CREATE TABLE section_department_quotas (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    course_department_id TEXT NOT NULL,
    quota INTEGER NOT NULL,

    CONSTRAINT fk_section_quotas_section
        FOREIGN KEY (section_id)
        REFERENCES course_sections(id),

    CONSTRAINT fk_section_quotas_course_department
        FOREIGN KEY (course_department_id)
        REFERENCES course_departments(id),

    CONSTRAINT uq_section_course_department
        UNIQUE (section_id, course_department_id)
);

CREATE INDEX idx_section_quotas_course_department
ON section_department_quotas(course_department_id);


-- ============================================
-- ENROLLMENTS
-- ============================================

CREATE TABLE enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    status enrollment_status NOT NULL DEFAULT 'ENROLLED',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dropped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_enrollments_student
        FOREIGN KEY (student_id)
        REFERENCES students(id),

    CONSTRAINT fk_enrollments_section
        FOREIGN KEY (section_id)
        REFERENCES course_sections(id),

    CONSTRAINT uq_student_section
        UNIQUE (student_id, section_id)
);

CREATE INDEX idx_enrollments_student_status
ON enrollments(student_id, status);

CREATE INDEX idx_enrollments_section_status
ON enrollments(section_id, status);


-- ============================================
-- REGISTRATION WINDOWS
-- ============================================

CREATE TABLE registration_windows (
    id TEXT PRIMARY KEY,
    term_id TEXT NOT NULL,
    registration_opens_at TIMESTAMPTZ NOT NULL,
    registration_closes_at TIMESTAMPTZ NOT NULL,
    add_drop_opens_at TIMESTAMPTZ NOT NULL,
    add_drop_closes_at TIMESTAMPTZ NOT NULL,
    section_change_opens_at TIMESTAMPTZ NOT NULL,
    section_change_closes_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_registration_windows_term
        FOREIGN KEY (term_id)
        REFERENCES academic_terms(id)
);

CREATE INDEX idx_registration_windows_term_active
ON registration_windows(term_id, is_active);


-- ============================================
-- REGISTRATION REQUESTS
-- ============================================

CREATE TABLE registration_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    section_id TEXT NOT NULL,
    enrollment_id TEXT,
    type registration_request_type NOT NULL,
    status request_status NOT NULL DEFAULT 'PENDING',
    reason TEXT,
    reviewer_id TEXT,
    review_note TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_registration_requests_student
        FOREIGN KEY (student_id)
        REFERENCES students(id),

    CONSTRAINT fk_registration_requests_section
        FOREIGN KEY (section_id)
        REFERENCES course_sections(id),

    CONSTRAINT fk_registration_requests_enrollment
        FOREIGN KEY (enrollment_id)
        REFERENCES enrollments(id),

    CONSTRAINT fk_registration_requests_reviewer
        FOREIGN KEY (reviewer_id)
        REFERENCES users(id)
);

CREATE INDEX idx_registration_requests_student_status
ON registration_requests(student_id, status);

CREATE INDEX idx_registration_requests_section_type_status
ON registration_requests(section_id, type, status);


-- ============================================
-- SECTION CHANGE REQUESTS
-- ============================================

CREATE TABLE section_change_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    enrollment_id TEXT NOT NULL,
    target_section_id TEXT NOT NULL,
    status request_status NOT NULL DEFAULT 'PENDING',
    reason TEXT,
    reviewer_id TEXT,
    review_note TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_section_change_student
        FOREIGN KEY (student_id)
        REFERENCES students(id),

    CONSTRAINT fk_section_change_enrollment
        FOREIGN KEY (enrollment_id)
        REFERENCES enrollments(id),

    CONSTRAINT fk_section_change_target
        FOREIGN KEY (target_section_id)
        REFERENCES course_sections(id),

    CONSTRAINT fk_section_change_reviewer
        FOREIGN KEY (reviewer_id)
        REFERENCES users(id)
);

CREATE INDEX idx_section_change_student_status
ON section_change_requests(student_id, status);

CREATE INDEX idx_section_change_target_status
ON section_change_requests(target_section_id, status);


-- ============================================
-- ASSESSMENTS
-- ============================================

CREATE TABLE assessments (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    section_id TEXT,
    name VARCHAR(255) NOT NULL,
    type assessment_type NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(7,2) NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assessments_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id),

    CONSTRAINT fk_assessments_section
        FOREIGN KEY (section_id)
        REFERENCES course_sections(id)
);

CREATE INDEX idx_assessments_course
ON assessments(course_id);

CREATE INDEX idx_assessments_section
ON assessments(section_id);


-- ============================================
-- GRADES
-- ============================================

CREATE TABLE grades (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    enrollment_id TEXT NOT NULL,
    assessment_id TEXT,
    score NUMERIC(7,2),
    letter_grade VARCHAR(10),
    status grade_status NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_grades_student
        FOREIGN KEY (student_id)
        REFERENCES students(id),

    CONSTRAINT fk_grades_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id),

    CONSTRAINT fk_grades_enrollment
        FOREIGN KEY (enrollment_id)
        REFERENCES enrollments(id),

    CONSTRAINT fk_grades_assessment
        FOREIGN KEY (assessment_id)
        REFERENCES assessments(id),

    CONSTRAINT uq_grade_enrollment_assessment
        UNIQUE (enrollment_id, assessment_id)
);

CREATE INDEX idx_grades_student_status
ON grades(student_id, status);


-- ============================================
-- TRANSCRIPTS
-- ============================================

CREATE TABLE transcripts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    term_id TEXT,
    transcript_number VARCHAR(100) NOT NULL UNIQUE,
    status transcript_status NOT NULL DEFAULT 'DRAFT',
    issued_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    issued_by TEXT,
    cumulative_gpa NUMERIC(4,2),
    total_credits INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_transcripts_student
        FOREIGN KEY (student_id)
        REFERENCES students(id),

    CONSTRAINT fk_transcripts_term
        FOREIGN KEY (term_id)
        REFERENCES academic_terms(id)
);

CREATE INDEX idx_transcripts_student_status
ON transcripts(student_id, status);


-- ============================================
-- TRANSCRIPT ENTRIES
-- ============================================

CREATE TABLE transcript_entries (
    id TEXT PRIMARY KEY,
    transcript_id TEXT NOT NULL,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    credits INTEGER NOT NULL,
    letter_grade VARCHAR(10),
    numeric_grade NUMERIC(5,2),
    term_label VARCHAR(100) NOT NULL,
    quality_points NUMERIC(7,2),
    counts_toward_gpa BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_transcript_entries_transcript
        FOREIGN KEY (transcript_id)
        REFERENCES transcripts(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_transcript_entries_transcript
ON transcript_entries(transcript_id);


-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE INDEX idx_audit_logs_user_created
ON audit_logs(user_id, created_at);

CREATE INDEX idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);


-- ============================================
-- AUTOMATIC UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_course_sections_updated_at
BEFORE UPDATE ON course_sections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_enrollments_updated_at
BEFORE UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_registration_requests_updated_at
BEFORE UPDATE ON registration_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_section_change_requests_updated_at
BEFORE UPDATE ON section_change_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


CREATE TRIGGER trg_grades_updated_at
BEFORE UPDATE ON grades
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
