UPDATE {{schema}}.organization
SET name = $1, description = $2, contact_email = $3, logo_filename = $4
WHERE organization_id = $5
RETURNING organization_id;
