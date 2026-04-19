export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import {
  Search, Star, Shield, Clock, MapPin, ChevronRight, ArrowRight,
  Wrench, Zap, Droplets, Paintbrush, Leaf, Home, Truck, Wind,
  Tv, Scissors, Package, Phone, Mail, Facebook, Instagram, Youtube,
  CheckCircle, ChevronDown, ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { HomeNavClient } from "@/components/HomeNavClient";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  plumbing: Droplets,
  electrical: Zap,
  cleaning: Wrench,
  painting: Paintbrush,
  carpentry: Home,
  gardening: Leaf,
  moving: Truck,
  ac_service: Wind,
};

const FAQS = [
  { q: "What is SkillSewa?", a: "SkillSewa is Nepal's trusted home service platform connecting customers with verified professionals for plumbing, electrical, cleaning, painting, and more." },
  { q: "How can I book a service?", a: "Simply search for the service you need, select from our verified professionals nearby, choose your issues, get an instant price estimate, and confirm your booking." },
  { q: "How are service providers selected?", a: "All professionals go through background verification, skill assessment, and document checks before being listed on our platform." },
  { q: "What locations does SkillSewa serve?", a: "We currently operate in Kathmandu, Lalitpur, Bhaktapur, Pokhara, and 20+ other cities across Nepal." },
  { q: "How are the costs associated with the services?", a: "We provide transparent pricing estimates upfront based on the issues you select. The final price is confirmed after the professional's inspection." },
  { q: "How do I contact SkillSewa support?", a: "You can reach us at support@skillsewa.com or call 01-5970XXX. We're available 7 days a week, 8AM–8PM." },
];

