import { Receipt, Truck, Wind, Wrench, type LucideIcon } from "lucide-react";
import styles from "./UseCaseChips.module.css";

interface UseCase {
  label: string;
  Icon: LucideIcon;
}

const USE_CASES: UseCase[] = [
  { label: "AC technicians", Icon: Wind },
  { label: "Plumbers", Icon: Wrench },
  { label: "Delivery teams", Icon: Truck },
  { label: "Collection agents", Icon: Receipt },
];

export function UseCaseChips() {
  return (
    <div className={styles.chips}>
      {USE_CASES.map(({ label, Icon }) => (
        <span className={styles.chip} key={label}>
          <Icon className={styles.icon} aria-hidden="true" focusable="false" />
          {label}
        </span>
      ))}
    </div>
  );
}
