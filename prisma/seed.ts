import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SkillSewa database...");

  // Service Categories
  const categories = await Promise.all([
    prisma.serviceCategory.upsert({
      where: { code: "plumbing" },
      update: {},
      create: { code: "plumbing", name: "Plumbing", nameNp: "प्लम्बिङ", description: "Pipe repairs, installation, drainage", iconUrl: "🔧", sortOrder: 1 },
    }),
    prisma.serviceCategory.upsert({
      where: { code: "electrical" },
      update: {},
      create: { code: "electrical", name: "Electrical", nameNp: "बिजुली", description: "Wiring, fittings, appliance repair", iconUrl: "⚡", sortOrder: 2 },
    }),
    prisma.serviceCategory.upsert({
      where: { code: "cleaning" },
      update: {},
      create: { code: "cleaning", name: "Cleaning", nameNp: "सफाई", description: "Home and office deep cleaning", iconUrl: "🧹", sortOrder: 3 },
    }),
    prisma.serviceCategory.upsert({
      where: { code: "painting" },
      update: {},
      create: { code: "painting", name: "Painting", nameNp: "रंग", description: "Interior and exterior painting", iconUrl: "🎨", sortOrder: 4 },
    }),
    prisma.serviceCategory.upsert({
      where: { code: "carpentry" },
      update: {},
      create: { code: "carpentry", name: "Carpentry", nameNp: "काठको काम", description: "Furniture repair and woodwork", iconUrl: "🪚", sortOrder: 5 },
    }),
    prisma.serviceCategory.upsert({
      where: { code: "gardening" },
      update: {},
      create: { code: "gardening", name: "Gardening", nameNp: "बगैचा", description: "Lawn care and landscaping", iconUrl: "🌿", sortOrder: 6 },
    }),
    prisma.serviceCategory.upsert({
      where: { code: "moving" },
      update: {},
      create: { code: "moving", name: "Moving", nameNp: "सरुवा", description: "Home shifting and packing", iconUrl: "🚛", sortOrder: 7 },
    }),
    prisma.serviceCategory.upsert({
      where: { code: "ac_service" },
      update: {},
      create: { code: "ac_service", name: "AC Service", nameNp: "एसी सर्भिस", description: "AC installation, repair, cleaning", iconUrl: "❄️", sortOrder: 8 },
    }),
  ]);

  console.log(`✅ Created ${categories.length} service categories`);

  // Services
  const [plumbing, electrical, cleaning, painting] = categories;
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: "svc-plumbing-1" },
      update: {},
      create: { id: "svc-plumbing-1", categoryId: plumbing.id, name: "Tap Repair", basePrice: 300, priceUnit: "per_visit" },
    }),
    prisma.service.upsert({
      where: { id: "svc-plumbing-2" },
      update: {},
      create: { id: "svc-plumbing-2", categoryId: plumbing.id, name: "Pipe Installation", basePrice: 800, priceUnit: "per_visit" },
    }),
    prisma.service.upsert({
      where: { id: "svc-elec-1" },
      update: {},
      create: { id: "svc-elec-1", categoryId: electrical.id, name: "Fan Installation", basePrice: 400, priceUnit: "per_unit" },
    }),
    prisma.service.upsert({
      where: { id: "svc-clean-1" },
      update: {},
      create: { id: "svc-clean-1", categoryId: cleaning.id, name: "Full Home Cleaning", basePrice: 1500, priceUnit: "per_visit" },
    }),
    prisma.service.upsert({
      where: { id: "svc-paint-1" },
      update: {},
      create: { id: "svc-paint-1", categoryId: painting.id, name: "Room Painting", basePrice: 3000, priceUnit: "per_room" },
    }),
  ]);
  console.log(`✅ Created ${services.length} services`);

  const hash = (pwd: string) => bcrypt.hash(pwd, 12);

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { phone: "9800000001" },
    update: {},
    create: {
      phone: "9800000001",
      name: "Admin User",
      email: "admin@skillsewa.com",
      passwordHash: await hash("demo1234"),
      role: "ADMIN",
      isActive: true,
      isVerified: true,
      city: "Kathmandu",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });

  // Professional user
  const proUser = await prisma.user.upsert({
    where: { phone: "9800000002" },
    update: {},
    create: {
      phone: "9800000002",
      name: "Hari Bahadur",
      email: "hari@example.com",
      passwordHash: await hash("demo1234"),
      role: "PROFESSIONAL",
      isActive: true,
      isVerified: true,
      city: "Kathmandu",
      locationLat: 27.7172,
      locationLng: 85.3240,
    },
  });
  const proWallet = await prisma.wallet.upsert({
    where: { userId: proUser.id },
    update: {},
    create: { userId: proUser.id, availableBalance: 5000, lockedBalance: 2500, totalBalance: 7500, lifetimeEarned: 25000 },
  });
  const professional = await prisma.professional.upsert({
    where: { userId: proUser.id },
    update: {},
    create: {
      userId: proUser.id,
      grade: "GOLD",
      ratingAvg: 4.7,
      ratingCount: 48,
      jobsCount: 52,
      jobsCompleted: 50,
      isAvailable: true,
      isVerified: true,
      responseRate: 96,
      loyaltyMonths: 8,
    },
  });
  await prisma.professionalSkillCategory.upsert({
    where: { professionalId_categoryId: { professionalId: professional.id, categoryId: plumbing.id } },
    update: {},
    create: { professionalId: professional.id, categoryId: plumbing.id, yearsExp: 5 },
  });
  await prisma.professionalSkillCategory.upsert({
    where: { professionalId_categoryId: { professionalId: professional.id, categoryId: electrical.id } },
    update: {},
    create: { professionalId: professional.id, categoryId: electrical.id, yearsExp: 3 },
  });

  // Customer user
  const custUser = await prisma.user.upsert({
    where: { phone: "9800000003" },
    update: {},
    create: {
      phone: "9800000003",
      name: "Sunita Sharma",
      email: "sunita@example.com",
      passwordHash: await hash("demo1234"),
      role: "CUSTOMER",
      isActive: true,
      isVerified: true,
      city: "Lalitpur",
      locationLat: 27.6644,
      locationLng: 85.3188,
    },
  });
  await prisma.wallet.upsert({
    where: { userId: custUser.id },
    update: {},
    create: { userId: custUser.id },
  });

  // Supplier user
  const supUser = await prisma.user.upsert({
    where: { phone: "9800000004" },
    update: {},
    create: {
      phone: "9800000004",
      name: "Ram Prasad",
      email: "ram@toolsnepal.com",
      passwordHash: await hash("demo1234"),
      role: "SUPPLIER",
      isActive: true,
      isVerified: true,
      city: "Kathmandu",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: supUser.id },
    update: {},
    create: { userId: supUser.id },
  });
  const supplier = await prisma.supplier.upsert({
    where: { userId: supUser.id },
    update: {},
    create: {
      userId: supUser.id,
      businessName: "Tools Nepal Pvt Ltd",
      description: "Nepal's largest tool supplier for professionals",
      isVerified: true,
      rating: 4.5,
      totalSales: 320,
    },
  });

  // Sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: "premium-pipe-wrench-14inch" },
      update: {},
      create: {
        supplierId: supplier.id,
        name: "Premium Pipe Wrench 14 inch",
        slug: "premium-pipe-wrench-14inch",
        description: "Heavy-duty pipe wrench for professional plumbers",
        category: "TOOLS",
        price: 850,
        comparePrice: 1100,
        stock: 45,
        unit: "piece",
        isActive: true,
        isFeatured: true,
        totalSold: 120,
        rating: 4.6,
        ratingCount: 38,
      },
    }),
    prisma.product.upsert({
      where: { slug: "safety-helmet-yellow" },
      update: {},
      create: {
        supplierId: supplier.id,
        name: "Safety Helmet - Yellow",
        slug: "safety-helmet-yellow",
        category: "SAFETY_GEAR",
        price: 350,
        stock: 100,
        unit: "piece",
        isActive: true,
        isFeatured: false,
        totalSold: 85,
        rating: 4.3,
        ratingCount: 22,
      },
    }),
    prisma.product.upsert({
      where: { slug: "cleaning-supplies-kit-professional" },
      update: {},
      create: {
        supplierId: supplier.id,
        name: "Professional Cleaning Kit",
        slug: "cleaning-supplies-kit-professional",
        category: "CLEANING_SUPPLIES",
        price: 1200,
        comparePrice: 1500,
        stock: 30,
        unit: "kit",
        isActive: true,
        isFeatured: true,
        totalSold: 65,
        rating: 4.8,
        ratingCount: 42,
      },
    }),
  ]);
  console.log(`✅ Created ${products.length} products`);

  // Sample booking
  const booking = await prisma.booking.create({
    data: {
      customerId: custUser.id,
      professionalId: professional.id,
      serviceId: services[0].id,
      status: "COMPLETED",
      addressLine: "Pulchowk, Lalitpur",
      locationLat: 27.6644,
      locationLng: 85.3188,
      connectionFee: 10,
      quotedPrice: 300,
      finalPrice: 350,
      platformRevenue: 17.5,
      walletCredit: 17.5,
      scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    },
  });

  // Review for the booking
  await prisma.review.upsert({
    where: { bookingId: booking.id },
    update: {},
    create: {
      bookingId: booking.id,
      reviewerId: custUser.id,
      revieweeId: proUser.id,
      rating: 5,
      comment: "Excellent work! Fixed the tap quickly and professionally.",
      isPublic: true,
    },
  });

  // Platform configs
  await Promise.all([
    prisma.platformConfig.upsert({
      where: { key: "commission_rate" },
      update: { value: "0.10" },
      create: { key: "commission_rate", value: "0.10", description: "Service commission rate (10%)" },
    }),
    prisma.platformConfig.upsert({
      where: { key: "platform_share" },
      update: { value: "0.05" },
      create: { key: "platform_share", value: "0.05", description: "Platform revenue share (5%)" },
    }),
    prisma.platformConfig.upsert({
      where: { key: "connection_fee" },
      update: { value: "10" },
      create: { key: "connection_fee", value: "10", description: "Connection fee per booking (Rs 10)" },
    }),
    prisma.platformConfig.upsert({
      where: { key: "min_withdrawal" },
      update: { value: "500" },
      create: { key: "min_withdrawal", value: "500", description: "Minimum withdrawal amount" },
    }),
  ]);

  console.log("✅ Platform configs seeded");
  console.log("\n🎉 Seed complete!");
  console.log("\nDemo accounts (password: demo1234):");
  console.log("  Admin:        9800000001");
  console.log("  Professional: 9800000002");
  console.log("  Customer:     9800000003");
  console.log("  Supplier:     9800000004");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
