const JOBS = [
  { initials: "RK", avatarClass: "a1", name: "AC service · Sector 12", meta: "Ravi K. · ETA 14 min", statusClass: "s-route", statusLabel: "On the way" },
  { initials: "SM", avatarClass: "a2", name: "Pipe repair · Green Park", meta: "Sana M. · started 10:42", statusClass: "s-prog", statusLabel: "In progress" },
  { initials: "AT", avatarClass: "a3", name: "Delivery · 4 parcels", meta: "Arjun T. · 09:30", statusClass: "s-done", statusLabel: "Completed" },
];

export function MockJobsCard() {
  return (
    <section className="visual">
      <div className="float float-1">
        <span className="dot d-blue">
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <span>Technician en&nbsp;route</span>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Today's jobs</span>
          <span className="card-live">
            <span className="pulse" /> Live
          </span>
        </div>

        {JOBS.map((job) => (
          <div className="task" key={job.initials}>
            <span className={`avatar ${job.avatarClass}`}>{job.initials}</span>
            <div className="task-info">
              <div className="task-name">{job.name}</div>
              <div className="task-meta">{job.meta}</div>
            </div>
            <span className={`status ${job.statusClass}`}>{job.statusLabel}</span>
          </div>
        ))}
      </div>

      <div className="float float-2">
        <span className="dot d-green">
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M21.801 10A10 10 0 1 1 17 3.335" />
            <path d="m9 11 3 3L22 4" />
          </svg>
        </span>
        <span>Job marked done</span>
      </div>
    </section>
  );
}
