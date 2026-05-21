/**
 * BrandMark — the CVeaver logotype.
 *
 * Renders the beaver mascot PNG from /public/logo.png. The PNG is line-art
 * (black on transparent); in dark mode we invert it via the `.brand-mark`
 * CSS rule so it stays legible on the deep-coffee surface.
 *
 * Pass `withWordmark` to show the "CVeaver" text next to the mark. Inside the
 * Builder/Paid nav we keep just the mark to save space.
 */

interface Props {
  /** Display the "CVeaver" wordmark alongside the icon. Default: false. */
  withWordmark?: boolean;
  /** Pixel size of the square icon. Default: 28. */
  size?: number;
  /** Optional extra classes for the outer wrapper. */
  className?: string;
}

export function BrandMark({ withWordmark = false, size = 28, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <img
        src="/logo.png"
        alt="CVeaver"
        width={size}
        height={size}
        className="brand-mark select-none"
        style={{ height: size, width: size }}
        draggable={false}
      />
      {withWordmark && (
        <span className="font-semibold tracking-tight text-[color:var(--color-ink)]">CVeaver</span>
      )}
    </span>
  );
}
