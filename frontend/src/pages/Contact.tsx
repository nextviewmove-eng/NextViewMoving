import { useState } from "react";

type Page = "home" | "services" | "about" | "quote" | "reviews" | "contact";

interface ContactProps {
  setPage: (page: Page) => void;
}

export default function Contact({ setPage }: ContactProps) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const handleNav = (page: Page) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* Header */}
      <section className="bg-[#0C2340] pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">Get in Touch</span>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mt-3 mb-4">Contact Us</h1>
          <p className="text-white/60 text-lg max-w-xl">Have a question or want to book a move? We'd love to hear from you.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Info */}
            <div>
              <h2 className="font-display text-3xl font-bold text-[#0C2340] mb-8">Let's Talk</h2>
              <div className="space-y-6 mb-10">
                {[
                  {
                    icon: (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
                      </svg>
                    ),
                    label: "Phone",
                    value: "(403) 929-7209",
                    href: "tel:+14039297209",
                  },
                  {
                    icon: (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    ),
                    label: "Email",
                    value: "nextviewmove@gmail.com",
                    href: "mailto:nextviewmove@gmail.com",
                  },
                  {
                    icon: (
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    ),
                    label: "Location",
                    value: "Lethbridge, Alberta",
                    href: null,
                  },
                ].map(({ icon, label, value, href }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0C2340] flex items-center justify-center text-[#F05A1A] flex-shrink-0">
                      {icon}
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">{label}</div>
                      {href ? (
                        <a href={href} className="text-[#0C2340] font-semibold hover:text-[#F05A1A] transition-colors">{value}</a>
                      ) : (
                        <div className="text-[#0C2340] font-semibold">{value}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hours */}
              <div className="bg-[#F8FAFC] rounded-2xl p-7 mb-8">
                <h3 className="font-display font-bold text-[#0C2340] text-lg mb-5">Business Hours</h3>
                <div className="space-y-3">
                  {[
                    { day: "Monday – Friday", hours: "7:00 AM – 7:00 PM" },
                    { day: "Saturday", hours: "7:00 AM – 6:00 PM" },
                    { day: "Sunday", hours: "By Appointment" },
                  ].map(({ day, hours }) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="text-slate-500 text-sm">{day}</span>
                      <span className="text-[#0C2340] font-semibold text-sm">{hours}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#F05A1A]/5 border border-[#F05A1A]/20 rounded-xl p-5">
                <p className="text-[#0C2340] text-sm font-semibold mb-1">Need a quote instead?</p>
                <p className="text-slate-500 text-sm mb-4">Our quote form gives us everything we need to give you accurate pricing.</p>
                <button
                  onClick={() => handleNav("quote")}
                  className="bg-[#F05A1A] hover:bg-[#D44D12] text-white font-bold px-5 py-2.5 rounded text-sm tracking-wide transition-colors"
                >
                  GET A FREE QUOTE
                </button>
              </div>
            </div>

            {/* Form */}
            <div>
              {sent ? (
                <div className="bg-[#F8FAFC] rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#F05A1A]/10 flex items-center justify-center mx-auto mb-5">
                    <svg width="28" height="28" fill="none" stroke="#F05A1A" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h3 className="font-display font-bold text-[#0C2340] text-2xl mb-3">Message Sent!</h3>
                  <p className="text-slate-500 text-sm">We'll get back to you as soon as possible, typically within a few hours during business hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-[#F8FAFC] rounded-2xl p-8 space-y-5">
                  <h3 className="font-display font-bold text-[#0C2340] text-xl mb-2">Send Us a Message</h3>
                  {[
                    { label: "Full Name", key: "name" as const, type: "text", placeholder: "Jane Smith" },
                    { label: "Email", key: "email" as const, type: "email", placeholder: "jane@example.com" },
                    { label: "Phone (optional)", key: "phone" as const, type: "tel", placeholder: "(403) 555-0100" },
                    { label: "Subject", key: "subject" as const, type: "text", placeholder: "Moving inquiry" },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-[#0C2340] mb-1.5">{label}</label>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        required={key !== "phone"}
                        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#F05A1A] focus:ring-2 focus:ring-[#F05A1A]/10 transition-all"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-semibold text-[#0C2340] mb-1.5">Message</label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      required
                      rows={5}
                      placeholder="Tell us how we can help..."
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 bg-white focus:outline-none focus:border-[#F05A1A] focus:ring-2 focus:ring-[#F05A1A]/10 transition-all resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#F05A1A] hover:bg-[#D44D12] text-white font-bold py-4 rounded-lg text-sm tracking-wide transition-colors"
                  >
                    SEND MESSAGE
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
