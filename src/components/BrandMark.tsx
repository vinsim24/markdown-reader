interface BrandMarkProps {
  className?: string;
}

export default function BrandMark({ className = '' }: BrandMarkProps) {
  return (
    <img
      className={`brand-mark${className ? ` ${className}` : ''}`}
      src="/favicon.svg"
      alt=""
      aria-hidden="true"
    />
  );
}
