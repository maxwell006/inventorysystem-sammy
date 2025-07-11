import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  customer: String,
    // id: {
    //   type: Number,
    //   required: true,
    // },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      total: Number,
    },
  ],
  totalPrice: Number,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Order", orderSchema);
