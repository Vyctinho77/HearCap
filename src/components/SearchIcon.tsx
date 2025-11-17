import React from 'react';

const SearchIcon: React.FC<{ size?: number }> = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 27} fill="none" viewBox="0 0 24 27" style={{ display: 'block' }}>
    <path
      fill="#D9D9D9"
      fillRule="evenodd"
      d="M10.077 19.986C4.51 19.986 0 15.512 0 9.993S4.511 0 10.077 0s10.076 4.474 10.076 9.993A9.92 9.92 0 0 1 17.261 17l6.239 7.5-2.335 2.316-6.611-7.868a10.1 10.1 0 0 1-4.478 1.038m0-2.986C6.173 17 3.01 13.863 3.01 9.993s3.163-7.007 7.065-7.007 7.066 3.137 7.066 7.007S13.98 17 10.077 17"
      clipRule="evenodd"
    />
  </svg>
);

export default SearchIcon;

