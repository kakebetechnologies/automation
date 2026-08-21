-- Falcon ERP — database schema
-- MySQL / MariaDB, InnoDB, utf8mb4

CREATE DATABASE IF NOT EXISTS falcon_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE falcon_erp;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS order_documents;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS driver_compliance_documents;
DROP TABLE IF EXISTS tracking_events;
DROP TABLE IF EXISTS dispatch_notes;
DROP TABLE IF EXISTS client_invoices;
DROP TABLE IF EXISTS supplier_invoices;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS client_requests;
DROP TABLE IF EXISTS supplier_products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS clients;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Core entities
-- ---------------------------------------------------------------------

CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  country VARCHAR(100) NULL,
  contact_person VARCHAR(150) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  contact_person VARCHAR(150) NULL,
  email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  warehouse_address VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NULL,
  vehicle_plate VARCHAR(20) NULL,
  vehicle_model VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('merchant','supplier','client','driver') NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  username VARCHAR(100) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  initials VARCHAR(4) NULL,
  client_id INT NULL,
  supplier_id INT NULL,
  driver_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT chk_users_role_link CHECK (
    (role = 'merchant' AND client_id IS NULL AND supplier_id IS NULL AND driver_id IS NULL) OR
    (role = 'client'   AND client_id IS NOT NULL AND supplier_id IS NULL AND driver_id IS NULL) OR
    (role = 'supplier' AND supplier_id IS NOT NULL AND client_id IS NULL AND driver_id IS NULL) OR
    (role = 'driver'   AND driver_id IS NOT NULL AND client_id IS NULL AND supplier_id IS NULL)
  )
) ENGINE=InnoDB;

CREATE INDEX idx_users_client ON users(client_id);
CREATE INDEX idx_users_supplier ON users(supplier_id);
CREATE INDEX idx_users_driver ON users(driver_id);

-- ---------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------

CREATE TABLE supplier_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NULL,
  pack VARCHAR(100) NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  price_ugx DECIMAL(12,2) NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sp_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=9001;

CREATE INDEX idx_sp_supplier ON supplier_products(supplier_id);

-- ---------------------------------------------------------------------
-- Files (generic attachment store)
-- ---------------------------------------------------------------------

CREATE TABLE files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_type ENUM('receipt','grn_photo','grn_signature','compliance_doc','avatar','order_document') NOT NULL,
  uploaded_by_user_id INT NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_files_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Order pipeline (the spine)
-- ---------------------------------------------------------------------

CREATE TABLE client_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  created_by_user_id INT NOT NULL,
  destination VARCHAR(255) NOT NULL,
  supplier_product_id INT NULL,
  product_name VARCHAR(150) NOT NULL,
  unit_usd DECIMAL(10,2) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  total_usd DECIMAL(12,2) NOT NULL,
  status ENUM(
    'Pending Approval','Rejected','Awaiting Payment','Payment Submitted','Paid',
    'Sourcing','Ready for Dispatch','Assigned','Picked Up','In Transit','Border Crossed','Delivered'
  ) NOT NULL DEFAULT 'Pending Approval',
  reject_reason VARCHAR(500) NULL,
  supplier_id INT NULL,
  driver_id INT NULL,
  eta_date DATE NULL,
  receipt_method ENUM('Bank Transfer','Mobile Money') NULL,
  receipt_amount DECIMAL(12,2) NULL,
  receipt_uploaded_at DATETIME NULL,
  receipt_file_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cr_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cr_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cr_product FOREIGN KEY (supplier_product_id) REFERENCES supplier_products(id) ON DELETE SET NULL,
  CONSTRAINT fk_cr_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  CONSTRAINT fk_cr_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT fk_cr_receipt_file FOREIGN KEY (receipt_file_id) REFERENCES files(id) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5001;

CREATE INDEX idx_cr_status ON client_requests(status);
CREATE INDEX idx_cr_driver ON client_requests(driver_id);
CREATE INDEX idx_cr_client ON client_requests(client_id);
CREATE INDEX idx_cr_supplier ON client_requests(supplier_id);

