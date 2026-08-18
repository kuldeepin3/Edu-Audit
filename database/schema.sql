-- ============================================================================
-- EduAudit AI - Database Schema
-- PostgreSQL 16 + pgvector + PostGIS
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'citizen', 'teacher', 'principal', 'deo', 'ngo', 'volunteer', 'admin'
);

CREATE TYPE comment_type AS ENUM ('official', 'citizen', 'system');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push');

-- ============================================================================
-- SEED DATA: Issue Categories
-- ============================================================================

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(10) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(50),
    default_severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    sla_days    INTEGER NOT NULL DEFAULT 14,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (code, name, icon, default_severity, sla_days, description) VALUES
('I001', 'Broken/Non-functional Toilet',        '🚽', 'critical', 3,  'Toilet is broken, non-functional, or unusable'),
('I002', 'No Drinking Water Facility',          '💧', 'critical', 3,  'No clean drinking water available'),
('I003', 'Unsafe Electrical Wiring',            '⚡', 'critical', 1,  'Exposed wires, sparking, unsafe electrical setup'),
('I004', 'Damaged Classroom/Structural',        '🏚️', 'high',     7,  'Cracked walls, damaged ceiling, structural issues'),
('I005', 'Roof Leakage',                         '🌧️', 'high',     7,  'Water leaking from roof, damaged roofing'),
('I006', 'Broken Furniture',                     '🪑', 'medium',  14,  'Broken desks, chairs, tables, storage'),
('I007', 'Broken Windows/Doors',                '🪟', 'medium',  14,  'Broken window panes, damaged doors'),
('I008', 'Missing Ramps/Accessibility',          '♿', 'high',     7,  'No wheelchair ramps, accessibility barriers'),
('I009', 'Sanitation Issues',                    '🧹', 'critical', 3,  'Unclean premises, garbage, hygiene issues'),
('I010', 'Boundary Wall Damage',                '🧱', 'high',    10,  'Broken or missing boundary wall'),
('I011', 'Playground Hazards',                   '⚽', 'medium',  14,  'Unsafe playground equipment, uneven surface'),
('I012', 'No Electricity',                       '🔌', 'high',     5,  'No power supply or frequent outages'),
('I013', 'Library/Lab Issues',                   '📚', 'low',     30,  'Missing books, broken lab equipment'),
('I014', 'Digital Infrastructure',                '💻', 'low',     30,  'Non-functional computers, no internet');

-- ============================================================================
-- STATES & DISTRICTS
-- ============================================================================

CREATE TABLE states (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(5) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE districts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    state_id    UUID NOT NULL REFERENCES states(id),
    code        VARCHAR(10) UNIQUE NOT NULL,
    deo_id      UUID,  -- FK to users when populated
    boundaries  GEOGRAPHY(POLYGON, 4326),  -- District polygon
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_district_state FOREIGN KEY (state_id) REFERENCES states(id)
);

-- ============================================================================
-- SCHOOLS
-- ============================================================================

