const db = require("../models/db");
const bcrypt = require("bcrypt");

(async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS count FROM admin");
  if (rows[0].count === 0) {
    const hash = await bcrypt.hash("vinit123", 10);
    const hash1 = await bcrypt.hash("vishal123", 10);
    await db.query("INSERT INTO admin (name,email, password) VALUES (?, ?, ?)", [
      "Vinit",
      "Vinit@gmail.com",
      hash,
    ]);
    await db.query("INSERT INTO admin (name,email, password) VALUES (?, ?, ?)", [
      "Vishal",
      "Vishal@gmail.com",
      hash1,
    ]);
    console.log("Admin seeded.");
  } else {
    console.log("Admin already exists.");
  }
})();
