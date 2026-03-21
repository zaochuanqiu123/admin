let suppressHoverAutoOpen = false;

export function suppressMenuHoverAutoOpen() {
  suppressHoverAutoOpen = true;
}

export function resumeMenuHoverAutoOpen() {
  suppressHoverAutoOpen = false;
}

export function isMenuHoverAutoOpenSuppressed() {
  return suppressHoverAutoOpen;
}
