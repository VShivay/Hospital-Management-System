const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "hospital_db",
});

(async () => {
  try {
    await db.query("SELECT 1");
    console.log("✅ MySQL connected successfully!");
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
  }
})();

module.exports = db;
