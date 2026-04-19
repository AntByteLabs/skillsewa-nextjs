import { NextRequest } from "next/server";
import { z } from "zod";
import { getTokenFromRequest } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const ClassifySchema = z.object({
  description: z.string().min(3).max(500),
});

export async function POST(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (!token) return apiError("Unauthorized", 401);

  const body = await req.json();
  const parsed = ClassifySchema.safeParse(body);
  if (!parsed.success) return apiError("Description required", 422);

  const { description } = parsed.data;

  // Simple keyword-based classification (expand with AI API when keys are available)
  const categories = await prisma.serviceCategory.findMany({ where: { isActive: true } });

  const keywords: Record<string, string[]> = {
    plumbing: ["pipe", "leak", "tap", "drain", "water", "faucet", "toilet", "plumb"],
    electrical: ["wire", "switch", "light", "fan", "electric", "power", "socket", "bulb"],
    cleaning: ["clean", "dust", "mop", "sweep", "wash", "dirty", "stain"],
    painting: ["paint", "color", "wall", "ceiling", "brush", "coat"],
    carpentry: ["wood", "furniture", "door", "window", "cabinet", "shelf", "repair"],
    gardening: ["garden", "plant", "tree", "grass", "lawn", "weed", "flower"],
    moving: ["move", "shift", "pack", "relocate", "transport", "carry"],
    ac_service: ["ac", "air", "conditioner", "cool", "hvac", "split"],
  };

  const desc = description.toLowerCase();
  let bestMatch: { category: typeof categories[0]; score: number } | null = null;

  for (const category of categories) {
    const kws = keywords[category.code] ?? [];
    const score = kws.filter((kw) => desc.includes(kw)).length;
    if (score > (bestMatch?.score ?? -1)) {
      bestMatch = { category, score };
    }
  }

  if (!bestMatch || bestMatch.score === 0) {
    return apiSuccess({ category: null, confidence: 0, message: "Could not classify. Please select manually." });
  }

  const services = await prisma.service.findMany({
    where: { categoryId: bestMatch.category.id, isActive: true },
    take: 3,
  });

  return apiSuccess({
    category: {
      id: bestMatch.category.id,
      code: bestMatch.category.code,
      name: bestMatch.category.name,
    },
    confidence: Math.min(100, bestMatch.score * 25),
    suggestedServices: services.map((s) => ({ id: s.id, name: s.name, basePrice: Number(s.basePrice) })),
  });
}
