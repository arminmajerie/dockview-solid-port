import { JSX } from "solid-js/jsx-runtime";
import { isEmpty } from "../util/isEmpty";

type IProps = JSX.SvgSVGAttributes<SVGSVGElement>;

export const InfoSVG = (props: IProps) => {
  const width = isEmpty(props.width) ? "16px" : props.width + "px";
  const height = isEmpty(props.height) ? "16px" : props.height + "px";
  const color = (isEmpty(props.color) ? "currentColor" : props.color);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill="none"
      class="InfoSVG"
      viewBox="0 0 24 24"
      ref={props.ref}
    >
      <title>Info</title>
      <circle cx="12" cy="12" r="10"
              stroke={color}
              stroke-width="1.5" />
      <path
        stroke={color}
        stroke-linecap="round"
        stroke-width="1.5"
        d="M12 7v.01M12 11v6"
      />
    </svg>
  );
};

export default InfoSVG;
