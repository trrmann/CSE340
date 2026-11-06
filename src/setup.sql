-- =============================================================
-- CSE 340 Service Network - database setup script
-- Re-creates all tables and sample data from scratch.
-- Run against the public schema of the course database.
-- =============================================================

-- -------------------------------------------------------------
-- Drop existing tables (children first, because of foreign keys)
-- -------------------------------------------------------------
DROP TABLE IF EXISTS project_category;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS project;
DROP TABLE IF EXISTS organization;

-- -------------------------------------------------------------
-- Organizations (W02 Learning Activity)
-- -------------------------------------------------------------
CREATE TABLE organization (
    organization_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    logo_filename VARCHAR(255) NOT NULL
);

INSERT INTO organization (name, description, contact_email, logo_filename) VALUES
('BrightFuture Builders', 'A nonprofit focused on improving community infrastructure through sustainable construction projects.', 'info@brightfuturebuilders.org', 'brightfuture-logo.png'),
('GreenHarvest Growers', 'An urban farming collective promoting food sustainability and education in local neighborhoods.', 'contact@greenharvest.org', 'greenharvest-logo.png'),
('UnityServe Volunteers', 'A volunteer coordination group supporting local charities and service initiatives.', 'hello@unityserve.org', 'unityserve-logo.png');

-- -------------------------------------------------------------
-- Service Projects (W02 Team Activity)
-- Each project is sponsored by exactly one organization (one-to-many).
-- -------------------------------------------------------------
CREATE TABLE project (
    project_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organization(organization_id),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    project_date DATE NOT NULL
);

-- Foreign keys are not indexed automatically in PostgreSQL; this speeds up the join
CREATE INDEX idx_project_organization_id ON project(organization_id);

INSERT INTO project (organization_id, title, description, location, project_date) VALUES
-- BrightFuture Builders
((SELECT organization_id FROM organization WHERE name = 'BrightFuture Builders'), 'Community Center Roof Repair', 'Help replace damaged shingles and gutters on the neighborhood community center.', 'Eastside Community Center', '2026-11-14'),
((SELECT organization_id FROM organization WHERE name = 'BrightFuture Builders'), 'Accessible Ramp Build', 'Construct wheelchair ramps for elderly and disabled residents.', 'Maple Street Neighborhood', '2026-11-21'),
((SELECT organization_id FROM organization WHERE name = 'BrightFuture Builders'), 'Playground Restoration', 'Sand, repaint, and repair equipment at a local playground.', 'Riverside Park', '2026-12-05'),
((SELECT organization_id FROM organization WHERE name = 'BrightFuture Builders'), 'Solar Panel Installation Day', 'Assist certified installers in mounting solar panels on a shelter roof.', 'Hope Family Shelter', '2027-01-16'),
((SELECT organization_id FROM organization WHERE name = 'BrightFuture Builders'), 'Habitat Home Framing', 'Frame walls for a new affordable home using sustainable lumber.', 'Oak Hollow Development', '2027-02-06'),
-- GreenHarvest Growers
((SELECT organization_id FROM organization WHERE name = 'GreenHarvest Growers'), 'Fall Garden Cleanup', 'Clear spent plants and prepare raised beds for winter.', 'Downtown Community Garden', '2026-11-08'),
((SELECT organization_id FROM organization WHERE name = 'GreenHarvest Growers'), 'Composting Workshop', 'Teach families how to start and maintain a backyard compost bin.', 'Lincoln Public Library', '2026-11-19'),
((SELECT organization_id FROM organization WHERE name = 'GreenHarvest Growers'), 'Greenhouse Seed Starting', 'Plant seedlings for the spring neighborhood produce program.', 'GreenHarvest Greenhouse', '2027-01-23'),
((SELECT organization_id FROM organization WHERE name = 'GreenHarvest Growers'), 'School Garden Build', 'Build raised garden beds and an irrigation line for an elementary school.', 'Jefferson Elementary School', '2027-03-13'),
((SELECT organization_id FROM organization WHERE name = 'GreenHarvest Growers'), 'Fresh Produce Market Day', 'Harvest and distribute free produce to local families.', 'Central Plaza', '2027-04-10'),
-- UnityServe Volunteers
((SELECT organization_id FROM organization WHERE name = 'UnityServe Volunteers'), 'Thanksgiving Food Drive', 'Collect, sort, and pack food donations for the holiday season.', 'UnityServe Warehouse', '2026-11-22'),
((SELECT organization_id FROM organization WHERE name = 'UnityServe Volunteers'), 'Winter Coat Collection', 'Gather and distribute warm coats to children and families in need.', 'Westgate Mall', '2026-12-12'),
((SELECT organization_id FROM organization WHERE name = 'UnityServe Volunteers'), 'Senior Center Holiday Visit', 'Spend an afternoon playing games and sharing a meal with seniors.', 'Golden Years Senior Center', '2026-12-19'),
((SELECT organization_id FROM organization WHERE name = 'UnityServe Volunteers'), 'Literacy Tutoring Night', 'Read with and tutor elementary students working on reading skills.', 'Lincoln Public Library', '2027-01-28'),
((SELECT organization_id FROM organization WHERE name = 'UnityServe Volunteers'), 'Park Cleanup Day', 'Pick up litter and clear trails to make local parks beautiful.', 'Riverside Park', '2027-03-20');

-- -------------------------------------------------------------
-- Categories (W02 Assignment)
-- A project can belong to many categories and a category can
-- contain many projects (many-to-many), so a join table is used.
-- -------------------------------------------------------------
CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE project_category (
    project_id INTEGER NOT NULL REFERENCES project(project_id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES category(category_id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, category_id)
);

-- The composite primary key already indexes lookups by project_id;
-- this index speeds up lookups by category_id (e.g. "all projects in a category")
CREATE INDEX idx_project_category_category_id ON project_category(category_id);

INSERT INTO category (name) VALUES
('Environmental'),
('Educational'),
('Community Service'),
('Health & Wellness');

-- Associate every project with at least one category
INSERT INTO project_category (project_id, category_id)
SELECT p.project_id, c.category_id
FROM (VALUES
    ('Fall Garden Cleanup', 'Environmental'),
    ('Composting Workshop', 'Environmental'),
    ('Composting Workshop', 'Educational'),
    ('Greenhouse Seed Starting', 'Environmental'),
    ('School Garden Build', 'Environmental'),
    ('School Garden Build', 'Educational'),
    ('Fresh Produce Market Day', 'Community Service'),
    ('Fresh Produce Market Day', 'Health & Wellness'),
    ('Community Center Roof Repair', 'Community Service'),
    ('Accessible Ramp Build', 'Community Service'),
    ('Accessible Ramp Build', 'Health & Wellness'),
    ('Playground Restoration', 'Community Service'),
    ('Solar Panel Installation Day', 'Environmental'),
    ('Solar Panel Installation Day', 'Community Service'),
    ('Habitat Home Framing', 'Community Service'),
    ('Thanksgiving Food Drive', 'Community Service'),
    ('Thanksgiving Food Drive', 'Health & Wellness'),
    ('Winter Coat Collection', 'Community Service'),
    ('Senior Center Holiday Visit', 'Community Service'),
    ('Senior Center Holiday Visit', 'Health & Wellness'),
    ('Literacy Tutoring Night', 'Educational'),
    ('Park Cleanup Day', 'Environmental'),
    ('Park Cleanup Day', 'Community Service')
) AS pc(project_title, category_name)
JOIN project p ON p.title = pc.project_title
JOIN category c ON c.name = pc.category_name;
