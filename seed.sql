-- MFTS Portal Seed Data
-- Run this after drizzle-kit push creates the tables.
-- Usage: psql $DATABASE_URL -f seed.sql

-- Team Members
INSERT INTO team_members (name, role, email, avatar_initials, is_client) VALUES
  ('Velved S.', 'Project Lead', 'v@agency-6.com', 'VS', false),
  ('Brandon F.', 'UI/UX Designer', 'brandon@agency-6.com', 'BF', false),
  ('Miguel C.', 'Web Developer', 'miguel@agency-6.com', 'MC', false),
  ('Dena Stearns', 'Client Contact', 'dena@farmtoschool.org', 'DS', true)
ON CONFLICT DO NOTHING;

-- Portal Users (will be linked to Supabase Auth on first login)
INSERT INTO users (email, name, role, avatar_initials, team_member_id, created_at) VALUES
  ('v@agency-6.com', 'Velved Stevenson', 'admin', 'VS', 1, '2026-02-09T00:00:00.000Z'),
  ('brandon@agency-6.com', 'Brandon F.', 'team', 'BF', 2, '2026-02-09T00:00:00.000Z'),
  ('miguel@agency-6.com', 'Miguel C.', 'team', 'MC', 3, '2026-02-09T00:00:00.000Z'),
  ('dena@farmtoschool.org', 'Dena Stearns', 'client', 'DS', 4, '2026-02-09T00:00:00.000Z')
ON CONFLICT (email) DO NOTHING;

-- Phases
INSERT INTO phases (name, description, status, start_date, due_date, sort_order) VALUES
  ('Research & Planning', 'Kickoff, research, content audit, and sitemap planning', 'in_progress', '2026-02-09', '2026-03-22', 1),
  ('Prototyping', 'Wireframes and interactive prototype', 'not_started', '2026-03-23', '2026-04-19', 2),
  ('Design', 'High-fidelity visual design comps', 'not_started', '2026-04-20', '2026-05-17', 3),
  ('Build', 'Full WordPress development and integration', 'not_started', '2026-05-18', '2026-07-12', 4),
  ('Review & Launch', 'QA, feedback rounds, go-live', 'not_started', '2026-07-13', '2026-08-10', 5)
ON CONFLICT DO NOTHING;

