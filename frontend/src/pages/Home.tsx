import { useState } from "react";

type Page = "home" | "services" | "about" | "quote" | "reviews" | "contact";

interface HomeProps {
  setPage: (page: Page) => void;
}

const services = [
  { icon: "🏠", title: "Residential Moving", desc: "Full-service home moves handled with care, from apartments to large family homes." },
  { icon: "🏢", title: "Commercial Moving", desc: "Minimize downtime with our efficient office and business relocation services." },
  { icon: "📍", title: "Local Moving", desc: "Seamless moves within Lethbridge and surrounding communities." },
  { icon: "🛣️", title: "Long-Distance Moving", desc: "Reliable moves between cities across Alberta — stress-free, door to door." },
  { icon: "📦", title: "Packing & Unpacking", desc: "Professional packing with quality materials to protect everything you own." },
  { icon: "🚛", title: "Loading & Unloading", desc: "Need help loading your rental truck? We bring the muscle and the know-how." },
  { icon: "🛋️", title: "Furniture Moving", desc: "Safe disassembly, moving, and reassembly of all furniture types." },
  { icon: "🏋️", title: "Heavy Item Moving", desc: "Pianos, safes, gym equipment — nothing is too heavy for our team." },
];

const whyUs = [
  { icon: "✓", title: "Reliable Service", desc: "We show up on time, every time. Your schedule matters to us." },
  { icon: "⭐", title: "Professional Movers", desc: "Trained, background-checked crew members you can trust in your home." },
  { icon: "🛡️", title: "Careful Handling", desc: "We treat your belongings like our own — wrapped, padded, and protected." },
  { icon: "💬", title: "Transparent Quotes", desc: "No hidden fees. The price we quote is the price you pay." },
  { icon: "🚚", title: "Fully Equipped", desc: "Modern trucks, professional dollies, blankets, and all the right gear." },
  { icon: "🏘️", title: "Locally Owned", desc: "Proudly based in Lethbridge — we know this community because we're part of it." },
];

const reviews = [
  { name: "Sarah M.", location: "Lethbridge, AB", rating: 5, text: "NextViewMove made our home move completely stress-free. The crew was professional, fast, and took amazing care of our furniture. Would absolutely recommend to anyone." },
  { name: "James T.", location: "Coaldale, AB", rating: 5, text: "Best movers I've hired in Alberta. Showed up on time, kept everything organized, and finished ahead of schedule. Fair pricing with no surprises." },
  { name: "Lisa K.", location: "Lethbridge, AB", rating: 5, text: "We moved from Lethbridge to Calgary and couldn't have asked for a smoother experience. Professional crew and everything arrived in perfect condition." },
];

const faqs = [
  { q: "How much does a move cost?", a: "Every move is unique. Costs depend on the size of your home, distance, services needed, and time of year. We provide free, no-obligation quotes so you know exactly what to expect." },
  { q: "How far in advance should I book?", a: "We recommend booking at least 2–4 weeks ahead, especially during peak summer months. That said, we'll always try to accommodate last-minute moves when possible." },
  { q: "Do you provide packing services?", a: "Yes! We offer full packing and unpacking services using professional-grade materials. You can pack yourself, have us pack everything, or anything in between." },
  { q: "Do you move large furniture and heavy items?", a: "Absolutely. We're equipped to move pianos, safes, gym equipment, and oversized furniture. Just let us know in advance so we can bring the right equipment." },
  { q: "Do you move apartments and condos?", a: "Yes — apartments and condos are our specialty. We're experienced with elevator logistics, narrow hallways, and building regulations." },
  { q: "Do you provide long-distance moving?", a: "We service all of Southern Alberta, including moves to Calgary, Medicine Hat, and surrounding cities. Ask us about your route." },
  { q: "How do I request a quote?", a: "Simple — fill out our online quote form or give us a call. We'll get back to you quickly with a clear, detailed estimate." },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#F05A1A" stroke="none">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  );
}

