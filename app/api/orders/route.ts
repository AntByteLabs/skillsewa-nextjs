export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError, apiPaginated, getPaginationParams } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const CreateOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
  shippingAddress: z.string().min(5),
  notes: z.string().optional(),
  paymentMethod: z.enum(["ESEWA", "KHALTI", "CASH"]),
});

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);
  const status = req.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> =
    token.role === "CUSTOMER"
      ? { customerId: token.userId }
      : token.role === "ADMIN"
      ? {}
      : token.role === "SUPPLIER"
      ? { items: { some: { product: { supplier: { userId: token.userId } } } } }
      : {};

  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: {
          include: { product: { select: { name: true, imageUrl: true, price: true } } },
        },
        payment: { select: { status: true, method: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return apiPaginated(
    orders.map((o) => ({ ...o, subtotal: Number(o.subtotal), total: Number(o.total) })),
    total,
    page,
    limit
  );
}

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token || !["CUSTOMER", "PROFESSIONAL"].includes(token.role)) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation failed", 422, parsed.error.flatten());

  const { items, shippingAddress, notes, paymentMethod } = parsed.data;

  // Fetch products and validate stock
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, isActive: true },
  });

  if (products.length !== items.length) return apiError("Some products not found or unavailable", 400);

  const orderItems = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
    const unitPrice = Number(product.price);
    return { productId: item.productId, quantity: item.quantity, unitPrice, total: unitPrice * item.quantity };
  });

  const subtotal = orderItems.reduce((s, i) => s + i.total, 0);
  const deliveryFee = subtotal > 2000 ? 0 : 150;
  const total = subtotal + deliveryFee;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        customerId: token.userId,
        subtotal,
        deliveryFee,
        total,
        shippingAddress,
        notes,
        status: "PENDING",
        items: {
          create: orderItems,
        },
      },
      include: {
        items: { include: { product: { select: { name: true } } } },
      },
    });

    // Create payment
    await tx.payment.create({
      data: {
        orderId: newOrder.id,
        amount: total,
        method: paymentMethod as "ESEWA" | "KHALTI" | "CASH",
        status: paymentMethod === "CASH" ? "PENDING" : "PENDING",
      },
    });

    // Update stock
    await Promise.all(
      items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      )
    );

    return newOrder;
  });

  return apiSuccess(order, 201);
}
