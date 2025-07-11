import express from "express";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { sendLowStockEmail } from "../utils/mailer.js";

const router = express.Router();
// Add this after the POST / route
router.get("/", async (req, res) => {
  const orders = await Order.find()
    .sort({ _id: -1 })
    .populate("products.productId", "name price");
  res.json(orders);
});

router.get("/recent", async (req, res) => {
  const orders = await Order.find()
    .sort({ _id: -1 })
    .limit(5)
    .populate("products.productId", "name price");

  res.json(orders);
});



router.post("/", async (req, res) => {
  const { customer, items } = req.body;

  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || product.quantity < item.quantity) {
      return res
        .status(400)
        .json({ error: `Product out of stock: ${item.productId}` });
    }

    const itemTotal = product.price * item.quantity;
    total += itemTotal;

    product.quantity -= item.quantity;
    if (product.quantity <= 10) {
      await sendLowStockEmail(product.name);
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

  res.json({ message: "Order placed", order });
});

export default router;
