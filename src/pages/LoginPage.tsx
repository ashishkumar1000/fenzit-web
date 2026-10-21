import { Container } from "../components/ui/Container";
import { LoginForm } from "../features/login/components/LoginForm";
import styles from "./LoginPage.module.css";

/** The website sign-in page. Client-only: it is not pre-rendered. */
export function LoginPage() {
  return (
    <div className={styles.page}>
      <title>Log in · Fenzit</title>
      <Container>
        <main className={styles.main}>
          <a className={styles.back} href="/">
            Back to the home page
          </a>
          <h1 className={styles.heading}>Log in to Fenzit</h1>
          <LoginForm />
        </main>
      </Container>
    </div>
  );
}
