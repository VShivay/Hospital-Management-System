// controllers/doctorController.js
const db = require("../models/db"); // update path as per your structure
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [rows] = await db.query("SELECT * FROM doctors WHERE email = ?", [email]);
    const doctor = rows[0];

    if (!doctor) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
   
    const token = jwt.sign(
      { id: doctor.did, role: "doctor", name: doctor.name },
      "doctor_secret_key",
      { expiresIn: "1d" }
    );

    res.json({ token, doctor: { name: doctor.name, email: doctor.email, did: doctor.did } });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};
// controllers/doctorController.js
exports.getDoctorProfile = async (req, res) => {
  try {
    const did = req.user.id;

    const [rows] = await db.query(
      "SELECT did, name, email, number, address,specialization, fees FROM doctors WHERE did = ?",
      [did]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch doctor profile", error: err.message });
  }
};
exports.getPendingAppointments = async (req, res) => {
  try {
    const did = req.user.id; // 👈 Get the logged-in doctor's ID

    const [appointments] = await db.query(
      `
      SELECT 
        a.appid, 
        a.date, 
        a.time, 
        a.status, 
        a.new_date,
        p.name AS patient_name, 
        d.name AS doctor_name, 
        d.specialization
      FROM appointments a
      JOIN patients p ON a.pid = p.pid
      JOIN doctors d ON a.did = d.did
      WHERE a.status = 'pending' AND a.did = ?
      `,
      [did] // 👈 Prevent SQL injection
    );

    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch appointments", error: err });
  }
};
// Approve or reject with optional new date
exports.updateAppointmentStatus = async (req, res) => {
  const { appid } = req.params;
  let { status, new_date } = req.body;

  console.log("Received from frontend:", { appid, status, new_date });

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  // Handle rejection with new date
  if (status === 'rejected' && new_date) {
    status = 'pending';
  }

  try {
    let result;

    if (new_date) {
      // Update both status and new_date
      [result] = await db.query(`
        UPDATE appointments
        SET status = ?, new_date = ?
        WHERE appid = ?
      `, [status, new_date, appid]);
    } else {
      // Update only status, preserve existing new_date
      [result] = await db.query(`
        UPDATE appointments
        SET status = ?
        WHERE appid = ?
      `, [status, appid]);
    }

    console.log("DB Update Result:", result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    let message = (status === 'pending' && new_date)
      ? "Appointment rescheduled and set to pending"
      : `Appointment ${status}`;

    res.status(200).json({ message });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ message: "Failed to update status", error: err });
  }
};
// GET: Approved appointments for logged-in doctor
exports.getApprovedAppointments1 = async (req, res) => {
  try {
    const did = req.user.id; // from verifyDoctor middleware

    const [appointments] = await db.query(`
      SELECT 
        a.appid,
        a.date,
        a.new_date,        -- Include the new_date field
        a.time,
        a.status,
        a.visited,
        a.pid,
        a.did,
        a.reid,
        p.name AS patient_name,
        p.number AS patient_number,
        p.email AS patient_email,
        p.address AS patient_address
      FROM appointments a
      JOIN patients p ON a.pid = p.pid
      WHERE a.did = ? AND a.status = 'approved'
      ORDER BY a.date DESC, a.time DESC
    `, [did]);

    res.status(200).json(appointments);
    
  } catch (err) {
    console.error("Error fetching approved appointments:", err);
    res.status(500).json({ message: "Error retrieving appointments", error: err });
  }
};
exports.getApprovedAppointments = async (req, res) => {
  try {
    const did = req.user.id; // from verifyDoctor middleware

    const [appointments] = await db.query(`
      SELECT 
        a.appid, a.date, a.time, a.status, a.visited,
        a.pid, a.did, a.reid, a.rid,
        p.name AS patient_name, p.number AS patient_number, p.email AS patient_email, p.address AS patient_address
      FROM appointments a
      JOIN patients p ON a.pid = p.pid
      WHERE a.did = ? 
        AND a.status = 'approved' 
        AND a.visited = 'no' 
        AND a.rid IS NOT NULL
      ORDER BY a.date DESC, a.time DESC
    `, [did]);

    res.status(200).json(appointments);
    console.log(appointments)
  } catch (err) {
    console.error("Error fetching approved appointments:", err);
    res.status(500).json({ message: "Error retrieving appointments", error: err });
  }
};
// GET: Patient details + last appointment + last prescription
exports.getPatientDetails = async (req, res) => {
  const { pid } = req.params;

  try {
    const [patientResult] = await db.query(
      'SELECT * FROM patients WHERE pid = ?',
      [pid]
    );

    const patient = patientResult[0];

    const [appointmentResult] = await db.query(
      `SELECT * FROM appointments 
       WHERE pid = ? AND status = 'approved'
       ORDER BY date DESC, time DESC 
       LIMIT 1`,
      [pid]
    );

    const lastAppointment = appointmentResult[0];
    const lastAppId = lastAppointment?.appid;

    let lastPrescriptions = [];
    if (lastAppId) {
      const [prescriptionResult] = await db.query(
        `SELECT p.*, m.medicine_name, m.price 
         FROM prescriptions p
         JOIN medicine_master m ON p.medicine_id = m.medicine_id
         WHERE p.appid = ?`,
        [lastAppId]
      );
      lastPrescriptions = prescriptionResult;
    }

    res.json({
      patient,
      lastAppointment,
      lastPrescriptions,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
// GET: All medicines
exports.getMedicines = async (req, res) => {
  try {
    const [medicines] = await db.query('SELECT * FROM medicine_master');
    res.json(medicines);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching medicines' });
  }
};
// POST: Prescribe medicine + mark appointment as visited
exports.prescribeMedicine = async (req, res) => {
  const { pid, did, reid, appid, prescriptions } = req.body;

  try {
    // 1. Insert prescriptions
    const insertPromises = prescriptions.map(pres =>
      db.query(
        `INSERT INTO prescriptions (pid, did, reid, appid, medicine_id, quantity, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [pid, did, reid, appid, pres.medicine_id, pres.quantity, pres.notes]
      )
    );
    await Promise.all(insertPromises);
    // 2. Mark appointment as visited
    await db.query(`UPDATE appointments SET visited = 'yes' WHERE appid = ?`, [appid]);
    // 3. Clear the room (set pid and sid to NULL) 
    res.json({ message: 'Prescription added, visit completed, room cleared.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error inserting prescriptions' });
  }
};

