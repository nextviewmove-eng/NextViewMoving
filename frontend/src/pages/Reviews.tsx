type Page = "home" | "services" | "about" | "quote" | "reviews" | "contact";

interface ReviewsProps {
  setPage: (page: Page) => void;
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < count ? "#F05A1A" : "#E2E8F0"} stroke="none">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  );
}

const reviews = [
  { name: "Sarah M.", location: "Lethbridge, AB", rating: 5, date: "July 2026", service: "Residential Moving", text: "NextViewMove made our home move completely stress-free. The crew was professional, fast, and took amazing care of all our furniture. They wrapped everything carefully, handled a very tight staircase without any issues, and even helped us set up furniture in the new place. Would absolutely recommend to anyone in Lethbridge." },
  { name: "James T.", location: "Coaldale, AB", rating: 5, date: "June 2026", service: "Local Moving", text: "Best movers I've hired in Alberta. Showed up on time, kept everything organized, and finished ahead of schedule. Pricing was fair and transparent — no surprise charges. I've used other companies before and NextViewMove blows them out of the water." },
  { name: "Lisa K.", location: "Lethbridge, AB", rating: 5, date: "May 2026", service: "Long-Distance Moving", text: "We moved from Lethbridge to Calgary and couldn't have asked for a smoother experience. The crew was professional, friendly, and communicated throughout the whole process. Everything arrived in perfect condition. Worth every penny." },
  { name: "David R.", location: "Taber, AB", rating: 5, date: "April 2026", service: "Packing & Moving", text: "I had a lot of fragile artwork and collectibles I was worried about. The team from NextViewMove was incredibly careful, wrapped everything properly, and nothing was damaged. I genuinely couldn't believe how well they handled the job." },
  { name: "Maria S.", location: "Lethbridge, AB", rating: 5, date: "March 2026", service: "Apartment Moving", text: "Moving from a 4th-floor apartment with no elevator is every mover's nightmare, but this crew handled it without complaining once. Fast, strong, professional. They even did a final walkthrough to make sure we hadn't left anything behind." },
  { name: "Tom B.", location: "Fort Macleod, AB", rating: 5, date: "February 2026", service: "Commercial Moving", text: "We moved our office over a weekend so we'd be ready for Monday. NextViewMove had us completely set up on time, handled all our equipment carefully, and the crew was polite and efficient the whole time. Highly recommend for any business move." },
];

export default function Reviews({ setPage }: ReviewsProps) {
  const handleNav = (page: Page) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div>
      {/* Header */}
      <section className="bg-[#0C2340] pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">What People Say</span>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mt-3 mb-4">Customer Reviews</h1>
          <p className="text-white/60 text-lg max-w-xl">Don't take our word for it — hear from the people we've helped move.</p>
          <div className="flex items-center gap-4 mt-8">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="24" height="24" viewBox="0 0 24 24" fill="#F05A1A" stroke="none">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
              ))}
            </div>
            <span className="text-white font-display font-bold text-2xl">{avg.toFixed(1)}</span>
            <span className="text-white/40 text-sm">/ {reviews.length} reviews</span>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reviews.map((r) => (
              <div key={r.name} className="border border-slate-100 rounded-2xl p-7 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <StarRating count={r.rating} />
                  <span className="text-slate-400 text-xs">{r.date}</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm flex-1 mb-6">"{r.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-[#0C2340] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {r.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-[#0C2340] text-sm">{r.name}</div>
                    <div className="text-slate-400 text-xs">{r.location} · {r.service}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F8FAFC] border-t border-slate-200 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold text-[#0C2340] mb-4">Ready to Become Our Next Happy Customer?</h2>
          <p className="text-slate-500 mb-8">Join hundreds of satisfied customers across Southern Alberta. Get your free quote today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleNav("quote")}
              className="bg-[#F05A1A] hover:bg-[#D44D12] text-white font-bold px-8 py-4 rounded text-sm tracking-wide transition-colors"
            >
              GET A FREE QUOTE
            </button>
            <a
              href="tel:+14031234567"
              className="border-2 border-[#0C2340] text-[#0C2340] hover:bg-[#0C2340] hover:text-white font-bold px-8 py-4 rounded text-sm tracking-wide transition-colors text-center"
            >
              CALL (403) 929-7209
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
