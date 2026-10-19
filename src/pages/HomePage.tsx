import { Header } from "../components/landing/Header";
import { Hero } from "../components/landing/Hero";
import { Footer } from "../components/landing/Footer";

export function HomePage() {
  return (
    <div className="wrap">
      <Header />
      <Hero />
      <Footer />
    </div>
  );
}
