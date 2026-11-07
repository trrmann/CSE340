CREATE TABLE IF NOT EXISTS {{schema}}.category (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);
