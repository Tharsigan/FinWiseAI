export default function PlaceholderCard({ title, detail }) {
  return (
    <section className="rounded-2xl border border-fw-rose-soft/80 bg-fw-panel/90 p-6 shadow-lg shadow-fw-red-500/5 backdrop-blur dark:shadow-black/20">
      <h2 className="text-lg font-semibold text-fw-strong">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-fw-muted">
        {detail}
      </p>
    </section>
  );
}
