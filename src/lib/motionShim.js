import { createElement, forwardRef, Fragment } from "react";

function buildElement(tag) {
  return forwardRef(function MotionShimElement(props, ref) {
    const { children, ...rest } = props;
    return createElement(tag, { ...rest, ref }, children);
  });
}

export const motion = new Proxy(
  {},
  {
    get(_target, tag) {
      return buildElement(tag);
    },
  },
);

export function AnimatePresence({ children }) {
  return createElement(Fragment, null, children);
}
