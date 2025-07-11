import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  expiryDate: { type: Date }
});

export default mongoose.model('Product', productSchema);
