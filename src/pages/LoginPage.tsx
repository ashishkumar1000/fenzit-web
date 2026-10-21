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
