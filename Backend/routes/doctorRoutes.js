// routes/doctorRoutes.js
const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const { verifyDoctor } = require("../middleware/auth");

router.post("/login", doctorController.loginDoctor);
router.get("/me", verifyDoctor, doctorController.getDoctorProfile);
// View all pending appointments
router.get("/pending", verifyDoctor, doctorController.getPendingAppointments);
// Approve or reject an appointment
router.put("/update-status/:appid", verifyDoctor, doctorController.updateAppointmentStatus);
router.get("/appointments/approved", verifyDoctor, doctorController.getApprovedAppointments1);

router.get('/appointments', verifyDoctor, doctorController.getApprovedAppointments);
router.get('/patient/:pid', verifyDoctor, doctorController.getPatientDetails);
router.get('/medicines', verifyDoctor, doctorController.getMedicines);
router.post('/prescribe', verifyDoctor, doctorController.prescribeMedicine);

module.exports = router;
