const USE_CASES = [
  {
    label: "AC technicians",
    path: [
      "M12.8 19.6A2 2 0 1 0 14 16H2",
      "M17.5 8a2.5 2.5 0 1 1 2 4H2",
      "M9.8 4.4A2 2 0 1 1 11 8H2",
    ],
  },
  {
    label: "Plumbers",
    path: [
      "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",
    ],
  },
  {
    label: "Delivery teams",
    path: [
      "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",
      "M15 18H9",
      "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",
    ],
    circles: [
      { cx: 17, cy: 18, r: 2 },
      { cx: 7, cy: 18, r: 2 },
    ],
  },
  {
    label: "Collection agents",
    path: [
      "M13 16H8",
      "M14 8H8",
      "M16 12H8",
      "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z",
    ],
  },
];

export function UseCaseChips() {
  return (
    <div className="chips">
      {USE_CASES.map(({ label, path, circles }) => (
        <span className="chip" key={label}>
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {path.map((d) => (
              <path key={d} d={d} />
            ))}
            {circles?.map((c) => (
              <circle key={`${c.cx}-${c.cy}`} cx={c.cx} cy={c.cy} r={c.r} />
            ))}
          </svg>
          {label}
        </span>
      ))}
    </div>
  );
}
