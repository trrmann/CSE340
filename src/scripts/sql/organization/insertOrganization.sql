INSERT INTO {{schema}}.organization (name, description, contact_email, logo_filename)
VALUES ($1, $2, $3, $4)
RETURNING organization_id;
