type Page = "home" | "services" | "about" | "quote" | "reviews" | "contact";

interface AboutProps {
  setPage: (page: Page) => void;
}

const values = [
  { icon: "🤝", title: "Integrity First", desc: "We quote honestly and charge fairly. No hidden fees, no surprises — just straightforward service you can count on." },
  { icon: "💪", title: "Hard Work", desc: "We take pride in working efficiently and carefully. Your move gets our full effort, every time." },
  { icon: "🏘️", title: "Community Roots", desc: "We live in Lethbridge and care about this community. When you support us, you support a local family business." },
  { icon: "🛡️", title: "Accountability", desc: "If anything ever goes wrong, we take responsibility. Fully licensed and insured for your peace of mind." },
];

export default function About({ setPage }: AboutProps) {
  const handleNav = (page: Page) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* Header */}
      <section className="bg-[#0C2340] pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">Our Story</span>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mt-3 mb-4">About NextViewMove</h1>
          <p className="text-white/60 text-lg max-w-xl">
            Lethbridge-based and locally owned — we built NextViewMove to give Southern Alberta a moving company it could actually trust.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">Who We Are</span>
              <h2 className="font-display text-4xl font-bold text-[#0C2340] mt-3 mb-6">Lethbridge's Trusted<br />Moving Team</h2>
              <div className="space-y-4 text-slate-500 leading-relaxed">
                <p>
                  NextViewMove was founded with one goal: to be the moving company that Lethbridge residents actually want to call. We've all heard horror stories about movers who show up late, handle things carelessly, or add surprise charges to the final bill. We built NextViewMove to be the opposite of that.
                </p>
                <p>
                  Our team is made up of experienced, trained movers who genuinely care about your belongings and your experience. We're a tight-knit crew — professional, friendly, and committed to doing great work on every single move.
                </p>
                <p>
                  Based right here in Lethbridge, we understand Southern Alberta. We know the roads, the buildings, the neighbourhoods. When you book with NextViewMove, you're working with people who are part of your community.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=700&h=500&fit=crop&auto=format"
                alt="NextViewMove team with moving truck"
                className="rounded-2xl w-full object-cover h-80 sm:h-96 bg-slate-200"
              />
              <div className="absolute -bottom-6 -left-6 bg-[#F05A1A] rounded-xl p-5 shadow-xl">
                <div className="font-display font-bold text-white text-3xl">100%</div>
                <div className="text-white/80 text-sm">Locally Owned</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">What We Stand For</span>
            <h2 className="font-display text-4xl font-bold text-[#0C2340] mt-3">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm text-center">
                <div className="text-4xl mb-4">{v.icon}</div>
                <h3 className="font-display font-bold text-[#0C2340] text-lg mb-3">{v.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#0C2340] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { num: "500+", label: "Moves Completed" },
              { num: "5★", label: "Average Rating" },
              { num: "8+", label: "Cities Served" },
              { num: "100%", label: "Licensed & Insured" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-display font-bold text-[#F05A1A] text-4xl sm:text-5xl mb-2">{stat.num}</div>
                <div className="text-white/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team photo */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <img
                src="https://images.unsplash.com/photo-1714647211902-bb711d643a17?w=700&h=480&fit=crop&auto=format"
                alt="Professional moving team at work"
                className="rounded-2xl w-full object-cover h-80 bg-slate-200"
              />
            </div>
            <div>
              <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">Certified & Insured</span>
              <h2 className="font-display text-4xl font-bold text-[#0C2340] mt-3 mb-6">You're in Safe Hands</h2>
              <p className="text-slate-500 leading-relaxed mb-8">
                Every member of our team is trained, background-checked, and covered under our liability insurance. Your belongings are protected from pickup to delivery, giving you one less thing to worry about during your move.
              </p>
              <ul className="space-y-3 mb-8">
                {["Fully licensed moving company", "Comprehensive liability insurance", "Trained & background-checked crew", "Modern, well-maintained trucks"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-600 text-sm">
                    <svg width="16" height="16" fill="none" stroke="#F05A1A" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleNav("quote")}
                className="bg-[#F05A1A] hover:bg-[#D44D12] text-white font-bold px-7 py-3.5 rounded text-sm tracking-wide transition-colors"
              >
                GET A FREE QUOTE
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
