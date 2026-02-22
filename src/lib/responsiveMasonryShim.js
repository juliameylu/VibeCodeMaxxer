import { createElement } from "react";

export function ResponsiveMasonry({ children }) {
  return createElement("div", null, children);
}

export default function Masonry({ children, gutter }) {
  return createElement(
    "div",
    {
      style: {
        display: "grid",
        gap: gutter || "10px",
      },
    },
    children,
  );
}
