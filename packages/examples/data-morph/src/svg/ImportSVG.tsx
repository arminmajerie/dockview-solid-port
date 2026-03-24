import { JSX } from "solid-js/jsx-runtime";
import {isEmpty} from "../util/isEmpty";

type IProps = JSX.SvgSVGAttributes<SVGSVGElement>

export const ImportSVG = (props: IProps) => {
  const width = (isEmpty(props.width) ? "45px" : props.width + 'px');
  const height = (isEmpty(props.height) ? "45px" : props.height + 'px');
  const color = (isEmpty(props.color) ? "#292D32" : props.color);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill="none"
      class="ImportSVG"
      viewBox="0 0 45 45"
      ref={props.ref}
    >
      <path
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M33.011 6C41.524 6.906 45 12.314 45 24.154v.38c0 13.067-1.875 12.853-1.875 12.853L22.5 45 3.75 38.47S0 37.6 0 24.535v-.38C0 12.402 3.429 6.994 11.8 6.029"
      />
      <path
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M22 30V0m14 19L22.263 30 9 19"
      />
      <path
        fill={color}
        d="M44 35H1l1.418 2.778L22.264 45l20.79-7.778z"
        opacity=".86"
      />
    </svg>
  );
};

export default ImportSVG;