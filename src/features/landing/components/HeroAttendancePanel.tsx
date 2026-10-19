import { BarChart2, CalendarDays, MapPin } from "lucide-react";
import { GeofenceMapArt, MonthlyBarsArt } from "./FeatureArt";
import { HeroPanel } from "./HeroPanel";
import styles from "./HeroAttendancePanel.module.css";

/** Attendance and leave: the office geofence, a check-in, the monthly report and a leave request. */
export function HeroAttendancePanel() {
  return (
    <HeroPanel
      title="Attendance and leave"
      icon={<MapPin className={styles.glyph} aria-hidden="true" focusable="false" />}
    >
      <div className={styles.fence}>
        <div className={styles.fenceArt}>
          <GeofenceMapArt />
        </div>
        <p className={styles.fenceCaption}>Office location: HQ Connaught Place</p>
      </div>
      <ul className={styles.list}>
        <li className={styles.card}>
          <p className={styles.cardTitle}>HQ Connaught Place</p>
          <p className={styles.meta}>Checked in 8:45 AM</p>
          <p className={styles.gps}>GPS: 28.6315° N, 77.2167° E (Accurate 3m)</p>
        </li>
        <li className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <p className={styles.cardTitle}>Monthly attendance</p>
              <p className={styles.meta}>Report for each person</p>
            </div>
            <span className={styles.action}>
              <BarChart2 className={styles.actionIcon} aria-hidden="true" focusable="false" />
              Report
            </span>
          </div>
        </li>
        <li className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <p className={styles.cardTitle}>Leave request</p>
              <p className={styles.meta}>Ravi K.</p>
            </div>
            <span className={styles.action}>
              <CalendarDays className={styles.actionIcon} aria-hidden="true" focusable="false" />
              Leave
            </span>
          </div>
      <MonthlyBarsArt />
        </li>
      </ul>
    </HeroPanel>
  );
}
