-- NazVik Farmhouse Booking — isolated demo schema only.
-- The browser-side PIN checks and permissive policies below do not secure real data.
-- Never apply this schema to a production project or one containing personal data.

-- Families table
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  family_name TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  priority_score INTEGER NOT NULL DEFAULT 250,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  avatar_url TEXT NOT NULL DEFAULT ''
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  invited_family_id TEXT REFERENCES families(id) ON DELETE SET NULL,
  initiator_family_id TEXT REFERENCES families(id) ON DELETE SET NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE,
  check_in_time TEXT,
  booking_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  cost_points INTEGER NOT NULL DEFAULT 0,
  guest_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  inspector_family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  is_clean BOOLEAN NOT NULL,
  evidence_photo_url TEXT,
  comments TEXT,
  checklist JSONB,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  related_id TEXT,
  type TEXT NOT NULL DEFAULT 'system',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Demo-only RLS policies: allow all operations to the browser's public key.
CREATE POLICY "Allow all" ON families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Seed demo families
INSERT INTO families (id, family_name, pin_code, priority_score, role, avatar_url)
VALUES
  ('fam1', 'Demo Family A', '0001', 320, 'MEMBER', ''),
  ('fam2', 'Demo Family B', '0002', 280, 'MEMBER', ''),
  ('fam3', 'Demo Family C', '0003', 250, 'MEMBER', ''),
  ('fam4', 'Demo Family D', '0004', 190, 'MEMBER', '')
ON CONFLICT (id) DO NOTHING;

-- Seed demo bookings
INSERT INTO bookings (id, family_id, invited_family_id, initiator_family_id, check_in_date, check_out_date, check_in_time, booking_type, status, cost_points, guest_count, created_at)
VALUES
  ('bk1', 'fam2', null, null, CURRENT_DATE + 7, CURRENT_DATE + 9, 'afternoon', 'Family', 'Confirmed', 10, 4, NOW()),
  ('bk2', 'fam3', null, null, CURRENT_DATE - 20, CURRENT_DATE - 18, 'morning', 'Friends', 'Completed', 16, 3, NOW() - INTERVAL '21 days'),
  ('bk3', 'fam1', null, null, CURRENT_DATE + 15, CURRENT_DATE + 18, 'evening', 'Family', 'Confirmed', 15, 5, NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed demo notifications
INSERT INTO notifications (id, family_id, related_id, type, message, is_read, created_at)
VALUES
  ('n1', 'fam1', null, 'system', 'Your booking has been confirmed!', false, NOW()),
  ('n2', 'fam1', null, 'system', 'House inspection checklist is available.', true, NOW()),
  ('n3', 'fam2', null, 'system', 'Review your upcoming stay in the app.', false, NOW())
ON CONFLICT (id) DO NOTHING;


-- House Settings table
CREATE TABLE IF NOT EXISTS house_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  wifi JSONB NOT NULL DEFAULT '{"ssid":"Demo Wi-Fi","password":"demo-only-password"}',
  emergency JSONB NOT NULL DEFAULT '[{"name":"Demo contact","number":"000-000-0000"}]',
  location JSONB NOT NULL DEFAULT '{"lat":0,"lng":0,"label":"Demo location"}',
  checklist JSONB NOT NULL DEFAULT '[{"id":"tv","label":"TV / Remote working"},{"id":"ac","label":"AC / Heater working"},{"id":"fridge","label":"Fridge clean & running"},{"id":"beds","label":"Bedsheets & pillows clean"},{"id":"bath","label":"Bathroom clean, water heater ok"},{"id":"kitchen","label":"Kitchen utensils intact"},{"id":"doors","label":"All doors & windows lock properly"},{"id":"wifi","label":"WiFi router powered on"}]',
  rules JSONB NOT NULL DEFAULT '["Check-out by 12:00 PM. Late checkout costs 5 pts/hour.","Clean up before leaving — next family appreciates it.","No smoking inside the house.","Lock all doors and gates when leaving.","Report any damage immediately via the app.","Pets allowed only in the outdoor area."]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default row if not exists
INSERT INTO house_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Checkout Photos table (area photos uploaded during checkout)
CREATE TABLE IF NOT EXISTS checkout_photos (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE checkout_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON checkout_photos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE house_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON house_settings FOR ALL USING (true) WITH CHECK (true);
