CREATE DATABASE IF NOT EXISTS huellas_callejeras
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE huellas_callejeras;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'entidad', 'usuario') NOT NULL DEFAULT 'usuario',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS pets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  species ENUM('perro', 'gato', 'otro') NOT NULL,
  breed VARCHAR(120) NOT NULL DEFAULT '',
  age VARCHAR(80) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  photo_url VARCHAR(2048) NOT NULL DEFAULT '',
  status ENUM('available', 'adopted') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pets_status (status)
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  species ENUM('perro', 'gato', 'otro') NOT NULL DEFAULT 'otro',
  status ENUM('visto', 'herido', 'rescate', 'rescatado') NOT NULL DEFAULT 'visto',
  description TEXT NOT NULL,
  photo_url VARCHAR(2048) NOT NULL DEFAULT '',
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  author_name VARCHAR(120) NOT NULL DEFAULT 'Visitante',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_status (status),
  KEY idx_reports_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS donations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  donor_name VARCHAR(120) NOT NULL,
  donor_email VARCHAR(190) NOT NULL,
  donation_type ENUM('money', 'in_kind') NOT NULL,
  amount DECIMAL(12, 2) NULL,
  items TEXT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  address VARCHAR(255) NOT NULL DEFAULT '',
  status ENUM('pending', 'confirmed', 'received', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_donations_status (status),
  KEY idx_donations_created_at (created_at),
  CONSTRAINT fk_donations_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('new', 'read', 'resolved') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_status (status),
  KEY idx_messages_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL,
  expires BIGINT UNSIGNED NOT NULL,
  data MEDIUMTEXT NOT NULL,
  PRIMARY KEY (session_id),
  KEY idx_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
