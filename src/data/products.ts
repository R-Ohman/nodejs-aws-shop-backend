export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  count: number;
}

export const products: Product[] = [
  {
    id: "1",
    title: "Nike Sneakers",
    description: "Comfortable running shoes",
    price: 120,
    count: 10,
  },
  {
    id: "2",
    title: "Adidas Sneakers",
    description: "Stylish everyday sneakers",
    price: 95,
    count: 5,
  },
  {
    id: "3",
    title: "Puma Trainers",
    description: "Lightweight trainers",
    price: 80,
    count: 0,
  }
];
