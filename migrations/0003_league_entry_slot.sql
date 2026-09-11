ALTER TABLE league_participants
ADD COLUMN eligible_from_slot INTEGER NOT NULL DEFAULT 1
CHECK (eligible_from_slot BETWEEN 1 AND 6);
