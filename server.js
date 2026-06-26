// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // អនុញ្ញាតឱ្យ Server អានទិន្នន័យ JSON ពី Frontend

// បម្រើឯកសារ Static (ដូចជា index.html) ពី Folder 'public'
app.use(express.static(path.join(__dirname, "public")));

// ភ្ជាប់ទៅកាន់ MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/rental_db")
  .then(() => console.log("✅ ភ្ជាប់ទៅកាន់ MongoDB ជោគជ័យ!"))
  .catch((err) => console.error("❌ បរាជ័យក្នុងការភ្ជាប់ Database:", err));

// ==========================================
// កន្លែងសម្រាប់សរសេរ API (នឹងបន្ថែមនៅពេលក្រោយ)
// ឧទាហរណ៍: app.post('/api/login', ...)
// ==========================================

// ពេលចូលវេបសាយដំបូង បង្ហាញ index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ចាប់ផ្ដើម Server
app.listen(PORT, () => {
  console.log(`🚀 Server កំពុងដំណើរការលើ http://localhost:${PORT}`);
});
