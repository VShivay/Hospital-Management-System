const db = require("../models/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// POST /api/patient/register
exports.registerPatient = async (req, res) => {
  const { name, email, number, address, password } = req.body;

  try {
    // Check if email already exists
    const [exists] = await db.query("SELECT * FROM patients WHERE email = ?", [email]);
    if (exists.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }
    // Hash the password
    const hash = await bcrypt.hash(password, 10);
    // Insert into DB
    await db.query(
      "INSERT INTO patients (name, email, number, address, password) VALUES (?, ?, ?, ?, ?)",
      [name, email, number, address, hash]
    );
    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
// POST /login
exports.loginPatient = async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query("SELECT * FROM patients WHERE email = ?", [email]);
  if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

  const patient = rows[0];
  const match = await bcrypt.compare(password, patient.password);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: patient.pid, role: "patient" }, "patient_secret_key", { expiresIn: "1d" });
  res.json({ token });
};
// GET /me (protected)
exports.getProfile = async (req, res) => {
  const { id } = req.user;
  const [rows] = await db.query("SELECT pid, name, email, number, address FROM patients WHERE pid = ?", [id]);
  res.json(rows[0]);
};
exports.getLastVisit = async (req, res) => {
  try {
    const pid = req.user.id;

    const [visit] = await db.query(`
      SELECT a.*, d.name AS doctor_name
      FROM appointments a
      JOIN doctors d ON a.did = d.did
      WHERE a.pid = ? AND a.visited = 'yes'
      ORDER BY a.date DESC, a.time DESC 
      LIMIT 1
    `, [pid]);

    res.json(visit[0] || {});
  } catch (err) {
    res.status(500).json({ message: "Error retrieving last visit", error: err });
  }
};
exports.getAllVisits = async (req, res) => {
  try {
    const pid = req.user.id;

    const [visits] = await db.query(`
      SELECT a.*, d.name as doctor_name 
      FROM appointments a
      JOIN doctors d ON a.did = d.did
      WHERE a.pid = ? AND a.visited = 'yes'
      ORDER BY a.date DESC, a.time DESC
    `, [pid]);

    res.json(visits);
  } catch (err) {
    res.status(500).json({ message: "Error retrieving visits", error: err });
  }
};
exports.getPrescriptionsByVisit = async (req, res) => {
  try {
    const pid = req.user.id;
    const { appid } = req.params;

    // Step 1: Verify that the visit was completed
    const [appointment] = await db.query(
      `SELECT visited FROM appointments WHERE appid = ? AND pid = ?`,
      [appid, pid]
    );

    if (appointment.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment[0].visited !== 'yes') {
      return res.status(403).json({ message: "Prescriptions available only after visit" });
    }

    // Step 2: Fetch prescription data
    const [prescriptions] = await db.query(`
      SELECT p.*, m.medicine_name, d.name AS doctor_name 
      FROM prescriptions p
      JOIN medicine_master m ON p.medicine_id = m.medicine_id
      JOIN doctors d ON p.did = d.did
      WHERE p.pid = ? AND p.appid = ?
    `, [pid, appid]);

    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ message: "Error retrieving prescriptions", error: err });
  }
};
exports.bookAppointment = async (req, res) => {
  try {
    const pid = req.user.id;
    const { did, date, time } = req.body;

    const [result] = await db.query(`
      INSERT INTO appointments (pid, did, date, time)
      VALUES (?, ?, ?, ?)
    `, [pid, did, date, time]);

    res.status(201).json({ message: "Appointment booked", appointmentId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: "Error booking appointment", error: err });
  }
};
// controllers/patientController.js (or doctorController.js)
exports.getAllDoctors = async (req, res) => {
  try {
    const [doctors] = await db.query(`
      SELECT did, name, specialization, number, email, address, fees
      FROM doctors
    `);

    res.status(200).json(doctors);
  } catch (err) {
    res.status(500).json({ message: "Error fetching doctors", error: err });
  }
};
// controllers/patientController.js
exports.getBookedAppointments = async (req, res) => {
  try {
    const pid = req.user.id;

    const [appointments] = await db.query(`
      SELECT a.*, d.name AS doctor_name, d.specialization, d.fees 
      FROM appointments a
      JOIN doctors d ON a.did = d.did
      WHERE a.pid = ?
      ORDER BY a.date DESC, a.time DESC
    `, [pid]);

    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({
      message: "Error retrieving booked appointments",
      error: err.message || err,
    });
  }
};
exports.getPatientBills = async (req, res) => {
  const patientId = req.user.id;
  console.log("✅ getPatientBills controller triggered");
  console.log("🔍 Logged in patient ID:", patientId);
  console.log("📦 Running SQL query...");

  try {
    const [results] = await db.query(`
  SELECT 
    b.billid, b.amount, b.room_charge, b.medicine_charge, 
    DATE_FORMAT(b.bill_date, '%Y-%m-%d') AS bill_date,
    DATE_FORMAT(b.bill_time, '%r') AS bill_time,
    d.name AS doctor_name,
    r.name AS reception_name
  FROM bills b
  LEFT JOIN doctors d ON b.did = d.did
  LEFT JOIN reception r ON b.reid = r.reid
  WHERE b.pid = ?
  ORDER BY b.bill_date DESC, b.bill_time DESC
`, [patientId]);
    console.log("✅ Query result:", results);
    res.status(200).json(results);
  } catch (err) {
    console.error("❌ Query failed:", err.message || err);
    res.status(500).json({ message: "Failed to fetch bills" });
  }
};
