import express from "express";
const router = express.Router();

import Product from "../models/Product.js";
import Order from "../models/Order.js";
import {
  sendLowStockEmail,
  sendSalesSummaryEmail,
  sendExpiryWarningEmail,
} from "../utils/mailer.js";

import multer from "multer";
import path from "path";

// === Multer setup ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("image"), async (req, res) => {
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

  const expiry = new Date(expiryDate);
  if (expiry <= new Date()) {
    return res.status(400).json({ error: "Expiry date must be future date" });
  }

  const existingProduct = await Product.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  });

  if (existingProduct) {
    return res
      .status(400)
      .json({ error: "Product with this name already exists" });
  }

  const product = new Product({
    name,
    price,
    quantity,
    expiryDate,
    image: req.file ? req.file.filename : null,
  });

  await product.save();
  if (quantity < 10) {
    await sendLowStockEmail(name);
  }
  res.json({ message: "Product added", product });
});

// ================================================
// GET ALL PRODUCTS + EXPIRY WARNING EMAIL
// ================================================
router.get("/", async (req, res) => {
  const products = await Product.find();

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  for (const product of products) {
    // Expiry warning
    if (product.expiryDate && new Date(product.expiryDate) <= threeDaysFromNow) {
      await sendExpiryWarningEmail(product.name, product.expiryDate);
    }

    // Low stock warning
    if (product.quantity < 10) {
      await sendLowStockEmail(product.name);
    }
  }

  // Sort newest first
  const sortedProducts = products.sort(
    (a, b) => b._id.getTimestamp() - a._id.getTimestamp()
  );

  res.json({ products: sortedProducts });
});


// ================================================
// GET SINGLE PRODUCT
// ================================================
router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// ================================================
// UPDATE FULL PRODUCT
// ================================================
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

  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    { name, price, quantity, expiryDate },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: "Product not found" });

  res.json({ message: "Product updated", product: updated });
});

// ================================================
// PATCH: UPDATE ONLY QUANTITY
// ================================================
router.patch("/:id", async (req, res) => {
  const { quantity } = req.body;

  if (quantity == null) {
    return res.status(400).json({ error: "Quantity is required" });
  }

  if (typeof quantity !== "number" || quantity < 0) {
    return res
      .status(400)
      .json({ error: "Quantity must be a non-negative number" });
  }

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { quantity },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }
    // Send low stock email if quantity < 10
    if (updatedProduct.quantity < 10) {
      await sendLowStockEmail(updatedProduct.name);
    }
    res.json({ message: "Quantity updated", product: updatedProduct });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ================================================
// DELETE PRODUCT
// ================================================
router.delete("/:id", async (req, res) => {
  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Product not found" });
  res.json({ message: "Product deleted" });
});

export default router;
