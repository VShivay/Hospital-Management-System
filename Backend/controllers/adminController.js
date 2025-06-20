const db = require("../models/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await db.query("SELECT * FROM admin WHERE email = ?", [email]);
  if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

  const admin = rows[0];
  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: admin.id, role: "admin" }, "admin_secret_key", { expiresIn: "1d" });
  res.json({ token });
};
exports.getAdminProfile = async (req, res) => {
  const adminId = req.user.id;

  const [rows] = await db.query("SELECT id, name, email FROM admin WHERE id = ?", [adminId]);

  if (rows.length === 0) {
    return res.status(404).json({ message: "Admin not found" });
  }

  res.json(rows[0]);
};

exports.getPatients = async (req, res) => {
  const [rows] = await db.query("SELECT * FROM patients");
  res.json(rows);
};

exports.addDoctor = async (req, res) => {
  const { name, email, number, address, password, fees,specialization } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await db.query("INSERT INTO doctors (name, email, number, address, password, fees,specialization) VALUES (?, ?, ?, ?, ?, ?,?)", [name, email, number, address, hash, fees,specialization]);
  res.json({ message: "Doctor added successfully" });
};

exports.addReception = async (req, res) => {
  const { name, email, number, address, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await db.query("INSERT INTO reception (name, email, number, address, password) VALUES (?, ?, ?, ?, ?)", [name, email, number, address, hash]);
  res.json({ message: "Receptionist added successfully" });
};

exports.addStaff = async (req, res) => {
  const { name, email, number, address, password, salary } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await db.query("INSERT INTO staff (name, email, number, address, password, salary) VALUES (?, ?, ?, ?, ?, ?)", [name, email, number, address, hash, salary]);
  res.json({ message: "Staff added successfully" });
};

exports.getBills = async (req, res) => {
  const { bill_date } = req.query;

  let query = `
    SELECT b.billid, p.name AS patient_name, d.name AS doctor_name, r.name AS receptionist_name,
           b.amount, b.room_charge, b.medicine_charge, b.bill_date, b.bill_time
    FROM bills b
    JOIN patients p ON b.pid = p.pid
    JOIN doctors d ON b.did = d.did
    JOIN reception r ON b.reid = r.reid
  `;

  const params = [];

  if (bill_date) {
    query += ` WHERE b.bill_date = ?`;
    params.push(bill_date);
  }

  const [rows] = await db.query(query, params);
  res.json(rows);
};


exports.getAppointments = async (req, res) => {
  const [rows] = await db.query(`
    SELECT a.appid, p.name AS patient_name, d.name AS doctor_name, a.date, a.time, a.status, a.new_date
    FROM appointments a
    JOIN patients p ON a.pid = p.pid
    JOIN doctors d ON a.did = d.did
  `);
  res.json(rows);
};
exports.getDoctors = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM doctors');
    res.json(results);
    console.log(results)
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStaff = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM staff');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReception = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM reception');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Example: Assuming 'db' is your database connection pool/object
// const db = require('../config/db'); // or however your db is configured

/**
 * Retrieves the total count of appointments.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getTotalAppointmentsCount = async (req, res) => {
  try {
    const [results] = await db.query('SELECT COUNT(*) AS count FROM appointments');
    res.json({ count: results[0].count });
  } catch (err) {
    console.error('Error fetching total appointments count:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

/**
 * Retrieves the total count of registered patients.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getRegisteredPatientsCount = async (req, res) => {
  try {
    const [results] = await db.query('SELECT COUNT(*) AS count FROM patients');
    res.json({ count: results[0].count });
  } catch (err) {
    console.error('Error fetching registered patients count:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

/**
 * Retrieves the count of new patient registrations for today.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getNewRegistrationsTodayCount = async (req, res) => {
  try {
    // Assuming 'created_at' is a DATETIME column and CURDATE() gets the current date
    const [results] = await db.query('SELECT COUNT(*) AS count FROM patients WHERE DATE(created_at) = CURDATE()');
    res.json({ count: results[0].count });
  } catch (err) {
    console.error('Error fetching new registrations today count:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

/**
 * Calculates the total revenue for the current month.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getMonthlyRevenue = async (req, res) => {
  try {
    // Sums the 'amount' from bills for the current month and year
    const [results] = await db.query('SELECT SUM(amount) AS totalRevenue FROM bills WHERE MONTH(bill_date) = MONTH(CURDATE()) AND YEAR(bill_date) = YEAR(CURDATE())');
    // Ensure that if SUM returns null (no bills), it's treated as 0
    const totalRevenue = results[0].totalRevenue !== null ? parseFloat(results[0].totalRevenue) : 0;
    res.json({ totalRevenue: totalRevenue });
  } catch (err) {
    console.error('Error fetching monthly revenue:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
exports.getRecentAppointments = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT
        a.appid,
        a.date,
        a.time,
        p.name AS patient_name,
        d.name AS doctor_name
      FROM appointments a
      JOIN patients p ON a.pid = p.pid
      JOIN doctors d ON a.did = d.did
      ORDER BY a.date DESC, a.time DESC
      LIMIT 5
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching recent appointments:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

/**
 * Retrieves a list of recent patient registrations.
 * Fetches the most recent 5 patients, ordered by creation date descending.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getRecentPatients = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT
        pid,
        name,
        created_at
      FROM patients
      ORDER BY created_at DESC
      LIMIT 5
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching recent patients:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

