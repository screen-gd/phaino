import { DitherGradient } from "@/components/dithercn/dither-gradient";

/** The orange halftone wash rising behind the footer wordmark. */
export default function FooterDither() {
  return (
    <DitherGradient
      angle={0}
      from={0.6}
      to={0}
      noise={0.18}
      cell={4}
      palette={["transparent", "#FF5B22"]}
      aria-hidden="true"
      className="footer-dither opacity-75"
    />
  );
}
