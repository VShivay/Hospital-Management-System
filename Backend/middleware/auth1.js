const jwt = require("jsonwebtoken");

// Map roles to their respective secret keys
const roleSecrets = {
  admin: "admin_secret_key",
  doctor: "doctor_secret_key",
  receptionist: "receptionist_secret_key",
  staff: "staff_secret_key",
  patient: "patient_secret_key",
};

const verifyRole = (role) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, roleSecrets[role]);
      if (decoded.role !== role) {
        throw new Error("Invalid role");
      }
      req.user = decoded;
      next();
    } catch (err) {
      res.status(403).json({ message: "Invalid token or role" });
    }
  };
};

// Export individual middleware by role
module.exports = {
  verifyAdmin: verifyRole("admin"),
  verifyDoctor: verifyRole("doctor"),
  verifyReceptionist: verifyRole("receptionist"),
  verifyStaff: verifyRole("staff"),
  verifyPatient: verifyRole("patient"),
};
