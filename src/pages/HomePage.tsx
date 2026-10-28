import { Audience } from "../features/landing/components/Audience";
import { CallBack } from "../features/landing/components/CallBack";
import { Clients } from "../features/landing/components/Clients";
import { EarlyAccess } from "../features/landing/components/EarlyAccess";
import { Faq } from "../features/landing/components/Faq";
import { Features } from "../features/landing/components/Features";
import { Footer } from "../features/landing/components/Footer";
import { Header } from "../features/landing/components/Header";
import { Hero } from "../features/landing/components/Hero";
import { HowItWorks } from "../features/landing/components/HowItWorks";
import { Trust } from "../features/landing/components/Trust";
import styles from "./HomePage.module.css";

export function HomePage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <Hero />
        <Clients />
        <Audience />
        <Features />
        <HowItWorks />
        <Trust />
        <Faq />
        <CallBack />
        <EarlyAccess />
      </main>
      <Footer />
    </div>
  );
}