CREATE TABLE purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NULL UNIQUE,
  supplier_id INT NOT NULL,
  supplier_product_id INT NULL,
  product_name VARCHAR(150) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  unit_usd DECIMAL(10,2) NOT NULL,
  total_usd DECIMAL(12,2) NOT NULL,
  status ENUM('Ordered','Prepared') NOT NULL DEFAULT 'Ordered',
  batch_number VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  prepared_at DATETIME NULL,
  CONSTRAINT fk_po_request FOREIGN KEY (request_id) REFERENCES client_requests(id) ON DELETE RESTRICT,
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_po_product FOREIGN KEY (supplier_product_id) REFERENCES supplier_products(id) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2001;

CREATE INDEX idx_po_supplier_status ON purchase_orders(supplier_id, status);

CREATE TABLE supplier_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_id INT NOT NULL UNIQUE,
  issued_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sinv_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3001;

CREATE TABLE client_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL UNIQUE,
  issued_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_request FOREIGN KEY (request_id) REFERENCES client_requests(id) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=6001;

CREATE TABLE dispatch_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL UNIQUE,
  pickup_location VARCHAR(255) NOT NULL,
  issued_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dn_request FOREIGN KEY (request_id) REFERENCES client_requests(id) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=7001;

CREATE TABLE tracking_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  type ENUM('Picked Up','Halfway','Border Crossed','Delivered') NOT NULL,
  occurred_at DATETIME NOT NULL,
  lat DECIMAL(9,6) NULL,
  lng DECIMAL(9,6) NULL,
  geo_status ENUM('ok','denied','unsupported','unavailable') NOT NULL DEFAULT 'unavailable',
  driver_id INT NULL,
  vehicle_snapshot VARCHAR(150) NULL,
  confirmed_qty INT UNSIGNED NULL,
  photo_file_id INT NULL,
  signature_file_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ev_request FOREIGN KEY (request_id) REFERENCES client_requests(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ev_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  CONSTRAINT fk_ev_photo FOREIGN KEY (photo_file_id) REFERENCES files(id) ON DELETE SET NULL,
  CONSTRAINT fk_ev_signature FOREIGN KEY (signature_file_id) REFERENCES files(id) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1;

CREATE INDEX idx_ev_request ON tracking_events(request_id);

-- ---------------------------------------------------------------------
-- Driver compliance
-- ---------------------------------------------------------------------

CREATE TABLE driver_compliance_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  doc_type ENUM('Passport','Driving Permit','Yellow Fever Certificate','Vehicle Registration','Insurance') NOT NULL,
  document_number VARCHAR(100) NULL,
  issued_date DATE NULL,
  expires_date DATE NULL,
  file_id INT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  verified_by_user_id INT NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_driver_doctype (driver_id, doc_type),
  CONSTRAINT fk_dcd_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
  CONSTRAINT fk_dcd_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
  CONSTRAINT fk_dcd_verifier FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Export/customs documents (regulatory docs held per order — uploaded and
-- verified by the merchant; the other two document types Falcon itself
-- issues — Sales Contract, Commercial Invoice — are generated on the fly
-- from order data, same as the existing Sales Invoice, and have no row here)
-- ---------------------------------------------------------------------

CREATE TABLE order_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  doc_type ENUM('Certificate of Origin','UNBS Certificate','Export Declaration','VAT Certificate') NOT NULL,
  file_id INT NULL,
  uploaded_by_user_id INT NULL,
  uploaded_at DATETIME NULL,
  notes VARCHAR(500) NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  verified_by_user_id INT NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_request_doctype (request_id, doc_type),
  CONSTRAINT fk_od_request FOREIGN KEY (request_id) REFERENCES client_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_od_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
  CONSTRAINT fk_od_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_od_verifier FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('merchant','supplier','client','driver') NOT NULL,
  client_id INT NULL,
  supplier_id INT NULL,
  driver_id INT NULL,
  subject VARCHAR(200) NOT NULL,
  body VARCHAR(500) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_notif_role_client ON notifications(role, client_id);
CREATE INDEX idx_notif_role_supplier ON notifications(role, supplier_id);
CREATE INDEX idx_notif_role_driver ON notifications(role, driver_id);
