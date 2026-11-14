import { useState } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router";
import type { ReactNode } from "react";
import type { adminJobDetailLoader } from "../features/admin/adminJobDetailLoader";
import type { JobDetail } from "../features/admin/jobDetailApi";
import { humanize } from "../features/admin/status";
import { SectionCard } from "../features/admin/components/SectionCard";
import { StatusBadge } from "../features/admin/components/Badge";
import { fmtPhone, fmtWhen } from "../features/admin/format";
import styles from "./AdminJobDetailPage.module.css";

const JOBS_PATH = "/admin/company/jobs";

/** One attachment's image, with the expiry story handled: a presigned URL
 *  lives about an hour, so a detail tab left open can point at a dead link.
 *  A broken image becomes the same "Unavailable" tile a missing one gets. */
function AttachmentPhoto({ url, alt }: { url: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <span className={styles.noImage}>Unavailable</span>;
  }
  return <img src={url} alt={alt} onError={() => setBroken(true)} />;
}

/** Wire event names as a person reads them: step_arrived → "Arrived",
 *  job_submitted → "Submitted". Anything unknown still shows, humanised. */
function eventLabel(eventType: string): string {
  const rest = eventType.startsWith("step_")
    ? eventType.slice(5)
    : eventType.startsWith("job_")
      ? eventType.slice(4)
      : eventType;
  return rest === "" ? humanize(eventType) : humanize(rest);
}

function facts(job: JobDetail): Array<[string, ReactNode]> {
  const rows: Array<[string, ReactNode]> = [
    [
      "Customer",
      job.customer === null
        ? "—"
        : `${job.customer.name}${
            job.customer.phoneNumber !== null && job.customer.countryCode !== null
              ? ` · ${fmtPhone(job.customer.countryCode, job.customer.phoneNumber)}`
              : ""
          }`,
    ],
    [
      "Employee",
      job.technician === null
        ? "—"
        : `${job.technician.name ?? "(no name)"}${
            job.technician.phoneNumber !== null && job.technician.countryCode !== null
              ? ` · ${fmtPhone(job.technician.countryCode, job.technician.phoneNumber)}`
              : ""
          }`,
    ],
    ["Skill", job.skill?.name ?? "—"],
    ["Location", job.serviceLocation === "" ? "—" : job.serviceLocation],
  ];
  if (job.description !== null && job.description !== "") {
    rows.push(["Description", job.description]);
  }
  if (job.notesForTechnician !== null && job.notesForTechnician !== "") {
    rows.push(["Notes for the employee", job.notesForTechnician]);
  }
  if (job.status === "rejected") {
    rows.push([
      "Rejected",
      `${job.rejectionReason ?? "No reason given"}${
        job.decidedAt !== null ? ` — decided ${fmtWhen(job.decidedAt)}` : ""
      }`,
    ]);
  }
  if (job.completedAt !== null) {
    rows.push(["Completed", fmtWhen(job.completedAt)]);
  }
  return rows;
}

/** One job's full detail — the common page's drill-down. The owner opens any
 *  job in the company; an employee opens one of their own (the backend
 *  answers anything else with 404). Facts, the workflow's steps, the
 *  activity timeline and the photos/signatures, all from one endpoint. */
