export default function PageHeading({ title, eyebrow, children }) {
  return (
    <header className="space-y-2">
      {eyebrow ? (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fw-red-600">
          {eyebrow}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-fw-strong sm:text-3xl">
          {title}
        </h1>
        {children}
      </div>
    </header>
  );
}
