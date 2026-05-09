-- Venue options added by the event captain (up to 3 per event)
CREATE TABLE vote_options (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  option_text text        NOT NULL CHECK (char_length(option_text) > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, option_text)
);

-- One vote per user per event; option_text references the chosen vote_option
CREATE TABLE votes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_text text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX ON vote_options (event_id);
CREATE INDEX ON votes        (event_id);

ALTER TABLE vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes        ENABLE ROW LEVEL SECURITY;

-- Group members and captains can read options and votes for their events
CREATE POLICY "vote_options: group members can read"
  ON vote_options FOR SELECT TO authenticated
  USING (is_group_member((SELECT group_id FROM events WHERE id = event_id))
      OR is_group_captain((SELECT group_id FROM events WHERE id = event_id)));

CREATE POLICY "votes: group members can read"
  ON votes FOR SELECT TO authenticated
  USING (is_group_member((SELECT group_id FROM events WHERE id = event_id))
      OR is_group_captain((SELECT group_id FROM events WHERE id = event_id)));
