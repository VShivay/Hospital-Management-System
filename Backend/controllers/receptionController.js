const db = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.loginReceptionist = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const [rows] = await db.query("SELECT * FROM reception WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.reid, email: user.email, role: "receptionist" },
      "receptionist_secret_key",
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.getReceptionProfile = async (req, res) => {
  try {
    const [[receptionist]] = await db.query(
      "SELECT * FROM reception WHERE reid = ?",
      [req.user.id]
    );
    res.json(receptionist);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch profile", error: err.message });
  }
};
exports.getUnassignedAppointments = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT a.appid, a.date, a.time, a.status, p.name AS patient_name, d.name AS doctor_name
      FROM appointments a
      JOIN patients p ON a.pid = p.pid
      JOIN doctors d ON a.did = d.did
      WHERE a.status = 'approved' AND a.visited = 'no' AND NOT EXISTS (
        SELECT 1 FROM rooms r WHERE r.pid = a.pid
      )
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching unassigned appointments", error: err });
  }
};
// Get available rooms along with assigned staff (if any)
exports.getAvailableRoomsWithStaff = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT r.rid, r.room_number, rc.class_name, rc.charge,
             s.sid, s.name AS staff_name
      FROM rooms r
      JOIN room_classes rc ON r.class_id = rc.class_id
      LEFT JOIN staff s ON r.sid = s.sid
      WHERE r.pid IS NULL
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching available rooms", error: err });
  }
};
exports.assignRoom = async (req, res) => {
  const { appid, room_id, staff_id } = req.body;

  if (!appid || !room_id || !staff_id) {
    return res.status(400).json({ message: "All fields are required." });
  }
  try {
    // Get the patient ID from the appointment
    const [appointmentRows] = await db.execute(
      "SELECT pid FROM appointments WHERE appid = ?",
      [appid]
    );
    if (appointmentRows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    const pid = appointmentRows[0].pid;
    // Assign patient and staff to the room
    await db.execute(
      "UPDATE rooms SET pid = ?, sid = ? WHERE rid = ?",
      [pid, staff_id, room_id]
    );
    // Update appointment with assigned room ID
    await db.execute(
      "UPDATE appointments SET rid = ?,sid = ? WHERE appid = ?",
      [room_id,staff_id, appid]
    );
    res.json({ message: "Room and staff assigned successfully." });
  } catch (err) {
    console.error("Assignment error:", err);
    res.status(500).json({ message: "Internal server error", error: err });
  }
};
exports.getAvailableStaff = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.sid, s.name
      FROM staff s
      WHERE s.sid NOT IN (SELECT sid FROM rooms WHERE sid IS NOT NULL)
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching staff", error: err });
  }
};
exports.getAssignedRooms = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        p.name AS patient_name,
        a.date AS appointment_date,
        r.room_number,
        rc.class_name,
        rc.charge,
        d.name AS doctor_name,
        d.specialization
      FROM rooms r
      JOIN patients p ON r.pid = p.pid
      JOIN staff s ON r.sid = s.sid
      JOIN room_classes rc ON r.class_id = rc.class_id
      JOIN appointments a ON a.pid = p.pid
      JOIN doctors d ON a.did = d.did
      WHERE r.pid IS NOT NULL
    `);
    res.json(rows);
  } catch (err) {
    console.error("Assigned rooms fetch failed:", err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getAllPatients = async (req, res) => {
  try {
    const [patients] = await db.execute("SELECT pid, name FROM patients");
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: "Error fetching patients" });
  }
};
exports.getPatientAppointments = async (req, res) => {
  const { pid } = req.params;
  try {
    const [apps] = await db.execute(`
      SELECT a.date, a.time, a.status, d.name AS doctor_name
      FROM appointments a
      JOIN doctors d ON a.did = d.did
      WHERE a.pid = ?
    `, [pid]);
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: "Error fetching appointments" });
  }
};
const { format } = require('date-fns');

exports.getFullPatientInfo = async (req, res) => {
  const { pid } = req.params;

  try {
    // Step 1: Fetch patient details
    const [[patient]] = await db.execute(
      'SELECT pid, name, email, number, address, created_at FROM patients WHERE pid = ?',
      [pid]
    );
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // ✅ Format patient.created_at
    patient.created_at = formatDateTime(patient.created_at);

    // Step 2: Fetch appointments
    const [appointments] = await db.execute(`
      SELECT
        a.appid,
        a.date,
        a.time,
        a.status,
        a.visited,
        a.new_date,
        d.did,
        d.name AS doctor_name,
        d.specialization,
        d.fees,
        r.room_number,
        rc.class_name,
        rc.charge AS room_charge,
        b.billid,
        b.amount AS bill_amount,
        b.medicine_charge,
        b.room_charge AS bill_room_charge,
        b.bill_date,
        b.bill_time
      FROM appointments a
      LEFT JOIN doctors d ON a.did = d.did
      LEFT JOIN bills b ON a.billid = b.billid
      LEFT JOIN rooms r ON r.pid = a.pid
      LEFT JOIN room_classes rc ON rc.class_id = r.class_id
      WHERE a.pid = ?
      ORDER BY a.date, a.time
    `, [pid]);

    // Step 3: Fetch prescriptions
    const [prescriptions] = await db.execute(`
      SELECT 
        pr.appid,
        m.medicine_name,
        pr.quantity,
        pr.notes
      FROM prescriptions pr
      JOIN medicine_master m ON pr.medicine_id = m.medicine_id
      WHERE pr.pid = ?
    `, [pid]);

    // Group prescriptions by appid
    const prescriptionsByAppId = prescriptions.reduce((acc, cur) => {
      if (!acc[cur.appid]) acc[cur.appid] = [];
      acc[cur.appid].push({
        medicine_name: cur.medicine_name,
        quantity: cur.quantity,
        notes: cur.notes
      });
      return acc;
    }, {});

    // Step 4: Combine data
    const detailedAppointments = appointments.map(app => ({
      ...app,
      date: formatDate(app.date),
      time: formatTime(app.time),
      new_date: formatDate(app.new_date),
      bill_date: formatDate(app.bill_date),
      bill_time: formatTime(app.bill_time),
      datetime: formatDateTime(app.date, app.time),
      bill_datetime: formatDateTime(app.bill_date, app.bill_time),
      prescriptions: prescriptionsByAppId[app.appid] || []
    }));

    res.json({
      patient,
      appointments: detailedAppointments
    });

  } catch (err) {
    console.error('Error in getFullPatientInfo:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// 🧠 Format helpers
function formatDateTime(date, time = '00:00:00') {
  try {
    if (!date) return null;
    const fullDate = `${formatDate(date)}T${formatTime(time)}`;
    const d = new Date(fullDate);
    return isNaN(d.getTime()) ? null : format(d, 'MM/dd/yyyy hh:mm a');
  } catch {
    return null;
  }
}
function formatDate(val) {
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : format(d, 'yyyy-MM-dd');
  } catch {
    return null;
  }
}
function formatTime(val) {
  if (!val) return '00:00:00';
  return /^\d{2}:\d{2}$/.test(val) ? `${val}:00` : val;
}
exports.getUnbilledAppointments = async (req, res) => {
  try {
    const [appointments] = await db.query(`
      SELECT a.appid, a.pid, a.did, a.rid, p.name AS patient_name, d.name AS doctor_name, d.fees,
             r.class_id, rc.charge AS room_charge
      FROM appointments a
      JOIN patients p ON a.pid = p.pid
      JOIN doctors d ON a.did = d.did
      JOIN rooms r ON a.rid = r.rid
      JOIN room_classes rc ON r.class_id = rc.class_id
      WHERE a.billid IS NULL AND a.visited = 'yes'
    `);
    for (let appt of appointments) {
      const [medicines] = await db.query(`
        SELECT SUM(mm.price * pr.quantity) AS medicine_charge
        FROM prescriptions pr
        JOIN medicine_master mm ON pr.medicine_id = mm.medicine_id
        WHERE pr.appid = ?
      `, [appt.appid]);

      appt.medicine_charge = medicines[0].medicine_charge || 0;
      appt.total = parseFloat(appt.fees) + parseFloat(appt.room_charge) + parseFloat(appt.medicine_charge);
    }
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching appointments" });
  }
};
// 2. Generate bill
exports.generateBill = async (req, res) => {
  const { appid } = req.body;
  const reid = req.user.id; // From token

  try {
    // Fetch appointment details
    const [[appt]] = await db.query(`
      SELECT a.pid, a.did, a.rid, d.fees, rc.charge AS room_charge
      FROM appointments a
      JOIN doctors d ON a.did = d.did
      JOIN rooms r ON a.rid = r.rid
      JOIN room_classes rc ON r.class_id = rc.class_id
      WHERE a.appid = ?
    `, [appid]);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    // Medicine charge
    const [[medicineResult]] = await db.query(`
      SELECT SUM(mm.price * pr.quantity) AS medicine_charge
      FROM prescriptions pr
      JOIN medicine_master mm ON pr.medicine_id = mm.medicine_id
      WHERE pr.appid = ?
    `, [appid]);
    const medicine_charge = medicineResult.medicine_charge || 0;
    const amount = parseFloat(appt.fees) + parseFloat(appt.room_charge) + parseFloat(medicine_charge);
    // Insert into bills
    const [result] = await db.query(`
      INSERT INTO bills (pid, did, reid, amount, room_charge, medicine_charge, bill_date, bill_time)
      VALUES (?, ?, ?, ?, ?, ?, CURDATE(), CURTIME())
    `, [appt.pid, appt.did, reid, amount, appt.room_charge, medicine_charge]);

    const billid = result.insertId;
    // Update appointment with billid
    await db.query(`UPDATE appointments SET billid = ? WHERE appid = ?`, [billid, appid]);
    await db.query(`UPDATE rooms SET pid = NULL, sid = NULL WHERE rid = ?`, [appt.rid])

    res.json({ message: "Bill generated", billid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating bill" });
  }
};