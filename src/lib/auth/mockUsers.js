export const MOCK_USERS = [
  {
    id: "faith",
    username: "faith",
    password: "faith123",
    name: "Faith Johnson",
    email: "faith@calpoly.edu",
    timezone: "America/Los_Angeles",
  },
  {
    id: "maria",
    username: "maria",
    password: "maria123",
    name: "Maria Lopez",
    email: "maria@calpoly.edu",
    timezone: "America/Los_Angeles",
  },
  {
    id: "devin",
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
