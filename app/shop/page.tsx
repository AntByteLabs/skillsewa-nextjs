"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { ShoppingCart, Package, Star, Search, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  businessName: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  imageUrl: string | null;
  category: string;
  stock: number;
  rating: number;
  supplier: Supplier;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  supplierId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "ALL", label: "All" },
  { value: "TOOLS", label: "Tools" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "CLEANING_SUPPLIES", label: "Cleaning Supplies" },
  { value: "SAFETY_GEAR", label: "Safety Gear" },
  { value: "PARTS", label: "Parts & Accessories" },
  { value: "MATERIALS", label: "Materials" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_METHODS = ["ESEWA", "KHALTI", "CASH"] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const { user, isAuthenticated } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [loginPrompt, setLoginPrompt] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setProducts(
            json.data.map((p: Product & { price: number | string; comparePrice: number | string | null; rating: number | string }) => ({
              ...p,
              price: Number(p.price),
              comparePrice: p.comparePrice !== null ? Number(p.comparePrice) : null,
              rating: Number(p.rating),
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const filtered = products.filter((p) => {
    const matchSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier.businessName.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "ALL" || p.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = cartSubtotal > 2000 ? 0 : cartItems.length > 0 ? 150 : 0;
  const cartTotal = cartSubtotal + deliveryFee;

  // ── Cart helpers ───────────────────────────────────────────────────────────

  function addToCart(product: Product) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, price: product.price, qty: 1 },
      ];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCartItems((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  // ── Checkout ───────────────────────────────────────────────────────────────

  function handleCheckoutClick() {
    if (!isAuthenticated) {
      setLoginPrompt(true);
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
  }

  async function handlePlaceOrder() {
    if (!shippingAddress.trim()) {
      setOrderError("Please enter a shipping address.");
      return;
    }
    setOrderLoading(true);
    setOrderError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((i) => ({ productId: i.productId, quantity: i.qty })),
          shippingAddress,
          paymentMethod,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setOrderError(json.error ?? "Failed to place order.");
      } else {
        setOrderSuccess(true);
        setCartItems([]);
        setShippingAddress("");
        setPaymentMethod("CASH");
      }
    } catch {
      setOrderError("Network error. Please try again.");
    } finally {
      setOrderLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
            <p className="text-sm text-muted-foreground">Browse products from our suppliers</p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 rounded-lg border bg-white px-4 py-2 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-medium">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Category */}
        <div className="max-w-7xl mx-auto px-4 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products or suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat.value
                    ? "bg-brand-600 text-white"
                    : "bg-white border text-muted-foreground hover:bg-gray-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border animate-pulse">
                <div className="aspect-video bg-gray-200 rounded-t-xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => {
              const inCart = cartItems.find((i) => i.productId === product.id);
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Image */}
                  <div className="aspect-video rounded-t-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <div>
                      <p className="font-semibold leading-snug line-clamp-2">{product.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{product.supplier.businessName}</p>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-base">{formatCurrency(product.price)}</span>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatCurrency(product.comparePrice)}
                        </span>
                      )}
                    </div>

                    {/* Stock & Rating row */}
                    <div className="flex items-center justify-between">
                      {product.stock < 10 ? (
                        <Badge variant="destructive" className="text-xs">
                          Low Stock: {product.stock} left
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{product.stock} in stock</span>
                      )}
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-medium">{product.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Add to Cart */}
                    <div className="mt-auto pt-2">
                      {inCart ? (
                        <div className="flex items-center justify-between border rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQty(product.id, -1)}
                            className="px-3 py-2 hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-semibold">{inCart.qty}</span>
                          <button
                            onClick={() => updateQty(product.id, 1)}
                            disabled={inCart.qty >= product.stock}
                            className="px-3 py-2 hover:bg-gray-100 transition-colors disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          size="sm"
                          disabled={product.stock === 0}
                          onClick={() => addToCart(product)}
                        >
                          {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {cartOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setCartOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" /> Cart
                {cartCount > 0 && (
                  <Badge variant="secondary">{cartCount} items</Badge>
                )}
              </h2>
              <button onClick={() => setCartOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} × {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(item.productId, -1)}
                        className="h-7 w-7 rounded border flex items-center justify-center hover:bg-gray-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.productId, 1)}
                        className="h-7 w-7 rounded border flex items-center justify-center hover:bg-gray-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="h-7 w-7 rounded border flex items-center justify-center text-red-500 hover:bg-red-50 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold shrink-0 w-20 text-right">
                      {formatCurrency(item.price * item.qty)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t px-5 py-4 space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span>{deliveryFee === 0 ? "Free" : formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                </div>
                <Button className="w-full" onClick={handleCheckoutClick}>
                  Checkout
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Login Prompt Modal */}
      {loginPrompt && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Login Required</h3>
                <button onClick={() => setLoginPrompt(false)}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <p className="text-muted-foreground text-sm">
                You need to be logged in to place an order. Please login or create an account.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setLoginPrompt(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setLoginPrompt(false);
                    window.location.href = "/login";
                  }}
                >
                  Login
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Checkout Modal */}
      {checkoutOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
              {orderSuccess ? (
                <div className="text-center py-4 space-y-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <ShoppingCart className="h-7 w-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold">Order Placed!</h3>
                  <p className="text-muted-foreground text-sm">
                    Your order has been placed successfully. You can track it in My Orders.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setCheckoutOpen(false);
                      setOrderSuccess(false);
                    }}
                  >
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Checkout</h3>
                    <button onClick={() => setCheckoutOpen(false)}>
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                    {cartItems.map((item) => (
                      <div key={item.productId} className="flex justify-between">
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {item.name} × {item.qty}
                        </span>
                        <span className="font-medium">{formatCurrency(item.price * item.qty)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1 flex justify-between font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Shipping Address</label>
                    <Input
                      placeholder="Enter your full delivery address..."
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                            paymentMethod === method
                              ? "border-brand-600 bg-brand-50 text-brand-700"
                              : "border-gray-200 hover:bg-gray-50 text-muted-foreground"
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {orderError && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{orderError}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCheckoutOpen(false);
                        setCartOpen(true);
                      }}
                      disabled={orderLoading}
                    >
                      Back to Cart
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handlePlaceOrder}
                      disabled={orderLoading}
                    >
                      {orderLoading ? "Placing..." : `Pay ${formatCurrency(cartTotal)}`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
