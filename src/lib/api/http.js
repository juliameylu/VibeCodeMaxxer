export class HttpError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export async function httpGetJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new HttpError("Network request failed. Please try again.", 0, error);
  }

  const contentType = response.headers.get("content-type") || "";
  let payload = null;

  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    try {
      payload = await response.text();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && payload.error) ||
      `Request failed with status ${response.status}`;
    throw new HttpError(message, response.status, payload);
  }

  return payload;
}
