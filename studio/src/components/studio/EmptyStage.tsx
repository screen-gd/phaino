import type { CSSProperties } from "react";

const REST_X = [-8, -4, 0, 4, 8];
const REST_R = [-6, -3, 0, 3, 6];
const FAN_R = [-12, -6, 0, 6, 12];
const ARC_Y = [6, 2, 0, 2, 6];

type StackStyle = CSSProperties & {
  "--rest": string;
  "--fan": string;
};

/**
 * Empty shot area: a pile of preset thumbnails that fans out on
 * hover, plus one line of guidance.
 */
export function EmptyStage({
  thumbs,
  shape,
  text,
}: {
  thumbs: string[];
  shape: "square" | "wide";
  text: string;
}) {
  const size =
    shape === "square" ? "h-40 w-40" : "h-[117px] w-[208px]";
  // --spread is set on the wrapper so it can shrink below sm (60%).
  const spread =
    shape === "square"
      ? "[--spread:90px] sm:[--spread:150px]"
      : "[--spread:108px] sm:[--spread:180px]";
  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className={`group/stack relative flex ${spread} ${
          shape === "square" ? "h-48" : "h-44"
        } w-full items-center justify-center`}
      >
        {thumbs.slice(0, 5).map((src, i) => {
          const style: StackStyle = {
            "--rest": `translateX(${REST_X[i]}px) rotate(${REST_R[i]}deg)`,
            "--fan": `translateX(calc(${i - 2} * var(--spread))) translateY(${ARC_Y[i]}px) rotate(${FAN_R[i]}deg)`,
          };
          return (
            <img
              key={src}
              src={src}
              alt=""
              className={`absolute ${size} rounded-xl border border-line object-cover transition-transform duration-300 ease-out [transform:var(--rest)] motion-reduce:transition-none group-hover/stack:[transform:var(--fan)]`}
              style={style}
            />
          );
        })}
      </div>
      <p className="text-lead text-t1">{text}</p>
    </div>
  );
}
