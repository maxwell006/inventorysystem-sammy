// === Update utils/mailer.js ===
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const senderName = `"Sammy's Inventory System" <${process.env.EMAIL_USER}>`;

export const sendLowStockEmail = async (productName) => {
  await transporter.sendMail({
    from: senderName,
    to: process.env.EMAIL_USER,
    subject: `Low Stock Alert: ${productName}`,
    html: `<p><b>${productName}</b> is low in stock. Please refill inventory.</p>`
  });
};

export const sendSalesSummaryEmail = async (date, total) => {
  await transporter.sendMail({
    from: senderName,
    to: process.env.EMAIL_USER,
    subject: `Sales Summary for ${date.toDateString()}`,
    html: `<p>Total sales for <strong>${date.toDateString()}</strong>: ₦${total.toLocaleString()}</p>`
  });
};

export const sendExpiryWarningEmail = async (productName, expiryDate) => {
  await transporter.sendMail({
    from: senderName,
    to: process.env.EMAIL_USER,
    subject: `Expiry Warning: ${productName}`,
    html: `<p><b>${productName}</b> is expiring on <strong>${new Date(expiryDate).toDateString()}</strong>. Please check inventory.</p>`
  });
};
