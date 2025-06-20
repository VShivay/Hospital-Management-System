const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const {verifyPatient} = require("../middleware/auth");

router.post("/register",patientController.registerPatient);
router.post("/login", patientController.loginPatient);
router.get("/me",verifyPatient, patientController.getProfile); 
router.get("/last-visit", verifyPatient, patientController.getLastVisit);
// View all visits
router.get("/visits", verifyPatient, patientController.getAllVisits);
// View prescription for a specific visit
router.get("/prescriptions/:appid", verifyPatient, patientController.getPrescriptionsByVisit);
// Book appointment
router.post("/appointments", verifyPatient, patientController.bookAppointment);
router.get("/doctors", verifyPatient, patientController.getAllDoctors);
router.get("/appointments", verifyPatient, patientController.getBookedAppointments);
router.get("/bills", verifyPatient, patientController.getPatientBills);
// protected route
module.exports = router;
