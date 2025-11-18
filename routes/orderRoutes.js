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

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const now = new Date();
    const expiry = new Date(product.expiryDate);

    // Prevent ordering expired products
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

    // Send low stock email if quantity <= 10
    if (product.quantity <= 10) {
      await sendLowStockEmail(product.name);
    }

    // Send expiry warning email if expiry is within 30 days
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      await sendExpiryWarningEmail(product.name, product.expiryDate);
    }

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
});

export default router;
