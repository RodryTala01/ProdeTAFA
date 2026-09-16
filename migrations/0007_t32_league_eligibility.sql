ALTER TABLE season_division_members
ADD COLUMN eligible_from_sequence INTEGER NOT NULL DEFAULT 1
CHECK (eligible_from_sequence BETWEEN 1 AND 6);
