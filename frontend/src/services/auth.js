const USERS_KEY = "shinel_users";
const SESSION_KEY = "shinel_session";

const delay = (ms = 550) => new Promise(r => setTimeout(r, ms));

function loadUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function register({ name, email, password }) {
  await delay();
  email = email.trim().toLowerCase();
  const users = loadUsers();
  if (users.some(u => u.email === email)) {
    throw new Error("An account with this email already exists.");
  }
  const user = { id: crypto.randomUUID(), name: name.trim(), email, password };
  users.push(user);
  saveUsers(users);
  return { id: user.id, name: user.name, email: user.email };
}

export async function login({ email, password }) {
  await delay();
  email = email.trim().toLowerCase();
  const users = loadUsers();
  const found = users.find(u => u.email === email && u.password === password);
  if (!found) throw new Error("Invalid email or password.");
  const session = { token: crypto.randomUUID(), user: { id: found.id, name: found.name, email: found.email } };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}
