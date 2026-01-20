-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user','owner','admin')),
  photo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- CLUBS
-- =========================
CREATE TABLE IF NOT EXISTS clubs (
  club_id SERIAL PRIMARY KEY,
  owner_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  name VARCHAR(120) NOT NULL,
  city VARCHAR(80) NOT NULL,
  address VARCHAR(255) NOT NULL,

  lat DECIMAL(9,6),
  lon DECIMAL(9,6),

  phone_number VARCHAR(30),
  maps_url VARCHAR(255),
  whatsapp VARCHAR(50),

  about TEXT,
  cover_url VARCHAR(255),
  logo_url VARCHAR(255),

  rules TEXT,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_images (
  image_id SERIAL PRIMARY KEY,
  club_id INT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
  image_url VARCHAR(255) NOT NULL,
  position INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS club_facilities (
  facility_id SERIAL PRIMARY KEY,
  club_id INT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
  icon VARCHAR(20),
  label VARCHAR(80) NOT NULL
);

-- =========================
-- COURTS
-- =========================
CREATE TABLE IF NOT EXISTS courts (
  court_id SERIAL PRIMARY KEY,
  club_id INT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,

  name VARCHAR(120) NOT NULL,
  type VARCHAR(80),
  surface VARCHAR(60),
  about TEXT,
  lighting VARCHAR(60),

  max_players INT DEFAULT 4 CHECK (max_players BETWEEN 1 AND 10),

  features TEXT,
  cover_url VARCHAR(255),
  rules TEXT,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Optional correctness: court type is Indoor/Outdoor only
-- (we will ADD it in migration)
-- CHECK (type IN ('Indoor','Outdoor'))

CREATE TABLE IF NOT EXISTS court_images (
  image_id SERIAL PRIMARY KEY,
  court_id INT NOT NULL REFERENCES courts(court_id) ON DELETE CASCADE,
  image_url VARCHAR(255) NOT NULL,
  position INT DEFAULT 0
);

-- =========================
-- TIME SLOTS
-- =========================
CREATE TABLE IF NOT EXISTS time_slots (
  slot_id SERIAL PRIMARY KEY,
  court_id INT NOT NULL REFERENCES courts(court_id) ON DELETE CASCADE,

  time_from TIME NOT NULL,
  time_to TIME NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),

  is_active BOOLEAN DEFAULT TRUE,

  CONSTRAINT chk_slot_time CHECK (time_to > time_from),
  CONSTRAINT uq_court_slot UNIQUE (court_id, time_from, time_to)
);

-- =========================
-- RESERVATIONS
-- =========================
-- Keep club_id BUT enforce it matches the court's club by a trigger (migration below)
CREATE TABLE IF NOT EXISTS reservations (
  reservation_id SERIAL PRIMARY KEY,

  club_id INT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
  court_id INT NOT NULL REFERENCES courts(court_id) ON DELETE CASCADE,
  slot_id INT NOT NULL REFERENCES time_slots(slot_id) ON DELETE CASCADE,

  user_id INT REFERENCES users(user_id) ON DELETE SET NULL,

  booking_id VARCHAR(30) UNIQUE NOT NULL,
  date_iso DATE NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active','Cancelled','Completed')),

  booked_by_name VARCHAR(120),
  phone VARCHAR(20),

  player1 VARCHAR(60),
  player2 VARCHAR(60),
  player3 VARCHAR(60),
  player4 VARCHAR(60),

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT uq_booking UNIQUE (court_id, date_iso, slot_id)
);

-- =========================
-- REVIEWS
-- =========================
CREATE TABLE IF NOT EXISTS reviews (
  review_id SERIAL PRIMARY KEY,
  club_id INT NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
  user_id INT REFERENCES users(user_id) ON DELETE SET NULL,

  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_images (
  image_id SERIAL PRIMARY KEY,
  review_id INT NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
  image_url VARCHAR(255) NOT NULL,
  position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- INDEXES (same as yours)
-- =========================
CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_courts_club ON courts(club_id);

CREATE INDEX IF NOT EXISTS idx_club_images_club ON club_images(club_id);
CREATE INDEX IF NOT EXISTS idx_club_facilities_club ON club_facilities(club_id);

CREATE INDEX IF NOT EXISTS idx_court_images_court ON court_images(court_id);
CREATE INDEX IF NOT EXISTS idx_slots_court ON time_slots(court_id);

CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date_iso);
CREATE INDEX IF NOT EXISTS idx_reservations_club ON reservations(club_id);
CREATE INDEX IF NOT EXISTS idx_reservations_court ON reservations(court_id);

CREATE INDEX IF NOT EXISTS idx_reviews_club ON reviews(club_id);
CREATE INDEX IF NOT EXISTS idx_review_images_review ON review_images(review_id);