import { useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Services from "./pages/Services";
import About from "./pages/About";
import Quote from "./pages/Quote";
import Reviews from "./pages/Reviews";
import Contact from "./pages/Contact";
import AdminApp from "./admin/AdminApp";
import { isAdminPath } from "./admin/adminRoutes";
import { useAdminPath } from "./admin/lib/adminRouter";

type Page = "home" | "services" | "about" | "quote" | "reviews" | "contact";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const pathname = useAdminPath();

  if (isAdminPath(pathname)) {
    return <AdminApp />;
  }

  const renderPage = () => {
    switch (page) {
      case "home": return <Home setPage={setPage} />;
      case "services": return <Services setPage={setPage} />;
      case "about": return <About setPage={setPage} />;
      case "quote": return <Quote setPage={setPage} />;
      case "reviews": return <Reviews setPage={setPage} />;
      case "contact": return <Contact setPage={setPage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar currentPage={page} setPage={setPage} />
      <main className="flex-1">
        {renderPage()}
      </main>
      <Footer setPage={setPage} />
    </div>
  );
}
