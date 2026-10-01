import { useState } from "react";

type Page = "home" | "services" | "about" | "quote" | "reviews" | "contact";

interface NavbarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
}

const navLinks: { label: string; page: Page }[] = [
  { label: "Home", page: "home" },
  { label: "Services", page: "services" },
  { label: "About", page: "about" },
  { label: "Reviews", page: "reviews" },
  { label: "Contact", page: "contact" },
];

export default function Navbar({ currentPage, setPage }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (page: Page) => {
    setPage(page);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0C2340] shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => handleNav("home")}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 bg-[#F05A1A] rounded flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9h12M9 4l6 5-6 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white font-display font-bold text-xl tracking-tight">
              NextView<span className="text-[#F05A1A]">Move</span>
            </span>
          </div>
        </button>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => handleNav(page)}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                currentPage === page
                  ? "text-[#F05A1A]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="tel:+14039297209"
            className="text-white/70 hover:text-white text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
            </svg>
            (403) 929-7209
          </a>
          <button
            onClick={() => handleNav("quote")}
            className="bg-[#F05A1A] hover:bg-[#D44D12] text-white text-sm font-semibold px-5 py-2 rounded transition-colors"
          >
            GET A FREE QUOTE
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0C2340] border-t border-white/10 px-4 pb-4">
          {navLinks.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => handleNav(page)}
              className={`block w-full text-left px-3 py-3 text-sm font-medium border-b border-white/5 ${
                currentPage === page ? "text-[#F05A1A]" : "text-white/80"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <a
              href="tel:+14039297209"
              className="w-full border border-white/20 text-white text-sm font-semibold py-2.5 rounded text-center"
            >
              CALL (403) 929-7209
            </a>
            <button
              onClick={() => handleNav("quote")}
              className="w-full bg-[#F05A1A] text-white text-sm font-semibold py-2.5 rounded"
            >
              GET A FREE QUOTE
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
