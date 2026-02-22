export function Toaster() {
  return null;
}

function emit(level, message) {
  if (typeof message === "string" && message.trim()) {
    // eslint-disable-next-line no-console
    console[level](`[toast] ${message}`);
  }
}

export const toast = Object.assign(
  (message) => emit("info", message),
  {
    success: (message) => emit("info", message),
    error: (message) => emit("error", message),
    warning: (message) => emit("warn", message),
    info: (message) => emit("info", message),
    message: (message) => emit("info", message),
    dismiss: () => {},
  },
);
