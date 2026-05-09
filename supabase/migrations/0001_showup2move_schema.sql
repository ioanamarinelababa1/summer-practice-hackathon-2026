-- ============================================================
-- ShowUp2Move — Initial Schema
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE skill_level  AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE group_status AS ENUM ('open', 'full', 'completed', 'cancelled');


-- ============================================================
-- TABLES
-- ============================================================

-- User profiles — 1-to-1 with auth.users
CREATE TABLE profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     text        NOT NULL UNIQUE,
  bio          text,
  avatar_url   text,
  location_lat double precision,
  location_lng double precision,
  skill_level  skill_level NOT NULL DEFAULT 'beginner',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Sports catalogue (seeded below, not user-editable)
CREATE TABLE sports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  min_players int  NOT NULL CHECK (min_players > 0),
  max_players int  NOT NULL CHECK (max_players >= min_players),
  icon        text
);

-- Sports a user plays + their skill level for each
CREATE TABLE user_sports (
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sport_id    uuid        NOT NULL REFERENCES sports(id)   ON DELETE CASCADE,
  skill_level skill_level NOT NULL DEFAULT 'beginner',
  PRIMARY KEY (user_id, sport_id)
);

-- Per-day availability slots
CREATE TABLE availability (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         date    NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- A group organised around a sport and a date
CREATE TABLE groups (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id   uuid         NOT NULL REFERENCES sports(id),
  captain_id uuid         NOT NULL REFERENCES profiles(id),
  status     group_status NOT NULL DEFAULT 'open',
  event_date date,
  location   text,
  created_at timestamptz  NOT NULL DEFAULT now()
);

-- Members of a group
CREATE TABLE group_members (
  group_id  uuid        NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  confirmed boolean     NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- In-group chat messages
CREATE TABLE messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid        NOT NULL REFERENCES groups(id)   ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Formal events attached to a group
CREATE TABLE events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  location     text,
  venue_name   text,
  scheduled_at timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX ON profiles       (username);
CREATE INDEX ON profiles       (location_lat, location_lng);
CREATE INDEX ON user_sports    (sport_id);
CREATE INDEX ON availability   (user_id, date);
CREATE INDEX ON availability   (date, is_available);
CREATE INDEX ON groups         (sport_id, status);
CREATE INDEX ON groups         (captain_id);
CREATE INDEX ON group_members  (user_id);
CREATE INDEX ON messages       (group_id, created_at DESC);
CREATE INDEX ON events         (group_id, scheduled_at);


-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create a profile row when a new auth user registers.
-- Derives username from metadata (if provided) or email prefix,
-- appending a counter to avoid collisions.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  candidate     text;
  counter       int := 0;
BEGIN
  base_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  -- Sanitise: lowercase, only alphanum + underscore
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '_', 'g'));
  candidate     := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    counter   := counter + 1;
    candidate := base_username || counter::text;
  END LOOP;

  INSERT INTO public.profiles (id, username)
  VALUES (new.id, candidate);

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- Auto-add the captain as a confirmed member when a group is created.
CREATE OR REPLACE FUNCTION add_captain_as_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, confirmed)
  VALUES (new.id, new.captain_id, true)
  ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_group_created
  AFTER INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION add_captain_as_member();


-- Auto-update group status to 'full' when member count reaches max_players.
CREATE OR REPLACE FUNCTION sync_group_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
  max_count     int;
BEGIN
  SELECT COUNT(*)
  INTO current_count
  FROM public.group_members
  WHERE group_id = COALESCE(new.group_id, old.group_id);

  SELECT s.max_players
  INTO max_count
  FROM public.groups g
  JOIN public.sports s ON s.id = g.sport_id
  WHERE g.id = COALESCE(new.group_id, old.group_id);

  UPDATE public.groups
  SET status = CASE
    WHEN current_count >= max_count THEN 'full'::group_status
    ELSE 'open'::group_status
  END
  WHERE id = COALESCE(new.group_id, old.group_id)
    AND status IN ('open', 'full');  -- don't overwrite completed/cancelled

  RETURN COALESCE(new, old);
END;
$$;

CREATE TRIGGER on_group_member_change
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION sync_group_status();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability  ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user a member of the given group?
CREATE OR REPLACE FUNCTION is_group_member(gid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = gid AND user_id = auth.uid()
  );
