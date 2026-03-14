export interface User {
  id: number;
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

export const users: User[] = [
  { id: 1, username: 'admin', password: 'password', email: 'admin@example.com', role: 'admin', createdAt: '2024-01-01' },
  { id: 2, username: 'user',  password: 'password', email: 'user@example.com',  role: 'user',  createdAt: '2024-03-15' },
  { id: 3, username: 'alice', password: 'password', email: 'alice@example.com', role: 'user',  createdAt: '2024-06-10' },
];

export const items: Item[] = [
  { id: 1, name: 'Widget A',   description: 'A standard widget',          price: 9.99,  category: 'Widgets',     inStock: true  },
  { id: 2, name: 'Gadget Pro', description: 'Professional grade gadget',  price: 49.99, category: 'Gadgets',     inStock: true  },
  { id: 3, name: 'Doohickey',  description: 'Useful doohickey for tasks', price: 14.50, category: 'Accessories', inStock: false },
  { id: 4, name: 'Thingamajig',description: 'Multi-purpose thingamajig',  price: 24.99, category: 'Widgets',     inStock: true  },
];

let userIdSeq = users.length + 1;
let itemIdSeq = items.length + 1;

export const nextUserId = () => userIdSeq++;
export const nextItemId = () => itemIdSeq++;