-- Tasks
INSERT INTO tasks (phase_id, title, description, status, priority, due_date, assignee_id, hours, cost, sort_order, created_at) VALUES
  -- Phase 1: Research & Planning
  (1, 'Project Kickoff Meeting', 'Initial meeting with client to align on goals, timeline, and process', 'completed', 'high', '2026-02-14', 1, 3, 300, 1, '2026-02-09T00:00:00.000Z'),
  (1, 'Website Research & Audit', 'Review current site, analytics, competitor research, and best practices', 'in_progress', 'high', '2026-02-28', 1, 8, 800, 2, '2026-02-09T00:00:00.000Z'),
  (1, 'Content Audit', 'Catalog all existing content pages and assess quality/relevance', 'in_progress', 'medium', '2026-03-07', 2, 5, 500, 3, '2026-02-09T00:00:00.000Z'),
  (1, 'Sitemap Planning', 'Define new site architecture and page hierarchy', 'todo', 'medium', '2026-03-22', 1, 4, 400, 4, '2026-02-09T00:00:00.000Z'),

  -- Phase 2: Prototyping
  (2, 'Lo-fi Wireframes', 'Create low-fidelity wireframes for key page templates', 'todo', 'high', '2026-04-05', 2, 10, 1000, 1, '2026-02-09T00:00:00.000Z'),
  (2, 'Client Wireframe Review', 'Present wireframes to client for feedback', 'todo', 'medium', '2026-04-09', 1, 3, 300, 2, '2026-02-09T00:00:00.000Z'),
  (2, 'Interactive Prototype', 'Build clickable prototype in Figma', 'todo', 'medium', '2026-04-19', 2, 8, 800, 3, '2026-02-09T00:00:00.000Z'),

  -- Phase 3: Design
  (3, 'Visual Design Comps', 'Create high-fidelity designs for homepage, interior, and special templates', 'todo', 'high', '2026-05-03', 2, 15, 1500, 1, '2026-02-09T00:00:00.000Z'),
  (3, 'Design Review & Revisions', 'Client review of visual designs with 2 rounds of revisions', 'todo', 'medium', '2026-05-10', 2, 5, 500, 2, '2026-02-09T00:00:00.000Z'),
  (3, 'Design System & Assets', 'Finalize brand assets, icon set, and design system documentation', 'todo', 'low', '2026-05-17', 2, 5, 500, 3, '2026-02-09T00:00:00.000Z'),

  -- Phase 4: Build
  (4, 'WordPress Setup & Theme', 'Set up WordPress, configure theme, install required plugins', 'todo', 'high', '2026-05-25', 3, 8, 800, 1, '2026-02-09T00:00:00.000Z'),
  (4, 'Page Template Development', 'Build all custom page templates per approved designs', 'todo', 'high', '2026-06-15', 3, 20, 2000, 2, '2026-02-09T00:00:00.000Z'),
  (4, 'Content Migration', 'Migrate approved content into new templates', 'todo', 'medium', '2026-06-28', 3, 10, 1000, 3, '2026-02-09T00:00:00.000Z'),
  (4, 'Functionality & Integrations', 'Newsletter signup, forms, maps, third-party integrations', 'todo', 'medium', '2026-07-12', 3, 8, 800, 4, '2026-02-09T00:00:00.000Z'),

  -- Phase 5: Review & Launch
  (5, 'Internal QA Testing', 'Cross-browser, responsive testing, accessibility checks', 'todo', 'high', '2026-07-20', 3, 5, 500, 1, '2026-02-09T00:00:00.000Z'),
  (5, 'Client UAT', 'Client user acceptance testing with feedback rounds', 'todo', 'high', '2026-07-30', 1, 5, 500, 2, '2026-02-09T00:00:00.000Z'),
  (5, 'Launch & Go-Live', 'DNS cutover, SSL, performance optimization, and launch', 'todo', 'urgent', '2026-08-10', 3, 3, 300, 3, '2026-02-09T00:00:00.000Z')
ON CONFLICT DO NOTHING;

-- Seed Comments (collaborative conversation examples)
INSERT INTO comments (task_id, author_id, content, created_at) VALUES
  (1, 1, 'Kickoff went great. Dena confirmed the primary goal is increasing donations and volunteer signups.', '2026-02-14T15:30:00.000Z'),
  (1, 4, 'Thanks Velved! I also want to make sure we highlight our new partnership with Boston Public Schools prominently.', '2026-02-14T16:45:00.000Z'),
  (2, 1, 'Pulled analytics — the current site gets ~2,400 monthly visits. Most traffic comes from organic search and referrals from school district sites.', '2026-02-18T10:00:00.000Z'),
  (2, 2, 'Looked at 5 competitor farm-to-school sites. Common patterns: hero video, impact stats above fold, clear donate/volunteer CTAs. Will share a moodboard.', '2026-02-20T14:30:00.000Z'),
  (3, 2, 'Starting the content audit. Found 47 pages on the current site — about 15 look outdated or redundant.', '2026-02-24T09:15:00.000Z'),
  (3, 4, 'We can probably consolidate the 6 separate program pages into 2 or 3. Happy to prioritize which content matters most.', '2026-02-25T11:00:00.000Z'),
  (2, 3, 'From a dev perspective, their current WordPress install is v5.2 with 23 plugins (8 inactive). We should do a clean install for the rebuild.', '2026-02-22T16:00:00.000Z'),
  (1, 1, 'Action items from kickoff documented and shared with the team. Next checkpoint is the research review on March 1st.', '2026-02-15T09:00:00.000Z')
ON CONFLICT DO NOTHING;
