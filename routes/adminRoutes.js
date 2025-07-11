import express from "express";
import Order from "../models/Order.js";
import { sendSalesSummaryEmail } from "../utils/mailer.js";

const router = express.Router();

router.get("/daily-sales", async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    createdAt: { $gte: start, $lte: end },
  });

  const total = orders.reduce((acc, order) => acc + order.totalPrice, 0);

  await sendSalesSummaryEmail(start, total);

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