export default function Home({ setPage }: HomeProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleNav = (page: Page) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center bg-[#0C2340]"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1777245144225-8ba28a9bb6fc?w=1440&h=900&fit=crop&auto=format)",
          }}
        >
          <div className="absolute inset-0 bg-[#0C2340]/78" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 pt-40">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="h-px w-8 bg-[#F05A1A]" />
              <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">
                Lethbridge, Alberta
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-white leading-tight mb-6">
              Moving Made
              <br />
              <span className="text-[#F05A1A]">Simple.</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/75 leading-relaxed mb-10 max-w-xl">
              Reliable moving services in Lethbridge and Southern Alberta. From
              apartments to homes and businesses, we're here to make your move
              easier.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button
                onClick={() => handleNav("quote")}
                className="bg-[#F05A1A] hover:bg-[#D44D12] text-white font-bold px-8 py-4 rounded text-sm tracking-wide transition-all hover:shadow-lg hover:shadow-orange-900/30 active:scale-95"
              >
                GET A FREE QUOTE
              </button>
              <a
                href="tel:+14039297209"
                className="border-2 border-white/40 hover:border-white text-white font-bold px-8 py-4 rounded text-sm tracking-wide transition-colors text-center"
              >
                CALL NOW — (403) 929-7209
              </a>
            </div>

            <div className="flex items-center gap-4 text-white/60 text-sm">
              {["Professional", "Reliable", "Local"].map((tag) => (
                <span key={tag} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F05A1A] inline-block" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="white"
            strokeWidth="2"
            viewBox="0 0 24 24"
            opacity="0.4"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <div className="bg-[#F05A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 text-white text-sm font-semibold">
            {[
              "Licensed & Insured",
              "Free No-Obligation Quotes",
              "Locally Owned & Operated",
              "Serving Southern Alberta",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Services ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">
              What We Offer
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#0C2340] mt-3">
              Moving Services That Fit
              <br className="hidden sm:block" /> Your Needs
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                onClick={() => handleNav("services")}
                className="group border border-slate-100 rounded-xl p-6 hover:border-[#F05A1A]/30 hover:shadow-lg hover:shadow-[#F05A1A]/5 transition-all cursor-pointer"
              >
                <div className="text-3xl mb-4">{s.icon}</div>
                <h3 className="font-display font-bold text-[#0C2340] text-lg mb-2 group-hover:text-[#F05A1A] transition-colors">
                  {s.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  {s.desc}
                </p>
                <span className="text-[#F05A1A] text-sm font-semibold flex items-center gap-1">
                  Learn More
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => handleNav("services")}
              className="border-2 border-[#0C2340] text-[#0C2340] hover:bg-[#0C2340] hover:text-white font-bold px-8 py-3.5 rounded text-sm tracking-wide transition-all"
            >
              VIEW ALL SERVICES
            </button>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">
                Our Commitment
              </span>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#0C2340] mt-3 mb-6">
                Why Choose
                <br />
                NextViewMove?
              </h2>
              <p className="text-slate-500 leading-relaxed mb-10">
                We're not just movers — we're your neighbours. Every move
                matters to us, and we bring the same care and professionalism to
                your move that we'd want for our own families.
              </p>
              <button
                onClick={() => handleNav("quote")}
                className="bg-[#F05A1A] hover:bg-[#D44D12] text-white font-bold px-7 py-3.5 rounded text-sm tracking-wide transition-colors"
              >
                GET A FREE QUOTE
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {whyUs.map((item) => (
                <div
                  key={item.title}
                  className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FEE8DC] flex items-center justify-center text-lg mb-3">
                    {item.icon}
                  </div>
                  <h4 className="font-display font-bold text-[#0C2340] mb-1.5">
                    {item.title}
                  </h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">
              The Process
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#0C2340] mt-3">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-[#F05A1A]/20" />
            {[
              {
                num: "01",
                title: "Request a Quote",
                desc: "Fill out our quick online form or give us a call. Tell us about your move and we'll get back to you with a clear, detailed quote — no obligation.",
              },
              {
                num: "02",
                title: "Plan Your Move",
                desc: "We'll work with you to schedule the move, confirm all details, and answer any questions. Our team handles the logistics so you don't have to.",
              },
              {
                num: "03",
                title: "We Move You",
                desc: "Our professional crew arrives on time, takes excellent care of your belongings, and gets you settled into your new space efficiently.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="flex flex-col items-center text-center md:items-start md:text-left"
              >
                <div className="w-24 h-24 rounded-full bg-[#0C2340] flex items-center justify-center mb-6 relative z-10">
                  <span className="font-display font-bold text-2xl text-[#F05A1A]">
                    {step.num}
                  </span>
                </div>
                <h3 className="font-display font-bold text-[#0C2340] text-xl mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section className="bg-[#0C2340] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Ready to Make Your Move?
          </h2>
          <p className="text-white/60 text-lg mb-10">
            Tell us about your move and get started with a free quote. No
            commitment, no hassle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleNav("quote")}
              className="bg-[#F05A1A] hover:bg-[#D44D12] text-white font-bold px-8 py-4 rounded text-sm tracking-wide transition-colors"
            >
              GET A FREE QUOTE
            </button>
            <a
              href="tel:+14039297209"
              className="border-2 border-white/30 hover:border-white text-white font-bold px-8 py-4 rounded text-sm tracking-wide transition-colors text-center"
            >
              CALL (403) 929-7209
            </a>
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">
              Testimonials
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#0C2340] mt-3">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((r) => (
              <div
                key={r.name}
                className="border border-slate-100 rounded-2xl p-8 shadow-sm"
              >
                <StarRating count={r.rating} />
                <p className="text-slate-600 leading-relaxed my-5 text-sm">
                  "{r.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0C2340] flex items-center justify-center text-white font-bold text-sm">
                    {r.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-[#0C2340] text-sm">
                      {r.name}
                    </div>
                    <div className="text-slate-400 text-xs">{r.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => handleNav("reviews")}
              className="text-[#F05A1A] font-semibold text-sm hover:underline"
            >
              View all reviews →
            </button>
          </div>
        </div>
      </section>

      {/* ── Service Area ── */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">
                Where We Work
              </span>
              <h2 className="font-display text-4xl font-bold text-[#0C2340] mt-3 mb-6">
                Proudly Serving
                <br />
                Southern Alberta
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Based in Lethbridge, we provide moving services throughout
                Southern Alberta. Whether you're moving across town or across
                the region, we've got you covered.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Lethbridge",
                  "Coaldale",
                  "Coalhurst",
                  "Taber",
                  "Fort Macleod",
                  "Picture Butte",
                  "Calgary",
                  "Medicine Hat",
                ].map((city) => (
                  <div
                    key={city}
                    className="flex items-center gap-2 text-slate-600 text-sm"
                  >
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      stroke="#F05A1A"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {city}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative bg-[#0C2340] rounded-2xl overflow-hidden h-80 flex items-center justify-center">
              <div className="absolute inset-0 opacity-10">
                <svg
                  viewBox="0 0 400 300"
                  className="w-full h-full"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <path
                    d="M0,150 Q100,50 200,150 T400,150"
                    stroke="white"
                    strokeWidth="1"
                    fill="none"
                    opacity="0.4"
                  />
                  <path
                    d="M0,200 Q100,100 200,200 T400,200"
                    stroke="white"
                    strokeWidth="1"
                    fill="none"
                    opacity="0.3"
                  />
                  <path d="M50,0 L50,300" stroke="white" strokeWidth="0.5" opacity="0.2" />
                  <path d="M150,0 L150,300" stroke="white" strokeWidth="0.5" opacity="0.2" />
                  <path d="M250,0 L250,300" stroke="white" strokeWidth="0.5" opacity="0.2" />
                  <path d="M350,0 L350,300" stroke="white" strokeWidth="0.5" opacity="0.2" />
                  <path d="M0,75 L400,75" stroke="white" strokeWidth="0.5" opacity="0.2" />
                  <path d="M0,150 L400,150" stroke="white" strokeWidth="0.5" opacity="0.2" />
                  <path d="M0,225 L400,225" stroke="white" strokeWidth="0.5" opacity="0.2" />
                </svg>
              </div>
              <div className="relative text-center">
                <div className="w-16 h-16 rounded-full bg-[#F05A1A] flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="28"
                    height="28"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="text-white font-display font-bold text-2xl">
                  Lethbridge, AB
                </div>
                <div className="text-white/50 text-sm mt-1">Our Home Base</div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["Coaldale", "Taber", "Calgary", "Medicine Hat"].map((c) => (
                    <span
                      key={c}
                      className="bg-white/10 text-white/70 text-xs px-2.5 py-1 rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">
              Common Questions
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#0C2340] mt-3">
              Frequently Asked
              <br />
              Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="font-display font-semibold text-[#0C2340] text-sm sm:text-base pr-4">
                    {faq.q}
                  </span>
                  <svg
                    className={`flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    width="18"
                    height="18"
                    fill="none"
                    stroke="#F05A1A"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-[#F05A1A] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
            Let's Get You Moving.
          </h2>
          <p className="text-white/80 text-lg mb-10">
            Request your free quote today. Our team is ready to make your move
            effortless.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleNav("quote")}
              className="bg-white text-[#F05A1A] hover:bg-slate-50 font-bold px-8 py-4 rounded text-sm tracking-wide transition-colors"
            >
              GET A FREE QUOTE
            </button>
            <a
              href="tel:+14039297209"
              className="border-2 border-white/50 hover:border-white text-white font-bold px-8 py-4 rounded text-sm tracking-wide transition-colors text-center"
            >
              CALL NOW
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
