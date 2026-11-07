-- Requires: {{schema}}.project and {{schema}}.category default data (matched by project title and category name)
INSERT INTO {{schema}}.project_category (project_id, category_id)
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
JOIN {{schema}}.project p ON p.title = pc.project_title
JOIN {{schema}}.category c ON c.name = pc.category_name;
