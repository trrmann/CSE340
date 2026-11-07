-- Requires: {{schema}}.organization default data (rows are matched by organization name)
INSERT INTO {{schema}}.project (organization_id, title, description, location, project_date) VALUES
-- BrightFuture Builders
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'BrightFuture Builders'), 'Community Center Roof Repair', 'Help replace damaged shingles and gutters on the neighborhood community center.', 'Eastside Community Center', '2026-11-14'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'BrightFuture Builders'), 'Accessible Ramp Build', 'Construct wheelchair ramps for elderly and disabled residents.', 'Maple Street Neighborhood', '2026-11-21'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'BrightFuture Builders'), 'Playground Restoration', 'Sand, repaint, and repair equipment at a local playground.', 'Riverside Park', '2026-12-05'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'BrightFuture Builders'), 'Solar Panel Installation Day', 'Assist certified installers in mounting solar panels on a shelter roof.', 'Hope Family Shelter', '2027-01-16'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'BrightFuture Builders'), 'Habitat Home Framing', 'Frame walls for a new affordable home using sustainable lumber.', 'Oak Hollow Development', '2027-02-06'),
-- GreenHarvest Growers
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'GreenHarvest Growers'), 'Fall Garden Cleanup', 'Clear spent plants and prepare raised beds for winter.', 'Downtown Community Garden', '2026-11-08'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'GreenHarvest Growers'), 'Composting Workshop', 'Teach families how to start and maintain a backyard compost bin.', 'Lincoln Public Library', '2026-11-19'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'GreenHarvest Growers'), 'Greenhouse Seed Starting', 'Plant seedlings for the spring neighborhood produce program.', 'GreenHarvest Greenhouse', '2027-01-23'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'GreenHarvest Growers'), 'School Garden Build', 'Build raised garden beds and an irrigation line for an elementary school.', 'Jefferson Elementary School', '2027-03-13'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'GreenHarvest Growers'), 'Fresh Produce Market Day', 'Harvest and distribute free produce to local families.', 'Central Plaza', '2027-04-10'),
-- UnityServe Volunteers
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'UnityServe Volunteers'), 'Thanksgiving Food Drive', 'Collect, sort, and pack food donations for the holiday season.', 'UnityServe Warehouse', '2026-11-22'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'UnityServe Volunteers'), 'Winter Coat Collection', 'Gather and distribute warm coats to children and families in need.', 'Westgate Mall', '2026-12-12'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'UnityServe Volunteers'), 'Senior Center Holiday Visit', 'Spend an afternoon playing games and sharing a meal with seniors.', 'Golden Years Senior Center', '2026-12-19'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'UnityServe Volunteers'), 'Literacy Tutoring Night', 'Read with and tutor elementary students working on reading skills.', 'Lincoln Public Library', '2027-01-28'),
((SELECT organization_id FROM {{schema}}.organization WHERE name = 'UnityServe Volunteers'), 'Park Cleanup Day', 'Pick up litter and clear trails to make local parks beautiful.', 'Riverside Park', '2027-03-20');
