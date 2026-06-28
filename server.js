// =========================================================================
// ផ្នែកទី ១៖ ការនាំចូលបណ្ណាល័យ (Imports & Setup)
// =========================================================================
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================================================================
// ផ្នែកទី ២៖ មុខងារបាញ់សារទៅកាន់ Telegram
// =========================================================================
async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log(
      "⚠️ មិនអាចបាញ់សារទៅ Telegram បានទេ ព្រោះអត់មាន Token ឬ Chat ID",
    );
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });
    console.log("✅ បានបាញ់សារជូនដំណឹងទៅកាន់ Telegram!");
  } catch (error) {
    console.error("❌ បរាជ័យក្នុងការបាញ់សារទៅ Telegram:", error);
  }
}

// =========================================================================
// ផ្នែកទី ៣៖ ការភ្ជាប់ទៅកាន់ MongoDB Atlas
// =========================================================================
mongoose.set("strictQuery", false); // ការពារ Warning របស់ Mongoose

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ ភ្ជាប់ទៅកាន់ MongoDB Atlas ជោគជ័យ!"))
  .catch((err) => console.error("❌ បរាជ័យក្នុងការភ្ជាប់ Database:", err));

// =========================================================================
// ផ្នែកទី ៤៖ ការបង្កើតទម្រង់ទិន្នន័យ (Mongoose Schemas & Models)
// =========================================================================
const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullname: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    role: { type: String, enum: ["admin", "tenant"], default: "tenant" },
  },
  { timestamps: true },
);
const User = mongoose.model("User", UserSchema);

const RoomTypeSchema = new mongoose.Schema({
  type_name: { type: String, required: true, unique: true },
});
const RoomType = mongoose.model("RoomType", RoomTypeSchema);

const RoomSchema = new mongoose.Schema({
  room_number: { type: String, required: true, unique: true },
  type_id: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType" },
  price: { type: Number, required: true },
  status: {
    type: String,
    enum: ["available", "occupied"],
    default: "available",
  },
});
const Room = mongoose.model("Room", RoomSchema);

const BookingSchema = new mongoose.Schema(
  {
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tenant_name: { type: String, required: true },
    tenant_phone: { type: String, required: true },
    check_in_time: { type: Date, required: true },
    check_out_time: { type: Date, required: true },
    status: {
      type: String,
      enum: ["booked", "checked_in", "checked_out", "pending"],
      default: "booked",
    },
    payment_method: {
      type: String,
      enum: ["cash", "online", "card"],
      default: "cash",
    },
    payment_status: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
  },
  { timestamps: true },
);
const Booking = mongoose.model("Booking", BookingSchema);

// =========================================================================
// ផ្នែកទី ៥៖ API សម្រាប់អ្នកប្រើប្រាស់ (Auth: Login & Register)
// =========================================================================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, fullname, phone, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ username }, { phone }] });
    if (existingUser)
      return res
        .status(400)
        .json({
          success: false,
          message: "ឈ្មោះ ឬលេខទូរស័ព្ទនេះមានគេប្រើរួចហើយ!",
        });

    const newUser = new User({
      username,
      fullname,
      phone,
      password,
      role: "tenant",
    });
    await newUser.save();
    res.json({ success: true, message: "ចុះឈ្មោះជោគជ័យ! សូមចូលប្រើប្រាស់។" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username.toLowerCase() === "admin" && password === "123") {
      return res.json({
        success: true,
        role: "admin",
        message: "ចូលគណនី Admin ជោគជ័យ",
      });
    }

    const user = await User.findOne({
      $or: [{ username }, { phone: username }],
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "មិនមានគណនីនេះក្នុងប្រព័ន្ធទេ!" });
    if (user.password !== password)
      return res
        .status(401)
        .json({ success: false, message: "លេខសម្ងាត់មិនត្រឹមត្រូវទេ!" });

    res.json({
      success: true,
      role: user.role,
      user: { id: user._id, fullname: user.fullname, phone: user.phone },
      message: "ចូលគណនីជោគជ័យ",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// ផ្នែកទី ៦៖ API សម្រាប់គ្រប់គ្រងបន្ទប់ (Rooms & Types)
// =========================================================================
app.get("/api/rooms", async (req, res) => {
  try {
    const rooms = await Room.find().populate("type_id");
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/rooms/available", async (req, res) => {
  try {
    const rooms = await Room.find({ status: "available" }).populate("type_id");
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// ផ្នែកទី ៧៖ API សម្រាប់ការកក់ (Bookings & Telegram Alert)
// =========================================================================
app.get("/api/bookings/check_availability/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const bookings = await Booking.find({
      room_id: roomId,
      status: { $ne: "checked_out" },
    }).select("check_in_time check_out_time");
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/bookings/create", async (req, res) => {
  try {
    const {
      room_id,
      user_id,
      tenant_name,
      tenant_phone,
      check_in_time,
      check_out_time,
      payment_method,
      status,
    } = req.body;
    const conflict = await Booking.findOne({
      room_id,
      status: { $ne: "checked_out" },
      $and: [
        { check_in_time: { $lt: check_out_time } },
        { check_out_time: { $gt: check_in_time } },
      ],
    });

    if (conflict)
      return res
        .status(400)
        .json({ success: false, message: "ម៉ោងនេះមានគេកក់រួចហើយ!" });

    const newBooking = new Booking({
      room_id,
      user_id,
      tenant_name,
      tenant_phone,
      check_in_time,
      check_out_time,
      payment_method,
      status,
    });
    await newBooking.save();

    if (status === "checked_in")
      await Room.findByIdAndUpdate(room_id, { status: "occupied" });

    const msg_tele = `🌐 មានការកក់បន្ទប់ថ្មី:\n🏢 បន្ទប់លេខ (ID): ${room_id}\n👤 ភ្ញៀវ: ${tenant_name}\n📱 លេខ: ${tenant_phone}\n📅 ម៉ោងចូល: ${check_in_time}\n💳 បង់តាម: ${payment_method.toUpperCase()}`;
    await sendTelegramMessage(msg_tele);

    res.json({
      success: true,
      bookingId: newBooking._id,
      message: "បង្កើតការកក់ជោគជ័យ!",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// ផ្នែកទី ៨៖ API សម្រាប់ទូទាត់ប្រាក់ (Payments)
// =========================================================================
app.post("/api/payments/confirm", async (req, res) => {
  try {
    const { booking_id, method } = req.body;
    await Booking.findByIdAndUpdate(booking_id, {
      payment_status: "paid",
      payment_method: method,
    });
    res.json({ success: true, message: "ទូទាត់ប្រាក់ជោគជ័យ!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// ផ្នែកទី ៩៖ ការកំណត់ Static Files សម្រាប់ Frontend
// =========================================================================
app.use(express.static(path.join(__dirname, "public")));

// ប្រើប្រាស់ Middleware ចុងក្រោយគេបង្អស់ដើម្បីដោះស្រាយបញ្ហា SPA routing ជំនួសឱ្យ app.get('*')
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res
      .status(404)
      .json({ success: false, message: "រកមិនឃើញ API នេះទេ" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =========================================================================
// ផ្នែកទី ១០៖ ចាប់ផ្តើមដំណើរការ Server (Start Server)
// =========================================================================
// បន្ថែម "0.0.0.0" ដើម្បីឱ្យ Fly.io អាចចាប់យក Network ពីខាងក្រៅបាន
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server កំពុងដំណើរការលើ Port: ${PORT}`);
});
