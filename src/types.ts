export interface OlfactoryNotes {
  top: string;    // Notas de salida
  heart: string;  // Notas de corazón
  base: string;   // Notas de fondo
}

export type ProductTier = 'real_product' | 'demo_item';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  olfactoryFamily: string;
  description: string;
  notes: OlfactoryNotes;
  presentation: string;
  volume: string;
  price: number;
  points: number;
  inStock: boolean;
  isPromo?: boolean;
  promoLabel?: string;
  discountPercent?: number;
  image: string;
  isFeatured?: boolean;
  status: ProductTier;
  recommendedUse: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Reseller {
  code: string;
  name: string;
  phone: string;
  zone: string;
  active: boolean;
  level: string;
}

export interface Campaign {
  id: string;
  number: string;
  name: string;
  slogan: string;
  startDate: string;
  endDate: string;
  orderDeadline: string;
  status: 'activa' | 'proxima' | 'finalizada';
  bannerImage: string;
  highlightCategory: string;
}

export interface OrderCustomer {
  fullName: string;
  whatsapp: string;
  city: string;
  address: string;
  notes: string;
}

export interface Order {
  id: string;
  date: string;
  customer: OrderCustomer;
  resellerCode: string;
  resellerName: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  totalAmount: number;
  totalPoints: number;
  status: 'generado' | 'enviado_whatsapp';
}

export interface PointsLevel {
  points: number;
  title: string;
  benefit: string;
}
