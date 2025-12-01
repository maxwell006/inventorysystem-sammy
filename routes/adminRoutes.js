import express from "express";
import Order from "../models/Order.js";
import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendSalesSummaryEmail } from "../utils/mailer.js";

const router = express.Router();

/* --------------------- AUTH ROUTES --------------------- */

// Register admin
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "Please fill all fields" });

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin)
    return res.status(400).json({ error: "Admin already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await Admin.create({
    name,
    email,
    password: hashedPassword,
  });

  const token = jwt.sign(
    { id: admin._id, email: admin.email },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  res.json({
    message: "Admin created",
    admin: { id: admin._id, name: admin.name, email: admin.email },
    token,
  });
});

// Login admin
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });
  if (!admin)
    return res.status(401).json({ error: "Invalid email or password" });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch)
    return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign(
    { id: admin._id, email: admin.email },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  res.json({
    message: "Login successful",
    admin: { id: admin._id, name: admin.name, email: admin.email },
    token,
  });
});

router.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Admin.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ name: user.name, email: user.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update user by ID
router.put("/update-profile", async (req, res) => {
  try {
    const { id, name, email, password } = req.body;

    if (!id) return res.status(400).json({ message: "Admin ID is required" });

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (name) admin.name = name;
    if (email) admin.email = email;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      admin.password = hashedPassword;
    }

    await admin.save();

    res.json({
      message: "Profile updated successfully",
      user: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


/* --------------------- SALES ROUTES --------------------- */

router.get("/daily-sales", async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    createdAt: { $gte: start, $lte: end },
  });

  const total = orders.reduce((acc, order) => acc + order.totalPrice, 0);

  // await sendSalesSummaryEmail(start, total);

  res.json({
    message: "Daily sales report sent",
    totalSales: total,
    date: start.toDateString(),
  });
});

function getStartAndEnd(type) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (type === "day") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (type === "week") {
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    end = new Date();
    end.setHours(23, 59, 59, 999);
  } else if (type === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}
// 📌 Get sales for each month of the current year
router.get("/monthly-sales", async (req, res) => {
  const year = new Date().getFullYear();

  const monthlyTotals = Array(12).fill(0);

  const orders = await Order.find({
    createdAt: {
      $gte: new Date(year, 0, 1),
      $lte: new Date(year, 11, 31, 23, 59, 59),
    },
  });

  
  orders.forEach((order) => {
    const monthIndex = new Date(order.createdAt).getMonth();
    monthlyTotals[monthIndex] += order.totalPrice;
  });

  res.json({
    year,
    months: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    totals: monthlyTotals,
  });
});

router.get("/summary/:type", async (req, res) => {
  const { type } = req.params;
  const validTypes = ["day", "week", "month"];
  if (!validTypes.includes(type)) {
    return res
      .status(400)
      .json({ error: "Invalid type. Use day, week, or month" });
  }

  const { start, end } = getStartAndEnd(type);

  const orders = await Order.find({
    createdAt: { $gte: start, $lte: end },
  });

  const totalAmount = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const uniqueCustomers = [...new Set(orders.map((o) => o.customer))];

  res.json({
    period: type,
    totalOrders: orders.length,
    totalAmount,
    totalCustomers: uniqueCustomers.length,
    from: start,
    to: end,
  });
});

export default router;
