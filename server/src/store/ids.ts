let userCounter = 100;
let calendarAccountCounter = 1;
let windowCounter = 1;
let oauthStateCounter = 1;
let reservationCounter = 1;

export function nextUserId(): string {
  userCounter += 1;
  return `u_${userCounter}`;
}

export function nextCalendarAccountId(): string {
  const value = String(calendarAccountCounter).padStart(3, "0");
  calendarAccountCounter += 1;
  return `calacct_${value}`;
}

export function nextWindowId(): string {
  const value = String(windowCounter).padStart(3, "0");
  windowCounter += 1;
  return `win_${value}`;
}

export function nextOauthState(): string {
  const value = String(oauthStateCounter).padStart(6, "0");
  oauthStateCounter += 1;
  return `state_${value}`;
}

export function nextReservationId(): string {
  const value = String(reservationCounter).padStart(6, "0");
  reservationCounter += 1;
  return `rsv_${value}`;
}

export function shortStableSuffix(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}
