import Image from "next/image";
export function CourtPhoto({
  surface = "quick",
  alt,
  priority = false,
}: {
  surface?: "clay" | "quick";
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className={`court-photo court-photo-${surface}`}>
      <Image
        src={
          surface === "clay"
            ? "/images/pista-terra-original.png"
            : "/images/pista-quick-original.png"
        }
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 800px) 100vw, 50vw"
      />
      <span className="court-photo-shade" aria-hidden="true" />
    </div>
  );
}
