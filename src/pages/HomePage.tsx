import { Header } from "../features/landing/components/Header";
import { Hero } from "../features/landing/components/Hero";
import { Footer } from "../features/landing/components/Footer";
import styles from "./HomePage.module.css";

export function HomePage() {
  return (
    <div className={styles.wrap}>
      <Header />
      <Hero />
      <Footer />
    </div>
  );
}
