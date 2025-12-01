import express from "express";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { sendLowStockEmail, sendExpiryWarningEmail } from "../utils/mailer.js";

const router = express.Router();

// GET ALL ORDERS
router.get("/", async (req, res) => {
  const orders = await Order.find()
    .sort({ _id: -1 })
    .populate("products.productId", "name price expiryDate");
  res.json(orders);
});

// GET RECENT ORDERS
router.get("/recent", async (req, res) => {
  const orders = await Order.find()
    .sort({ _id: -1 })
    .limit(5)
    .populate("products.productId", "name price expiryDate");
  res.json(orders);
});

// CREATE ORDER
router.post("/", async (req, res) => {
  const { customer, items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No products provided in the order" });
  }

  let total = 0;
  const orderItems = [];
  const lowStockProducts = [];
  const expiringProducts = [];

  const now = new Date();

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const expiry = new Date(product.expiryDate);

    if (expiry <= now) {
      return res
        .status(400)
        .json({ error: `Cannot order ${product.name} – product has expired` });
    }

    if (product.quantity < item.quantity) {
      return res
        .status(400)
        .json({
          error: `${product.name} only has ${product.quantity} in stock`,
        });
    }

    const itemTotal = product.price * item.quantity;
    total += itemTotal;

    product.quantity -= item.quantity;

    if (product.quantity <= 10) lowStockProducts.push(product.name);

    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30)
      expiringProducts.push({ name: product.name, expiry: product.expiryDate });

    await product.save();

    orderItems.push({
      productId: product._id,
      quantity: item.quantity,
      total: itemTotal,
    });
  }

  const order = new Order({
    customer,
    products: orderItems,
    totalPrice: total,
  });

  await order.save();

  res.json({ message: "Order placed successfully", order });

  // ---- Send emails asynchronously, AFTER response ----
  setImmediate(async () => {
    try {
      for (const name of lowStockProducts) {
        await sendLowStockEmail(name);
      }
      for (const prod of expiringProducts) {
        await sendExpiryWarningEmail(prod.name, prod.expiry);
      }
    } catch (err) {
      console.error("Failed to send email:", err);
    }
  });
});

export default router;