CREATE TABLE schools (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    udise_code          VARCHAR(15) UNIQUE,
    name                VARCHAR(200) NOT NULL,
    district_id         UUID NOT NULL REFERENCES districts(id),
    address             TEXT,
    location            GEOGRAPHY(POINT, 4326),
    block               VARCHAR(100),
    cluster             VARCHAR(100),
    enrollment          INTEGER DEFAULT 0,
    school_type         VARCHAR(50),  -- primary, upper_primary, secondary, sr_secondary
    management_type     VARCHAR(50),  -- govt, govt_aided, private_aided
    health_score        INTEGER DEFAULT 0 CHECK (health_score BETWEEN 0 AND 100),
    health_grade        VARCHAR(2),  -- A+, A, B, C, D, F
    infrastructure_data JSONB DEFAULT '{}',
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schools_district ON schools(district_id);
CREATE INDEX idx_schools_location ON schools USING GIST(location);
CREATE INDEX idx_schools_health ON schools(health_score DESC);
CREATE INDEX idx_schools_name_trgm ON schools USING GIN(name gin_trgm_ops);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(200),
    email               VARCHAR(255) UNIQUE,
    phone               VARCHAR(20) UNIQUE,
    password_hash       VARCHAR(255),  -- bcrypt hash
    role                user_role NOT NULL DEFAULT 'citizen',
    district_id         UUID REFERENCES districts(id),
    school_id           UUID REFERENCES schools(id),
    reputation_score    INTEGER DEFAULT 0 CHECK (reputation_score BETWEEN 0 AND 100),
    reputation_level    VARCHAR(20) DEFAULT 'New',  -- New, Trusted, Contributor, Champion
    is_verified         BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN DEFAULT TRUE,
    avatar_url          VARCHAR(500),
    metadata            JSONB DEFAULT '{}',
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_district ON users(district_id);
CREATE INDEX idx_users_reputation ON users(reputation_score DESC);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- ============================================================================
-- COMPLAINTS (CORE ENTITY)
-- ============================================================================

CREATE TABLE complaints (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id           VARCHAR(20) UNIQUE NOT NULL,  -- Public tracking ID: RPT-YYYYMMDD-NNNNN
    reporter_id         UUID REFERENCES users(id),     -- NULL for anonymous
    school_id           UUID NOT NULL REFERENCES schools(id),
    category_id         UUID NOT NULL REFERENCES categories(id),
    status              VARCHAR(30) NOT NULL DEFAULT 'submitted',
    severity_level      VARCHAR(20) NOT NULL,
    severity_score      DECIMAL(4,1) NOT NULL DEFAULT 0.0 CHECK (severity_score BETWEEN 0.0 AND 10.0),
    ai_confidence       DECIMAL(5,2),                 -- 0.00 to 100.00
    gps_location        GEOGRAPHY(POINT, 4326),
    description         TEXT,
    ai_analysis         JSONB DEFAULT '{}',            -- Full AI detection results
    is_anonymous        BOOLEAN DEFAULT FALSE,
    device_fingerprint  VARCHAR(255),
    assigned_to         UUID REFERENCES users(id),     -- DEO/contractor assigned
    resolved_at         TIMESTAMPTZ,
    resolution_notes    TEXT,
    estimated_cost_min  INTEGER,
    estimated_cost_max  INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_school ON complaints(school_id);
CREATE INDEX idx_complaints_category ON complaints(category_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_severity ON complaints(severity_score DESC);
CREATE INDEX idx_complaints_location ON complaints USING GIST(gps_location);
CREATE INDEX idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX idx_complaints_assigned ON complaints(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_complaints_reporter ON complaints(reporter_id) WHERE reporter_id IS NOT NULL;
CREATE INDEX idx_complaints_report_id ON complaints(report_id);

-- Composite index for dashboard queries (disabled: district_id is not denormalized on complaints)
-- CREATE INDEX idx_complaints_dashboard ON complaints(district_id, status, created_at DESC);
-- Note: district_id is derived from school_id; add materialized view or denormalize if needed

-- ============================================================================
-- IMAGES
-- ============================================================================

CREATE TABLE images (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id        UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    s3_url              VARCHAR(500) NOT NULL,
    cloudinary_url      VARCHAR(500),
    thumbnail_url       VARCHAR(500),
    embedding           vector(768),               -- CLIP ViT-L/14 768-dim embedding
    phash               VARCHAR(64),               -- Perceptual hash for duplicate detection
    exif_data           JSONB DEFAULT '{}',
    detection_results   JSONB DEFAULT '[]',          -- YOLOv11 bounding boxes + classes
    file_size           INTEGER,
    width               INTEGER,
    height              INTEGER,
    mime_type           VARCHAR(50),
    is_primary          BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_images_complaint ON images(complaint_id);
CREATE INDEX idx_images_phash ON images(phash) WHERE phash IS NOT NULL;
-- Vector similarity index (IVFFlat for initial, switch to HNSW for production)
CREATE INDEX idx_images_embedding ON images USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- STATUS HISTORY (AUDIT TRAIL)
-- ============================================================================

CREATE TABLE status_history (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id        UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    old_status          VARCHAR(30),
    new_status          VARCHAR(30) NOT NULL,
    changed_by          UUID REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_complaint ON status_history(complaint_id);
CREATE INDEX idx_status_history_date ON status_history(created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

CREATE TABLE comments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id        UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    user_id             UUID REFERENCES users(id),
    content             TEXT NOT NULL,
    comment_type        comment_type NOT NULL DEFAULT 'citizen',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_complaint ON comments(complaint_id, created_at DESC);

-- ============================================================================
-- VERIFICATIONS
-- ============================================================================

CREATE TABLE verifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id        UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    verifier_id         UUID NOT NULL REFERENCES users(id),
    is_verified         BOOLEAN NOT NULL,
    notes               TEXT,
    verification_data   JSONB DEFAULT '{}',  -- Verification photos, checklist results
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verifications_complaint ON verifications(complaint_id);

-- ============================================================================
-- PREDICTIONS (ML OUTPUTS)
-- ============================================================================

CREATE TABLE predictions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    prediction_type     VARCHAR(50) NOT NULL,  -- deterioration, budget, maintenance
    score               DECIMAL(5,4) NOT NULL,  -- 0.0000 to 1.0000
    feature_importance  JSONB DEFAULT '{}',     -- SHAP values
    factors             JSONB DEFAULT '[]',     -- Top contributing factors
    recommendation      TEXT,
    predicted_for       DATE NOT NULL,           -- Date the prediction applies to
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictions_school ON predictions(school_id);
CREATE INDEX idx_predictions_type ON predictions(prediction_type, predicted_for);

-- ============================================================================
-- SCHOOL HEALTH SCORES (TIME SERIES)
-- ============================================================================

CREATE TABLE school_health (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id           UUID NOT NULL REFERENCES schools(id),
    health_score        INTEGER NOT NULL CHECK (health_score BETWEEN 0 AND 100),
    infrastructure_score DECIMAL(5,2),
    resolution_score    DECIMAL(5,2),
    trend_score         DECIMAL(5,2),
    satisfaction_score  DECIMAL(5,2),
    breakdown           JSONB DEFAULT '{}',
    recorded_date       DATE NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(school_id, recorded_date)
);

CREATE INDEX idx_health_school_date ON school_health(school_id, recorded_date DESC);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id),
    action              VARCHAR(50) NOT NULL,     -- create, update, delete, login, etc.
    entity_type         VARCHAR(50) NOT NULL,      -- complaint, school, user, etc.
    entity_id           UUID,
    changes             JSONB DEFAULT '{}',
    ip_address          INET,
    user_agent          TEXT,
    request_path        VARCHAR(500),
    response_status     INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at DESC);
-- Partitioning recommendation for high-volume:
-- CREATE TABLE audit_logs (...) PARTITION BY RANGE (created_at);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id),
    channel             notification_channel NOT NULL DEFAULT 'in_app',
    title               VARCHAR(200) NOT NULL,
    body                TEXT NOT NULL,
    metadata            JSONB DEFAULT '{}',
    is_read             BOOLEAN DEFAULT FALSE,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC)
    WHERE is_read = FALSE;
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ============================================================================
-- REPORT EMBEDDINGS (FOR RAG)
-- ============================================================================

CREATE TABLE report_embeddings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id        UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    embedding           vector(1024),              -- BGE-M3 1024-dim text embedding
    content_type        VARCHAR(50) NOT NULL,      -- description, comment, ai_analysis, audit
    content_text        TEXT NOT NULL,
    metadata            JSONB DEFAULT '{}',        -- district, state, category, severity
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_embed_complaint ON report_embeddings(complaint_id);
CREATE INDEX idx_report_embed_vector ON report_embeddings USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- SCHOOL EMBEDDINGS (FOR RAG - school profile queries)
-- ============================================================================

CREATE TABLE school_embeddings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    embedding           vector(1024),
    profile_text        TEXT NOT NULL,              -- Concatenated school profile for embedding
    metadata            JSONB DEFAULT '{}',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_school_embed_school ON school_embeddings(school_id);
CREATE INDEX idx_school_embed_vector ON school_embeddings USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- VIEWS (USEFUL DERIVED TABLES)
-- ============================================================================

-- Dashboard: Open complaints by district
CREATE VIEW v_district_dashboard AS
SELECT
    d.id AS district_id,
    d.name AS district_name,
    COUNT(*) FILTER (WHERE c.status IN ('submitted', 'ai_verified', 'pending_review')) AS pending_count,
    COUNT(*) FILTER (WHERE c.status = 'in_progress') AS in_progress_count,
    COUNT(*) FILTER (WHERE c.status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE c.severity_level = 'critical') AS critical_count,
    AVG(c.severity_score) AS avg_severity,
    AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) / 86400)
        FILTER (WHERE c.status = 'completed') AS avg_resolution_days
FROM districts d
JOIN schools s ON s.district_id = d.id
JOIN complaints c ON c.school_id = s.id
GROUP BY d.id, d.name;

-- School profile with district info
CREATE VIEW v_school_profile AS
SELECT
    s.*,
    d.name AS district_name,
    st.name AS state_name,
    sh.health_score AS latest_health_score,
    sh.recorded_date AS health_recorded_date,
    (SELECT COUNT(*) FROM complaints c WHERE c.school_id = s.id AND c.status != 'completed' AND c.status != 'rejected') AS open_complaints
FROM schools s
JOIN districts d ON s.district_id = d.id
JOIN states st ON d.state_id = st.id
LEFT JOIN LATERAL (
    SELECT health_score, recorded_date
    FROM school_health
    WHERE school_id = s.id
    ORDER BY recorded_date DESC
    LIMIT 1
) sh ON true;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-generate report tracking ID
CREATE OR REPLACE FUNCTION generate_report_id()
RETURNS VARCHAR(20) AS $$
DECLARE
    v_date VARCHAR(8);
    v_seq INTEGER;
BEGIN
    v_date := TO_CHAR(NOW(), 'YYYYMMDD');
    -- Use a sequence per day (simplified; use advisory lock in production)
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(report_id FROM 12) AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM complaints
    WHERE report_id LIKE 'RPT-' || v_date || '%';

    RETURN 'RPT-' || v_date || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Update school health score (called by scheduled job)
CREATE OR REPLACE FUNCTION refresh_school_health(p_school_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO school_health (school_id, health_score, infrastructure_score,
                               resolution_score, trend_score, satisfaction_score,
                               breakdown, recorded_date)
    SELECT
        p_school_id,
        LEAST(100, GREATEST(0, ROUND(
            -- Infrastructure: fewer open issues = higher score
            (100 - (
                (COUNT(*) FILTER (WHERE severity_level = 'critical') * 15) +
                (COUNT(*) FILTER (WHERE severity_level = 'high') * 8) +
                (COUNT(*) FILTER (WHERE severity_level = 'medium') * 3) +
                (COUNT(*) FILTER (WHERE severity_level = 'low') * 1)
            ))
        ))),
        0, 0, 0, 0,
        jsonb_build_object(
            'total_open', COUNT(*),
            'critical', COUNT(*) FILTER (WHERE severity_level = 'critical'),
            'high', COUNT(*) FILTER (WHERE severity_level = 'high'),
            'medium', COUNT(*) FILTER (WHERE severity_level = 'medium')
        ),
        CURRENT_DATE
    FROM complaints
    WHERE school_id = p_school_id
      AND status NOT IN ('completed', 'rejected', 'draft')
    ON CONFLICT (school_id, recorded_date) DO UPDATE SET
        health_score = EXCLUDED.health_score,
        infrastructure_score = EXCLUDED.infrastructure_score,
        breakdown = EXCLUDED.breakdown,
        updated_at = NOW();

    -- Update school's current health score
    UPDATE schools SET
        health_score = sh.health_score,
        health_grade = CASE
            WHEN sh.health_score >= 90 THEN 'A+'
            WHEN sh.health_score >= 80 THEN 'A'
            WHEN sh.health_score >= 65 THEN 'B'
            WHEN sh.health_score >= 50 THEN 'C'
            WHEN sh.health_score >= 35 THEN 'D'
            ELSE 'F'
        END,
        updated_at = NOW()
    FROM school_health sh
    WHERE schools.id = p_school_id
      AND sh.school_id = p_school_id
      AND sh.recorded_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Log status changes automatically
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO status_history (complaint_id, old_status, new_status, changed_by, notes)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.assigned_to,
                'Status auto-updated via trigger');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_complaint_status_change
    AFTER UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION log_status_change();

-- ============================================================================
-- PARTITIONING (for large-scale production)
-- ============================================================================

-- For audit_logs at high volume (>10M rows):
-- CREATE TABLE audit_logs (
--     ...same columns...
-- ) PARTITION BY RANGE (created_at);
--
-- CREATE TABLE audit_logs_2026_q1 PARTITION OF audit_logs
--     FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
-- CREATE TABLE audit_logs_2026_q2 PARTITION OF audit_logs
--     FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- ============================================================================
-- SAMPLE SEED DATA
-- ============================================================================

-- Sample state
INSERT INTO states (name, code) VALUES
('Uttarakhand', 'UK'), ('Karnataka', 'KA'), ('Uttar Pradesh', 'UP');

-- Sample districts
INSERT INTO districts (name, state_id, code) SELECT 'Udham Singh Nagar', id, 'UK03' FROM states WHERE code = 'UK';
INSERT INTO districts (name, state_id, code) SELECT 'Dehradun', id, 'UK01' FROM states WHERE code = 'UK';

-- Sample schools
INSERT INTO schools (udise_code, name, district_id, address, location, enrollment, school_type, management_type)
SELECT
    'UK050212001', 'Govt. Sr. Sec. School, Rudrapur', d.id,
    'Near Bus Stand, Rudrapur, Uttarakhand',
    ST_GeographyFromText('SRID=4326;POINT(79.42 28.62)'),
    450, 'sr_secondary', 'govt'
FROM districts d WHERE code = 'UK03';

INSERT INTO schools (udise_code, name, district_id, address, location, enrollment, school_type, management_type)
SELECT
    'UK050212002', 'Govt. Primary School, Kashipur', d.id,
    'Village Road, Kashipur, Uttarakhand',
    ST_GeographyFromText('SRID=4326;POINT(78.95 29.22)'),
    120, 'primary', 'govt'
FROM districts d WHERE code = 'UK03';
