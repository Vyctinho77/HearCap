import type { SVGProps } from 'react';

const SvgIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    fill="none"
    viewBox="0 0 22 22"
    {...props}
  >
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.675"
      d="m16.918 7.238-.958 2.428a4.2 4.2 0 0 0-.014 3.038l.972 2.534"
    ></path>
    <path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.675"
      d="M10.953.838H5.026A4.19 4.19 0 0 0 .838 5.026V16.65a4.19 4.19 0 0 0 4.188 4.188h5.927m0-20h5.927a4.19 4.19 0 0 1 4.188 4.188V16.65a4.19 4.19 0 0 1-4.188 4.188h-5.927m0-20v20"
    ></path>
  </svg>
);

export default SvgIcon;

