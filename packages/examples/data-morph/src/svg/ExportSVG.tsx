import { JSX } from "solid-js/jsx-runtime";
import ImportSVG from "./ImportSVG";
import {isEmpty} from "../util/isEmpty";

type IProps = JSX.SvgSVGAttributes<SVGSVGElement>

export const ExportSVG = (props: IProps) => {
  const width = (isEmpty(props.width) ? "45px" : props.width + 'px');
  const height = (isEmpty(props.height) ? "45px" : props.height + 'px');
  const color = (isEmpty(props.color) ? "#292D32" : props.color);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill="none"
      class="ExportSVG"
      viewBox="0 0 45 45"
      ref={props.ref}
    >
      <title>ExportSVG</title>
      <path
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M38.311 16.389c8.513.72 11.989 5.019 11.989 14.43v.302c0 10.386-1.875 10.217-1.875 10.217L27.8 47.388l-18.75-5.19s-3.75-.69-3.75-11.077v-.302c0-9.341 3.429-13.64 11.8-14.407"
      />
      <path
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M28.3 35.389v-32m13 7-13.228-8-12.772 8"
      />
      <path
        fill={color}
        d="M49.3 39.389h-42l1.385 2.222 19.384 5.778 20.308-6.223z"
        opacity=".86"
      />
    </svg>
  );
};

export default ExportSVG;