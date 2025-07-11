// === Updated routes/productRoutes.js ===
import express from "express";
import Product from "../models/Product.js";
import { sendExpiryWarningEmail } from "../utils/mailer.js";

const router = express.Router();

// Create product
router.post("/", async (req, res) => {
  const { name, price, quantity, expiryDate } = req.body;

  if (!name || price == null || quantity == null || !expiryDate) {
    return res.status(400).json({
      error: "Please fill in all fields (name, price, quantity, expiryDate)",
    });
  }

  if (price <= 0 || quantity < 0) {
    return res.status(400).json({
      error: "Price must be > 0 and quantity cannot be negative",
    });
  }

  const existingProduct = await Product.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  });
  if (existingProduct) {
    return res.status(400).json({
      error: "Product with this name already exists",
    });
  }

  const product = new Product({ name, price, quantity, expiryDate });
  await product.save();
  res.json({ message: "Product added", product });
});

// Get all products and check for expiry warning
router.get("/", async (req, res) => {
  const products = await Product.find();

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  for (const product of products) {
    if (
      product.expiryDate &&
      new Date(product.expiryDate) <= threeDaysFromNow
    ) {
      await sendExpiryWarningEmail(product.name, product.expiryDate);
    }
  }

  // ✅ Sort properly before returning
  const sortedProducts = products.sort((a, b) => b._id.getTimestamp() - a._id.getTimestamp());

  res.json(sortedProducts);
});


// Get single product
router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// Update product
router.put("/:id", async (req, res) => {
  const { name, price, quantity, expiryDate } = req.body;

  if (!name || price == null || quantity == null || !expiryDate) {
    return res.status(400).json({
      error: "Please fill in all fields (name, price, quantity, expiryDate)",
    });
  }

  if (typeof price !== "number" || typeof quantity !== "number") {
    return res
      .status(400)
      .json({ error: "Price and quantity must be numbers" });
  }

  if (price <= 0 || quantity < 0) {
    return res.status(400).json({
      error: "Price must be > 0 and quantity cannot be negative",
    });
  }

  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    { name, price, quantity, expiryDate },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: "Product not found" });

  res.json({ message: "Product updated", product: updated });
});

// Delete product
router.delete("/:id", async (req, res) => {
  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Product not found" });
  res.json({ message: "Product deleted" });
});

export default router;