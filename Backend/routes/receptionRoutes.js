const express = require("express");
const router = express.Router();
const Receptionist = require("../controllers/receptionController");
const { verifyReceptionist } = require("../middleware/auth");

router.post("/login", Receptionist.loginReceptionist);
router.get("/me", verifyReceptionist, Receptionist.getReceptionProfile);
router.get("/unassigned-appointments", verifyReceptionist, Receptionist.getUnassignedAppointments);

// Fetch available rooms with assigned staff
router.get("/available-rooms", verifyReceptionist, Receptionist.getAvailableRoomsWithStaff);

// Assign room + staff to appointment
router.post("/assign-room", verifyReceptionist, Receptionist.assignRoom);
router.get("/available-staff", verifyReceptionist, Receptionist.getAvailableStaff);

router.get('/assigned-rooms', verifyReceptionist, Receptionist.getAssignedRooms);
router.get('/patients', verifyReceptionist, Receptionist.getAllPatients);
router.get('/patient-appointments/:pid', verifyReceptionist, Receptionist.getPatientAppointments);
router.get('/patient-info/:pid', verifyReceptionist, Receptionist.getFullPatientInfo);

// Fetch all unbilled appointments
router.get("/unbilled-appointments", verifyReceptionist, Receptionist.getUnbilledAppointments);

// Generate bill for a specific appointment
router.post("/generate-bill", verifyReceptionist, Receptionist.generateBill);



module.exports = router;
