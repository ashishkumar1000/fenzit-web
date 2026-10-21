import logo from "../assets/brand/logo.png";
import logo2x from "../assets/brand/logo-2x.png";
import logo3x from "../assets/brand/logo-3x.png";
import { LoginArt } from "../features/login/components/LoginArt";
import { LoginForm } from "../features/login/components/LoginForm";
import styles from "./LoginPage.module.css";

/** The website sign-in page. Client-only: it is not pre-rendered. */
export function LoginPage() {
  return (
    <div className={styles.page}>
      <title>Log in · Fenzit</title>
      <main className={styles.main}>
        <div className={styles.panel}>
          {/* Brand mark, shown on wide screens only. Decorative: the heading names the brand. */}
          <img
            className={styles.logo}
            src={logo}
            srcSet={`${logo} 1x, ${logo2x} 2x, ${logo3x} 3x`}
            width={56}
            loading="lazy"
            height={56}
            alt=""
          />
          <h1 className={styles.heading}>Log in to Fenzit</h1>
          <LoginForm />
        </div>
        <div className={styles.visual}>
          <LoginArt />
        </div>
      </main>
    </div>
  );
}
