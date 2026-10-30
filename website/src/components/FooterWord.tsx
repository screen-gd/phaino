import { DitherText } from "@/components/dithercn/dither-text";

/** The footer wordmark: near-white on top, dissolving into orange dots. */
export default function FooterWord() {
  return (
    <DitherText
      fill="gradient"
      direction="down"
      from={1}
      to={0.35}
      palette={["transparent", "#FF5B22", "#f2f2f2"]}
      className="footer-word"
    >
      phaino
    </DitherText>
  );
}
