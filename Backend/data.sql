CREATE TABLE admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
    pid INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    number VARCHAR(15),
    email VARCHAR(100) UNIQUE,
    address TEXT,
    password VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE doctors (
    did INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    number VARCHAR(15),
    email VARCHAR(100) UNIQUE,
    address TEXT,
    password VARCHAR(255),
    fees DECIMAL(10,2),
    specialization VARCHAR(100)  -- ✅ New column
);
CREATE TABLE staff (
    sid INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    number VARCHAR(15),
    email VARCHAR(100) UNIQUE,
    address TEXT,
    password VARCHAR(255),
    salary DECIMAL(10,2)
);
CREATE TABLE room_classes (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    class_name ENUM('A', 'B', 'C') UNIQUE NOT NULL,
    charge DECIMAL(10,2) NOT NULL
);
CREATE TABLE rooms (
    rid INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    class_id INT NOT NULL,
    sid INT,
    pid INT,
    FOREIGN KEY (class_id) REFERENCES room_classes(class_id),
    FOREIGN KEY (sid) REFERENCES staff(sid) ON DELETE SET NULL,
    FOREIGN KEY (pid) REFERENCES patients(pid) ON DELETE SET NULL
);
CREATE TABLE reception (
    reid INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    number VARCHAR(15),
    email VARCHAR(100) UNIQUE,
    address TEXT,
    password VARCHAR(255)
);
CREATE TABLE bills (
    billid INT AUTO_INCREMENT PRIMARY KEY,
    pid INT,
    did INT,
    reid INT,
    amount DECIMAL(10,2),
    room_charge DECIMAL(10,2),
    medicine_charge DECIMAL(10,2),
    bill_date DATE,
    bill_time TIME,
    FOREIGN KEY (pid) REFERENCES patients(pid),
    FOREIGN KEY (did) REFERENCES doctors(did),
    FOREIGN KEY (reid) REFERENCES reception(reid)
);
CREATE TABLE appointments (
    appid INT AUTO_INCREMENT PRIMARY KEY,
    pid INT,
    did INT,
    reid INT,
    billid INT,
    rid INT,  -- Room ID
    sid INT,  -- Staff ID
    date DATE,
    time TIME,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    new_date DATE NULL,
    visited ENUM('yes', 'no') DEFAULT 'no',
    FOREIGN KEY (pid) REFERENCES patients(pid),
    FOREIGN KEY (did) REFERENCES doctors(did),
    FOREIGN KEY (reid) REFERENCES reception(reid),
    FOREIGN KEY (billid) REFERENCES bills(billid),
    FOREIGN KEY (rid) REFERENCES rooms(rid),
    FOREIGN KEY (sid) REFERENCES staff(sid)
);
CREATE TABLE medicine_master (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_name VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL
);
CREATE TABLE prescriptions (
    preid INT AUTO_INCREMENT PRIMARY KEY,
    pid INT,
    did INT,
    reid INT,
    appid INT,
    medicine_id INT,
    quantity INT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pid) REFERENCES patients(pid),
    FOREIGN KEY (did) REFERENCES doctors(did),
    FOREIGN KEY (reid) REFERENCES reception(reid),
    FOREIGN KEY (appid) REFERENCES appointments(appid),
    FOREIGN KEY (medicine_id) REFERENCES medicine_master(medicine_id)
);