async function getPageData() {
  try {
    const [categories, featuredServices, recentBookingsCount] = await Promise.all([
      prisma.serviceCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.service.findMany({
        where: { isActive: true, isFeatured: true },
        include: { category: true },
        orderBy: { sortOrder: "asc" },
        take: 8,
      }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
    ]);
    return { categories, featuredServices, recentBookingsCount };
  } catch {
    return { categories: [] as Awaited<ReturnType<typeof prisma.serviceCategory.findMany>>, featuredServices: [] as Awaited<ReturnType<typeof prisma.service.findMany<{ include: { category: true } }>>>, recentBookingsCount: 0 };
  }
}

const POPULAR_SERVICES_STATIC = [
  { name: "Floor House Cleaning", category: "Cleaning", price: "Rs 1,200", rating: 4.7, reviews: 234, emoji: "🧹" },
  { name: "Flush Tank Replacement", category: "Plumbing", price: "Rs 800", rating: 4.8, reviews: 189, emoji: "🚿" },
  { name: "Electrical Bulb/Light Fix", category: "Electrical", price: "Rs 350", rating: 4.6, reviews: 312, emoji: "💡" },
  { name: "Plumbing Motor Issue", category: "Plumbing", price: "Rs 600", rating: 4.9, reviews: 97, emoji: "⚙️" },
  { name: "Cement Floor Repair", category: "Carpentry", price: "Rs 1,500", rating: 4.7, reviews: 145, emoji: "🏠" },
];

const TESTIMONIALS = [
  {
    name: "Anita Khanal",
    title: "Business Owner",
    avatar: "AK",
    text: "There was great communication about what was happening and what could be done. I was informed of everything before hand in regards to the price. The service girl fixed everything in a reasonable price and recommended for any electronic problems.",
    rating: 5,
  },
  {
    name: "Kadhyap Sharma",
    title: "Branch Manager, Alpha Life Insurance",
    avatar: "KS",
    text: "I had our solar water heating system completely serviced by SkillSewa and it's running very smoothly. We can have hot water 3 hours down within minutes. It's made our winter very comfortable. Highly recommended!",
    rating: 5,
  },
  {
    name: "Arjun Bhanu Shrestha",
    title: "Small Business Owner",
    avatar: "AB",
    text: "Getting household repair work done is becoming very hard these days. SkillSewa is a blessing — the young and energetic group of professionals react quickly. Quality work at reasonable prices. Kudos to them!",
    rating: 5,
  },
  {
    name: "Sanjiva Raj Bhandari",
    title: "Email Marketing Specialist",
    avatar: "SB",
    text: "My laptop works perfectly fine now after the repair by SkillSewa technicians — good communication, delivery on time, skillful, and reasonable price. Thank you for the wonderful work and I'd say if you are doing great!",
    rating: 5,
  },
];

export default async function HomePage() {
  const { categories, featuredServices } = await getPageData();

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── TOP NAV ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg">S</div>
              <span className="text-xl font-bold tracking-tight text-brand-700">SkillSewa</span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <Link href="/services" className="hover:text-brand-600 transition-colors">Services</Link>
              <Link href="/shop" className="hover:text-brand-600 transition-colors">Shop</Link>
              <Link href="/professionals" className="hover:text-brand-600 transition-colors">Become an Expert</Link>
              <div className="flex items-center gap-1 text-gray-400 cursor-pointer hover:text-brand-600">
                <MapPin className="h-3.5 w-3.5" />
                <span>Kathmandu</span>
              </div>
            </nav>

            {/* CTA */}
            <HomeNavClient />
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-brand-orange-50 pt-14 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
                Book Home Service<br />
                <span className="text-brand-600">Providers</span><br />
                at your fingertips
              </h1>
              <p className="text-gray-500 text-lg mb-8">
                Search, compare and match with Service Providers of your choice in 60 Seconds
              </p>

              {/* Search bar */}
              <div className="flex gap-2 bg-white rounded-xl shadow-lg border p-2 max-w-lg">
                <input
                  type="text"
                  placeholder='Try "Electrician"'
                  className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
                />
                <Link href="/book">
                  <button className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 transition-colors">
                    <Search className="h-4 w-4" />
                  </button>
                </Link>
              </div>

              {/* Popular searches */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-xs text-gray-400">Popular searches:</span>
                {["Electrician", "Plumber", "AC Installation"].map((s) => (
                  <Link key={s} href={`/book?q=${s}`}>
                    <span className="text-xs border rounded-full px-3 py-1 text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors cursor-pointer">
                      {s}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Hero image placeholder / illustration */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-80 h-80 rounded-full bg-brand-100 flex items-center justify-center">
                  <div className="w-64 h-64 rounded-full bg-brand-200 flex items-center justify-center">
                    <div className="text-8xl">👨‍🔧</div>
                  </div>
                </div>
                {/* Floating badges */}
                <div className="absolute top-4 -left-8 bg-white rounded-xl shadow-lg p-3 flex items-center gap-2">
                  <div className="h-8 w-8 bg-brand-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Verified Pro</p>
                    <p className="text-xs text-gray-400">Background checked</p>
                  </div>
                </div>
                <div className="absolute bottom-8 -right-6 bg-white rounded-xl shadow-lg p-3">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-xs font-semibold mt-1">4.9 avg rating</p>
                  <p className="text-xs text-gray-400">2,000+ reviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BROWSE BY CATEGORY ───────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Browse by Category</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
          {categories.length > 0
            ? categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.code] ?? Wrench;
                return (
                  <Link
                    key={cat.id}
                    href={`/book?category=${cat.id}`}
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-brand-50 transition-colors cursor-pointer"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                      <Icon className="h-7 w-7 text-gray-500 group-hover:text-brand-600 transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-gray-600 text-center leading-tight">{cat.name}</span>
                  </Link>
                );
              })
            : [
                { code: "plumbing", name: "Plumbing" },
                { code: "electrical", name: "Electrical" },
                { code: "cleaning", name: "Cleaning" },
                { code: "painting", name: "Painting" },
                { code: "carpentry", name: "Carpentry" },
                { code: "gardening", name: "Gardening" },
                { code: "moving", name: "Moving" },
                { code: "ac_service", name: "AC Service" },
              ].map((cat) => {
                const Icon = CATEGORY_ICONS[cat.code] ?? Wrench;
                return (
                  <Link
                    key={cat.code}
                    href={`/book?q=${cat.name}`}
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-brand-50 transition-colors cursor-pointer"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
                      <Icon className="h-7 w-7 text-gray-500 group-hover:text-brand-600 transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-gray-600 text-center">{cat.name}</span>
                  </Link>
                );
              })}
        </div>
      </section>

      {/* ── SHOP TEASER ─────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-r from-brand-600 to-brand-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-white">
              <h2 className="text-2xl font-bold mb-2">Shop Tools & Supplies</h2>
              <p className="text-brand-100">Browse verified suppliers for tools, equipment, cleaning supplies and more</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {["Tools", "Equipment", "Safety Gear", "Cleaning Supplies"].map((cat) => (
                  <span key={cat} className="text-xs bg-white/20 text-white rounded-full px-3 py-1">{cat}</span>
                ))}
              </div>
            </div>
            <Link href="/shop">
              <button className="shrink-0 bg-white text-brand-600 font-semibold px-6 py-3 rounded-xl hover:bg-brand-50 transition-colors flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Browse Shop
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURED SERVICES ─────────────────────────────────── */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured Services</h2>
            <Link href="/book" className="text-sm text-brand-600 font-medium hover:underline flex items-center gap-1">
              See All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(featuredServices.length > 0 ? featuredServices : [
              { id: "1", name: "Electrical Safety Audit", category: { name: "Electrical" }, basePrice: 649, minPrice: 449, rating: 4.7, imageUrl: null },
              { id: "2", name: "Bathroom Renovation", category: { name: "Plumbing" }, basePrice: 1500, minPrice: 900, rating: 4.8, imageUrl: null },
              { id: "3", name: "Home Deep Cleaning", category: { name: "Cleaning" }, basePrice: 1200, minPrice: 800, rating: 4.9, imageUrl: null },
              { id: "4", name: "Interior Painting", category: { name: "Painting" }, basePrice: 2500, minPrice: 1800, rating: 4.6, imageUrl: null },
            ] as any[]).map((service) => (
              <Link key={service.id} href={`/book?service=${service.id}`}>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer group">
                  <div className="h-36 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                    <span className="text-5xl">
                      {service.category?.name?.includes("Plumb") ? "🔧" :
                       service.category?.name?.includes("Electr") ? "⚡" :
                       service.category?.name?.includes("Clean") ? "🧹" :
                       service.category?.name?.includes("Paint") ? "🎨" : "🏠"}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-sm text-gray-900 leading-snug mb-1">{service.name}</p>
                    <p className="text-xs text-gray-400 mb-2">{service.category?.name}</p>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-medium text-gray-700">{Number(service.ratingAvg ?? service.rating ?? 4.7).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-400">From </span>
                        <span className="text-sm font-bold text-brand-600">Rs {Number(service.minPrice ?? service.basePrice).toLocaleString()}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── POPULAR SERVICES ─────────────────────────────────── */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Popular Services</h2>
          <Link href="/book" className="text-sm text-brand-600 font-medium hover:underline flex items-center gap-1">
            See All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {POPULAR_SERVICES_STATIC.map((s) => (
            <Link key={s.name} href="/book">
              <div className="group border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 bg-white cursor-pointer">
                <div className="h-28 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-4xl">
                  {s.emoji}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">{s.name}</p>
                  <p className="text-xs text-gray-400 mb-2">{s.category}</p>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-600">{s.rating} ({s.reviews})</span>
                  </div>
                  <p className="text-sm font-bold text-brand-600">{s.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-14 bg-brand-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">Looking for professionals to upgrade your home/office?</h2>
            <p className="text-brand-200 mt-2">Book SkillSewa experts in 4 easy steps</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", icon: Search, title: "Search Service", desc: "Choose from 50+ verified home services" },
              { step: "02", icon: CheckCircle, title: "Select Issues", desc: "Pick your specific problems, get instant estimate" },
              { step: "03", icon: Clock, title: "Book & Schedule", desc: "Choose your preferred date and time slot" },
              { step: "04", icon: Star, title: "Get it Done", desc: "Verified pro arrives, job done, you rate!" },
            ].map((step, i) => (
              <div key={step.step} className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 text-xl font-bold mb-3">
                  {step.step}
                </div>
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-brand-200">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/book">
              <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50">
                See Services <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900">See what our clients say about us</h2>
            <p className="text-gray-500 mt-2 max-w-2xl">
              We offer one stop solution for all your facility requirements. Our services allow you to focus on your core business by saving your time and reducing cost.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="text-brand-600 text-3xl font-serif mb-3">"</div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">{t.text}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <details key={i} className="group border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 select-none hover:bg-gray-50">
                {faq.q}
                <ChevronDown className="h-4 w-4 text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="py-14 bg-brand-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="grid grid-cols-3 gap-8">
            {[
              { value: "100K+", label: "Service Delivered" },
              { value: "500+", label: "Service Providers" },
              { value: "60+", label: "Home Services" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl sm:text-5xl font-extrabold">{stat.value}</p>
                <p className="text-brand-200 mt-2 text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP DOWNLOAD ─────────────────────────────────────── */}
      <section className="py-12 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2">DOWNLOAD APP NOW</h2>
          <p className="text-gray-400 text-sm mb-6">
            Book home service works through our mobile application, available on both Android and iPhone
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="#" className="flex items-center gap-3 bg-black border border-gray-700 rounded-xl px-5 py-3 hover:border-gray-500 transition-colors">
              <div className="text-2xl">▶</div>
              <div className="text-left">
                <p className="text-xs text-gray-400">GET IT ON</p>
                <p className="font-semibold">Google Play</p>
              </div>
            </a>
            <a href="#" className="flex items-center gap-3 bg-black border border-gray-700 rounded-xl px-5 py-3 hover:border-gray-500 transition-colors">
              <div className="text-2xl">🍎</div>
              <div className="text-left">
                <p className="text-xs text-gray-400">Download on the</p>
                <p className="font-semibold">App Store</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400 pt-14 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">S</div>
                <span className="text-white font-bold text-lg">SkillSewa</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Nepal's trusted platform connecting you with verified home service professionals.
              </p>
              <div className="flex gap-3">
                {[Facebook, Instagram, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-brand-600 transition-colors">
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {[
              {
                title: "Quick Links",
                links: ["Home", "Services", "Become a Professional", "About Us", "Blog"],
              },
              {
                title: "Services",
                links: ["Plumbing", "Electrical", "Cleaning", "Painting", "Carpentry"],
              },
              {
                title: "Company",
                links: ["Terms & Conditions", "Privacy Policy", "Help Center", "Careers", "Contact"],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-sm hover:text-brand-400 transition-colors">{link}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>© 2025 SkillSewa Pvt. Ltd. All rights reserved. Made with ❤️ in Nepal.</p>
            <div className="flex items-center gap-4">
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
