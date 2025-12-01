POST   /api/products
GET    /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id



POST   /api/orders
{
  "customer": "Tekgai",
  "items": [
    {
      "productId": "686a9b52ff572ada7fcc80c0",
      "quantity": 2
    }
  ]
}

GET    /api/orders


GET    /api/admin/daily-sales

GET    /api/admin/summary/day
GET    /api/admin/summary/week
GET    /api/admin/summary/month