export function AdminJobDetailPage() {
  const data = useLoaderData<typeof adminJobDetailLoader>();
  const revalidator = useRevalidator();
  const busy = revalidator.state !== "idle";

  if (data.state === "failed") {
    return (
      <SectionCard title="Job">
        <p className={styles.failed} role="alert">
          {data.reason === "not-found"
            ? data.role === "member"
              ? "This job is not available to you. You can open only the jobs assigned to you."
              : "This job is not available. It may be mistyped, or outside your company."
            : "The job could not load."}
        </p>
        {data.reason !== "not-found" ? (
          <button
            type="button"
            className={styles.retry}
            onClick={() => revalidator.revalidate()}
            disabled={busy}
          >
            {busy ? "Retrying…" : "Try again"}
          </button>
        ) : null}
        <p className={styles.back}>
          <Link to={JOBS_PATH}>Back to all jobs</Link>
        </p>
      </SectionCard>
    );
  }

  const job = data.job;
  const steps = job.workflowTemplate?.steps ?? [];
  const currentIndex = job.currentStepIndex;
  const finished = job.completedAt !== null || job.status === "completed";

  return (
    <div className={styles.stack}>
      <p className={styles.crumb}>
        <Link to={JOBS_PATH}>All jobs</Link>
        <span aria-hidden="true"> / </span>
        <span>{job.jobNumber}</span>
      </p>

      <SectionCard
        title={job.jobNumber}
        meta={
          <>
            <StatusBadge status={job.status} />
            {job.priority === "urgent" ? <span className={styles.urgent}>Urgent</span> : null}
          </>
        }
      >
        <dl className={styles.facts}>
          {facts(job).map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt className={styles.factLabel}>{label}</dt>
              <dd className={styles.factValue}>{value}</dd>
            </div>
          ))}
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Scheduled</dt>
            <dd className={styles.factValue}>
              {fmtWhen(job.scheduledStart)}
              {job.scheduledEnd !== null ? ` – ${fmtWhen(job.scheduledEnd)}` : ""}
            </dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Workflow">
        {steps.length === 0 ? (
          <p className={styles.line}>This job has no workflow steps.</p>
        ) : (
          <ol className={styles.steps}>
            {steps.map((step, index) => {
              // A finished job is finished: every step reads done, even when
              // the backend has let the current-step pointer go (null).
              const state = finished
                ? "done"
                : currentIndex === null
                  ? "upcoming"
                  : index < currentIndex
                    ? "done"
                    : index === currentIndex
                      ? "current"
                      : "upcoming";
              return (
                <li key={step.key} className={styles.step} data-state={state}>
                  <span className={styles.stepMark} aria-hidden="true" />
                  <span className={styles.stepLabel}>
                    {step.label === "" ? humanize(step.key) : step.label}
                  </span>
                  <span className={styles.stepReq}>
                    {step.requiresPhoto ? "Photo" : null}
                    {step.requiresPhoto && step.requiresSignature ? " · " : null}
                    {step.requiresSignature ? "Signature" : null}
                    {state === "done" ? " · done" : state === "current" ? " · current step" : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>

      <SectionCard title="Activity">
        {job.activityLog.length === 0 ? (
          <p className={styles.line}>Nothing has happened on this job yet.</p>
        ) : (
          <ol className={styles.timeline}>
            {job.activityLog.map((entry, index) => (
              <li key={`${entry.id}-${index}`} className={styles.event}>
                <span className={styles.eventLabel}>{eventLabel(entry.eventType)}</span>
                <span className={styles.eventMeta}>
                  {entry.actorName !== null ? `${entry.actorName} · ` : ""}
                  {fmtWhen(entry.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <SectionCard
        title="Photos and signatures"
        meta={job.attachments.length > 0 ? `${job.attachments.length}` : undefined}
      >
        {job.attachments.length === 0 ? (
          <p className={styles.line}>
            Nothing uploaded yet. The employee adds photos from the job in their app.
          </p>
        ) : (
          <ul className={styles.gallery}>
            {job.attachments.map((one, index) => (
              <li key={`${one.id}-${index}`} className={styles.shot}>
                {one.url !== null ? (
                  <AttachmentPhoto
                    url={one.url}
                    alt={`${job.jobNumber} ${one.type} from ${fmtWhen(one.createdAt)}`}
                  />
                ) : (
                  <span className={styles.noImage}>Unavailable</span>
                )}
                <span className={styles.shotMeta}>
                  {one.type === "signature" ? "Signature" : "Photo"} · {fmtWhen(one.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
