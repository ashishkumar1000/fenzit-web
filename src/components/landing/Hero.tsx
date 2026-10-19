import { NotifyForm } from "./NotifyForm";
import { UseCaseChips } from "./UseCaseChips";
import { MockJobsCard } from "./MockJobsCard";

export function Hero() {
  return (
    <main className="hero">
      <section>
        <span className="eyebrow">
          <span className="pulse" /> Coming soon
        </span>
        <h1>
          Run your field team <span className="accent">in real time.</span>
        </h1>
        <p className="sub">
          Assign jobs, dispatch your team, and watch every task move from <em>assigned</em> to <em>done</em> — live,
          from one dashboard.
        </p>

        <UseCaseChips />
        <NotifyForm />
      </section>

      <MockJobsCard />
    </main>
  );
}
