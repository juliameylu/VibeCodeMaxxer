export const MOCK_USERS = [
  {
    user_id: "6f0f8e72-8717-4b8d-a2ea-e2dca4e5f111",
    username: "faith",
    password: "faith123",
    name: "Faith Johnson",
    email: "faith@calpoly.edu",
    timezone: "America/Los_Angeles",
  },
  {
    user_id: "61fbbf57-b7c6-4ddd-aa9f-caf3afba2222",
    username: "maria",
    password: "maria123",
    name: "Maria Lopez",
    email: "maria@calpoly.edu",
    timezone: "America/Los_Angeles",
  },
  {
    user_id: "3f1b578d-51e6-4f84-b0f5-9cf6d4dc3333",
    username: "devin",
    password: "devin123",
    name: "Devin Patel",
    email: "devin@calpoly.edu",
    timezone: "America/Los_Angeles",
  },
];

export function authenticateMockUser(username, password) {
  const normalized = String(username || "").trim().toLowerCase();

  return (
    MOCK_USERS.find(
      (user) => user.username === normalized && user.password === String(password || ""),
    ) || null
  );
}
