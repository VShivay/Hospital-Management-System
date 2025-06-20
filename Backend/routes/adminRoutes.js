// admin routes
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyAdmin } = require("../middleware/auth");

router.post("/login", adminController.adminLogin);
router.get("/me", verifyAdmin, adminController.getAdminProfile);
router.get("/patients", verifyAdmin, adminController.getPatients);
router.post("/doctors", verifyAdmin, adminController.addDoctor);
router.post("/reception", verifyAdmin, adminController.addReception);
router.post("/staff", verifyAdmin, adminController.addStaff);
router.get("/bills", verifyAdmin, adminController.getBills);
router.get("/appointments", verifyAdmin, adminController.getAppointments);
router.get('/getdoctors',verifyAdmin, adminController.getDoctors);
router.get('/getstaff',verifyAdmin, adminController.getStaff);
router.get('/getreception',verifyAdmin, adminController.getReception);

router.get('/appcount',verifyAdmin, adminController.getTotalAppointmentsCount);
router.get('/patientcount',verifyAdmin, adminController.getRegisteredPatientsCount);
router.get('/counttoday',verifyAdmin, adminController.getNewRegistrationsTodayCount);
router.get('/revenuemonthly',verifyAdmin, adminController.getMonthlyRevenue);

router.get('/apprecent',verifyAdmin, adminController.getRecentAppointments);
router.get('/patrecent',verifyAdmin, adminController.getRecentPatients);

module.exports = router;
