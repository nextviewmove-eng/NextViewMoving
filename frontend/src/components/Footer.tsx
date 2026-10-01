type Page = "home" | "services" | "about" | "quote" | "reviews" | "contact";

interface FooterProps {
  setPage: (page: Page) => void;
}

export default function Footer({ setPage }: FooterProps) {
  const handleNav = (page: Page) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#0C2340] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#F05A1A] rounded flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9h12M9 4l6 5-6 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-white font-display font-bold text-xl">
                NextView<span className="text-[#F05A1A]">Move</span>
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              Lethbridge's trusted moving company. Professionally moving homes, apartments, and offices across Southern Alberta.
            </p>
            <div className="flex items-center gap-3">
              {["facebook", "instagram"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-8 h-8 rounded bg-white/10 hover:bg-[#F05A1A] flex items-center justify-center transition-colors"
                  aria-label={social}
                >
                  {social === "facebook" ? (
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                      <circle cx="12" cy="12" r="4"/>
                      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">Services</h4>
            <ul className="space-y-2.5">
              {["Residential Moving", "Commercial Moving", "Local Moving", "Long-Distance Moving", "Packing & Unpacking", "Furniture Moving", "Heavy Item Moving"].map((s) => (
                <li key={s}>
                  <button
                    onClick={() => handleNav("services")}
                    className="text-white/70 hover:text-[#F05A1A] text-sm transition-colors text-left"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links + Areas */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">Quick Links</h4>
            <ul className="space-y-2.5 mb-8">
              {[
                { label: "Home", page: "home" as Page },
                { label: "About Us", page: "about" as Page },
                { label: "Reviews", page: "reviews" as Page },
                { label: "Get a Quote", page: "quote" as Page },
                { label: "Contact", page: "contact" as Page },
              ].map(({ label, page }) => (
                <li key={page}>
                  <button
                    onClick={() => handleNav(page)}
                    className="text-white/70 hover:text-[#F05A1A] text-sm transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">Service Areas</h4>
            <ul className="space-y-1.5">
              {["Lethbridge", "Coaldale", "Taber", "Fort Macleod", "Picture Butte", "Coalhurst", "Calgary", "Medicine Hat"].map((city) => (
                <li key={city} className="text-white/60 text-sm">{city}</li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-white/40 mb-4">Contact</h4>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <svg className="mt-0.5 flex-shrink-0 text-[#F05A1A]" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
                </svg>
                <div>
                  <div className="text-white/40 text-xs mb-0.5">Phone</div>
                  <a href="tel:+14039297209" className="text-white hover:text-[#F05A1A] text-sm transition-colors">(403) 929-7209</a>
                </div>
              </li>
              <li className="flex gap-3">
                <svg className="mt-0.5 flex-shrink-0 text-[#F05A1A]" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <div>
                  <div className="text-white/40 text-xs mb-0.5">Email</div>
                  <a href="mailto:nextviewmove@gmail.com" className="text-white hover:text-[#F05A1A] text-sm transition-colors">nextviewmove@gmail.com</a>
                </div>
              </li>
              <li className="flex gap-3">
                <svg className="mt-0.5 flex-shrink-0 text-[#F05A1A]" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <div>
                  <div className="text-white/40 text-xs mb-0.5">Hours</div>
                  <div className="text-white/70 text-sm">Mon–Sat: 7am – 7pm</div>
                  <div className="text-white/70 text-sm">Sunday: By appointment</div>
                </div>
              </li>
              <li className="flex gap-3">
                <svg className="mt-0.5 flex-shrink-0 text-[#F05A1A]" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <div>
                  <div className="text-white/40 text-xs mb-0.5">Based In</div>
                  <div className="text-white/70 text-sm">Lethbridge, Alberta</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} NextViewMove. All rights reserved. Lethbridge, Alberta.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-white/40 hover:text-white/70 text-xs transition-colors">Privacy Policy</a>
            <a href="#" className="text-white/40 hover:text-white/70 text-xs transition-colors">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
