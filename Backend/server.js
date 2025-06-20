const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Serve static files from the correct frontend folder (note lowercase 'frontend')
app.use(express.static(path.join(__dirname, "../frontend")));


const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

const patientRoutes = require("./routes/patientRoutes");
app.use("/api/patient", patientRoutes);

const doctorRoutes = require("./routes/doctorRoutes");
app.use("/api/doctor", doctorRoutes);

const receptionRoutes = require("./routes/receptionRoutes");
app.use("/api/reception", receptionRoutes);

const staffRoutes = require("./routes/staffRoutes");
app.use("/api/staff", staffRoutes);


// ✅ Home route to serve index.html(user)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// ✅ Hospital-only homepage (not for users)
app.get("/hospital", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index1.html"));
});
// ✅ Admin-only homepage
app.get("/a", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index2.html"));
});


// ✅ Start server
app.listen(5000, () => console.log("Server running on http://localhost:5000"));
