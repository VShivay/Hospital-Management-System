const db = require("../models/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.loginStaff = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Missing credentials" });

  try {
    const [rows] = await db.query("SELECT * FROM staff WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ message: "Invalid email or password" });

    const staff = rows[0];
    const valid = await bcrypt.compare(password, staff.password);
    if (!valid) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: staff.sid, email: staff.email, role: "staff" },
      "staff_secret_key",
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.getStaffDetails = async (req, res) => {
  try {
    const id = req.user.id;
    const [rows] = await db.query(
      "SELECT sid, name, email, number, address, salary FROM staff WHERE sid = ?",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Staff not found" });

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.getAssignedRooms = async (req, res) => {
  const id = req.user.id; // or req.staff

  try {
    const [rows] = await db.query(
      `SELECT 
         r.*, 
         rc.class_name, 
         rc.charge, 
         p.name AS patient_name, 
         p.email AS patient_email, 
         d.name AS doctor_name,
         d.specialization,
         a.date AS appointment_date,
         a.time AS appointment_time
       FROM rooms r
       JOIN room_classes rc ON r.class_id = rc.class_id
       LEFT JOIN patients p ON r.pid = p.pid
       LEFT JOIN appointments a ON a.rid = r.rid 
         AND a.pid = p.pid 
         AND a.status = 'approved'
       LEFT JOIN doctors d ON a.did = d.did
       WHERE r.sid = ? AND r.pid IS NOT NULL`,
      [id]
    );

    // Format date and time
    const formattedRooms = rows.map(room => {
      let formattedDate = room.appointment_date;
      let formattedTime = room.appointment_time;

      if (room.appointment_date) {
        formattedDate = new Date(room.appointment_date).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
      }

      if (room.appointment_time) {
        formattedTime = new Date(`1970-01-01T${room.appointment_time}Z`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "UTC"
        });
      }

      return {
        ...room,
        appointment_date: formattedDate,
        appointment_time: formattedTime
      };
    });

    res.json({ assignedRooms: formattedRooms });
    
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAssignedRooms1 = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        r.room_number,
        rc.class_name,
        rc.charge,
        p.name AS patient_name,
        p.email AS patient_email,
        p.number AS patient_number,
        d.name AS doctor_name,
        d.specialization,
        a.date AS appointment_date,
        a.time AS appointment_time,
        a.status,
        a.visited
      FROM appointments a
      JOIN rooms r ON a.rid = r.rid
      JOIN room_classes rc ON r.class_id = rc.class_id
      JOIN patients p ON a.pid = p.pid
      JOIN doctors d ON a.did = d.did
      JOIN staff s ON a.sid = s.sid
      WHERE a.sid = ?
      ORDER BY a.date DESC, a.time DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error("Assigned rooms fetch failed:", err);
    res.status(500).json({ message: "Server error" });
  }
};



