export default function BrandLogo({
  variant = "plain",
  className = "h-8 w-8 object-contain",
  tileClassName = "",
  alt = "FinWise AI",
}) {
  const img = (
    <img
      src="/logo.png"
      alt={alt}
      decoding="async"
      loading="lazy"
      className={className}
    />
  );

  if (variant === "tile") {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-fw-panel/95 p-2 shadow-sm dark:ring-1 dark:ring-white/10 ${tileClassName}`.trim()}
      >
        {img}
      </span>
    );
  }

  return img;
}
