type Page = "home" | "services" | "about" | "quote" | "reviews" | "contact";

interface ServicesProps {
  setPage: (page: Page) => void;
}

const services = [
  {
    icon: "🏠",
    title: "Residential Moving",
    desc: "Moving your family home is a big deal. Our residential moving team handles your belongings with the same care and respect we'd give our own. From studio apartments to large family homes, we manage every detail so you can focus on the excitement of your new chapter.",
    features: ["Full home packing available", "Furniture protection included", "Flexible scheduling", "Same-day moves available"],
  },
  {
    icon: "🏢",
    title: "Commercial Moving",
    desc: "Business moves require precision. We work efficiently to get your office or commercial space moved with minimal disruption to your operations. We handle computers, filing systems, furniture, and specialty equipment — all carefully packed, labeled, and transported.",
    features: ["Weekend & after-hours moves", "IT equipment handling", "Furniture installation", "Secure document transport"],
  },
  {
    icon: "📍",
    title: "Local Moving",
    desc: "Moving within Lethbridge or nearby? Our local moving service is fast, affordable, and reliable. We know the area, the streets, and the buildings — which means your move goes smoothly from pickup to delivery.",
    features: ["Lethbridge & surrounding area", "Hourly or flat-rate options", "Fast turnaround", "No minimum move size"],
  },
  {
    icon: "🛣️",
    title: "Long-Distance Moving",
    desc: "Heading to Calgary, Medicine Hat, or beyond? Our long-distance moving service takes the stress out of inter-city moves. We ensure your belongings are fully protected for the journey and arrive in perfect condition.",
    features: ["Across Southern Alberta", "GPS-tracked trucks", "Full value protection", "Delivery scheduling"],
  },
  {
    icon: "📦",
    title: "Packing & Unpacking",
    desc: "Packing is often the most time-consuming part of any move. Let our experienced team handle it. We use professional-grade packing materials and proven techniques to keep your fragile items safe and your boxes organized.",
    features: ["Professional materials supplied", "Room-by-room labeling", "Fragile item specialists", "Unpacking service available"],
  },
  {
    icon: "🚛",
    title: "Loading & Unloading",
    desc: "Already have a rental truck? We can do the heavy lifting. Our team will efficiently and safely load or unload your truck, protecting both your belongings and your back.",
    features: ["Works with any truck rental", "Fully insured crew", "Fast & efficient", "Furniture placement included"],
  },
  {
    icon: "🛋️",
    title: "Furniture Moving",
    desc: "Need to rearrange a room, move a single piece, or transport furniture you just purchased? We handle all furniture moves with proper protection, disassembly, and reassembly as needed.",
    features: ["Disassembly & reassembly", "Blanket wrapping", "Tight-space maneuvering", "In-home rearranging"],
  },
  {
    icon: "🏋️",
    title: "Heavy Item Moving",
    desc: "Some things need extra muscle and expertise. Pianos, gun safes, gym equipment, commercial refrigerators — our team has the tools and training to move heavy and oversized items safely.",
    features: ["Piano specialists", "Safe & vault moving", "Gym equipment", "Industrial equipment"],
  },
];

export default function Services({ setPage }: ServicesProps) {
  const handleNav = (page: Page) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* Header */}
      <section className="bg-[#0C2340] pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">What We Do</span>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mt-3 mb-4">Our Moving Services</h1>
          <p className="text-white/60 text-lg max-w-xl">
            From studio apartments to full offices, we offer a complete range of moving services tailored to your needs.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {services.map((s) => (
              <div key={s.title} className="border border-slate-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-5">
                  <div className="text-4xl flex-shrink-0">{s.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-[#0C2340] text-xl mb-3">{s.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-5">{s.desc}</p>
                    <ul className="grid grid-cols-2 gap-2">
                      {s.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                          <svg width="14" height="14" fill="none" stroke="#F05A1A" strokeWidth="2.5" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F05A1A] py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-4">Not Sure What You Need?</h2>
          <p className="text-white/80 text-lg mb-8">Give us a call or fill out our quote form and we'll help you figure out the right services for your move.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleNav("quote")}
              className="bg-white text-[#F05A1A] hover:bg-slate-50 font-bold px-8 py-4 rounded text-sm tracking-wide transition-colors"
            >
              GET A FREE QUOTE
            </button>
            <a
              href="tel:+14031234567"
              className="border-2 border-white/50 hover:border-white text-white font-bold px-8 py-4 rounded text-sm tracking-wide transition-colors text-center"
            >
              CALL (403) 929-7209
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
