import { JSX } from "solid-js/jsx-runtime";
import { isEmpty } from "../util/isEmpty";

type IProps = JSX.SvgSVGAttributes<SVGSVGElement>;

export const DownloadSVG = (props: IProps) => {
  const width = isEmpty(props.width) ? "24px" : props.width + "px";
  const height = isEmpty(props.height) ? "24px" : props.height + "px";
  const color = (isEmpty(props.color) ? "#292D32" : props.color);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill="none"
      class="DownloadSVG"
      viewBox="0 0 24 24"
      ref={props.ref}
    >
      <title>Download SDK</title>
      <path
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M12 3v12m0 0l-4-4m4 4l4-4"
      />
      <path
        stroke={color}
        stroke-linecap="round"
        stroke-width="1.5"
        d="M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2"
      />
    </svg>
  );
};

export default DownloadSVG;
