export type UserRole = "CUSTOMER" | "PROFESSIONAL" | "SUPPLIER" | "ADMIN";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PaymentMethod = "ESEWA" | "KHALTI" | "CASH" | "WALLET";

export type ProfessionalGrade = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "ELITE";

export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  isVerified: boolean;
  locationLat?: number | null;
  locationLng?: number | null;
  address?: string | null;
  city?: string | null;
  createdAt: string;
}

export interface Professional {
  id: string;
  userId: string;
  bio?: string | null;
  grade: ProfessionalGrade;
  ratingAvg: number;
  ratingCount: number;
  jobsCount: number;
  jobsCompleted: number;
  isAvailable: boolean;
  isVerified: boolean;
  responseRate: number;
  loyaltyMonths: number;
  user?: User;
  skillCategories?: ProfessionalSkillCategory[];
}

export interface ProfessionalSkillCategory {
  id: string;
  category: ServiceCategory;
  yearsExp: number;
}

export interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  nameNp?: string | null;
  description?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  basePrice: number;
  priceUnit: string;
  imageUrl?: string | null;
  category: ServiceCategory;
}

export interface Booking {
  id: string;
  customerId: string;
  professionalId?: string | null;
  serviceId: string;
  status: BookingStatus;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  addressLine?: string | null;
  notes?: string | null;
  quotedPrice?: number | null;
  finalPrice?: number | null;
  connectionFee: number;
  createdAt: string;
  customer?: User;
  professional?: Professional;
  service?: Service;
}

export interface Product {
  id: string;
  supplierId: string;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  unit: string;
  imageUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  totalSold: number;
  rating: number;
  ratingCount: number;
  supplier?: Supplier;
}

export interface Supplier {
  id: string;
  userId: string;
  businessName: string;
  description?: string | null;
  logoUrl?: string | null;
  isVerified: boolean;
  rating: number;
  totalSales: number;
  user?: User;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  shippingAddress?: string | null;
  createdAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product?: Product;
}

export interface Wallet {
  id: string;
  userId: string;
  totalBalance: number;
  availableBalance: number;
  lockedBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  transactions?: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: string;
  status: string;
  amount: number;
  description?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer?: User;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalProfessionals: number;
  pendingBookings: number;
  completedBookings: number;
  totalOrders: number;
  avgRating: number;
}