$$;

-- Helper: is the calling user the captain of the given group?
CREATE OR REPLACE FUNCTION is_group_captain(gid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups
    WHERE id = gid AND captain_id = auth.uid()
  );
$$;


-- profiles -------------------------------------------------------
-- Any authenticated user can view profiles (needed for discovery)
CREATE POLICY "profiles: authenticated users can read all"
  ON profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles: users insert own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: users update own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: users delete own"
  ON profiles FOR DELETE TO authenticated
  USING (auth.uid() = id);


-- sports ---------------------------------------------------------
-- Read-only catalogue; only service_role / migrations insert rows
CREATE POLICY "sports: authenticated users can read all"
  ON sports FOR SELECT TO authenticated
  USING (true);


-- user_sports ----------------------------------------------------
CREATE POLICY "user_sports: authenticated users can read all"
  ON user_sports FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "user_sports: users insert own"
  ON user_sports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sports: users update own"
  ON user_sports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sports: users delete own"
  ON user_sports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- availability ---------------------------------------------------
-- Visible to all authenticated users for matching purposes
CREATE POLICY "availability: authenticated users can read all"
  ON availability FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "availability: users insert own"
  ON availability FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "availability: users update own"
  ON availability FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "availability: users delete own"
  ON availability FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- groups ---------------------------------------------------------
-- Open groups visible to all; non-open groups visible to captain + members
CREATE POLICY "groups: read open or own"
  ON groups FOR SELECT TO authenticated
  USING (
    status = 'open'
    OR captain_id = auth.uid()
    OR is_group_member(id)
  );

CREATE POLICY "groups: captain inserts"
  ON groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "groups: captain updates"
  ON groups FOR UPDATE TO authenticated
  USING (auth.uid() = captain_id)
  WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "groups: captain deletes"
  ON groups FOR DELETE TO authenticated
  USING (auth.uid() = captain_id);


-- group_members --------------------------------------------------
CREATE POLICY "group_members: members and captain can read"
  ON group_members FOR SELECT TO authenticated
  USING (is_group_member(group_id) OR is_group_captain(group_id));

-- Any authenticated user can request to join (insert own row)
CREATE POLICY "group_members: users join own"
  ON group_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Captain confirms members; members can update their own row
CREATE POLICY "group_members: captain or self can update"
  ON group_members FOR UPDATE TO authenticated
  USING (is_group_captain(group_id) OR auth.uid() = user_id);

-- Members can leave; captain can remove members
CREATE POLICY "group_members: captain or self can delete"
  ON group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_group_captain(group_id));


-- messages -------------------------------------------------------
CREATE POLICY "messages: group members can read"
  ON messages FOR SELECT TO authenticated
  USING (is_group_member(group_id) OR is_group_captain(group_id));

CREATE POLICY "messages: group members can send"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (is_group_member(group_id) OR is_group_captain(group_id))
  );

CREATE POLICY "messages: authors can update own"
  ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authors can delete own; captain can moderate
CREATE POLICY "messages: author or captain can delete"
  ON messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_group_captain(group_id));


-- events ---------------------------------------------------------
CREATE POLICY "events: group members can read"
  ON events FOR SELECT TO authenticated
  USING (is_group_member(group_id) OR is_group_captain(group_id));

CREATE POLICY "events: captain inserts"
  ON events FOR INSERT TO authenticated
  WITH CHECK (is_group_captain(group_id));

CREATE POLICY "events: captain updates"
  ON events FOR UPDATE TO authenticated
  USING (is_group_captain(group_id));

CREATE POLICY "events: captain deletes"
  ON events FOR DELETE TO authenticated
  USING (is_group_captain(group_id));


-- ============================================================
-- SEED DATA — Sports catalogue
-- ============================================================

INSERT INTO sports (name, min_players, max_players, icon) VALUES
  ('Football',   10,  14, '⚽'),
  ('Basketball',  6,  10, '🏀'),
  ('Tennis',      2,   4, '🎾'),
  ('Volleyball',  6,  12, '🏐'),
  ('Running',     2,  10, '🏃'),
  ('Cycling',     2,  10, '🚴'),
  ('Swimming',    1,   4, '🏊');
