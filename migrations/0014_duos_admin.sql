-- Persist the origin of survival tiebreaks without creating 1v1 survival encounters.
CREATE TABLE competition_survival_tiebreaks (
 round_link_id INTEGER PRIMARY KEY REFERENCES competition_round_links(id),
 tiebreak_id INTEGER NOT NULL UNIQUE REFERENCES competition_tiebreaks(id),
 source_points_json TEXT NOT NULL CHECK(json_valid(source_points_json))
);
ALTER TABLE competition_survival_results ADD COLUMN members_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(members_json));
