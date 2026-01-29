export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'purchase' | 'sale';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  userId: string;
  createdAt: Date;
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  askPrice: number;
  status: string;
  cardId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  price: number;
  status: string;
  listingId: string;
  buyerId: string;
  cardId: string;
  createdAt: Date;
}
