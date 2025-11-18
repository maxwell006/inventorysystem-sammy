import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  expiryDate: { type: Date },
  image: { type: String }, 
});

export default mongoose.model('Product', productSchema);
