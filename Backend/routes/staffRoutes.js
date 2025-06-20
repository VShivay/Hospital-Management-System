const express = require("express");
const router = express.Router();
const staff = require("../controllers/staffController");
const { verifyStaff } = require("../middleware/auth");

router.post("/login", staff.loginStaff);
router.get("/me", verifyStaff, staff.getStaffDetails);
router.get("/assigned-rooms", verifyStaff, staff.getAssignedRooms);
router.get("/allassigned-rooms", verifyStaff, staff.getAssignedRooms1); // ✅ Fixed casing

module.exports = router;
