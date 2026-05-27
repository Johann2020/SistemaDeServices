const usersBody = document.querySelector("#admin-users-body");
const emptyState = document.querySelector("#admin-empty");
const errorBox = document.querySelector("#admin-error");
const refreshButton = document.querySelector("#admin-refresh");
const logoutButton = document.querySelector("#admin-logout");
const openAppButton = document.querySelector("#admin-open-app");

let currentAdmin = null;
let csrfToken = "";

bootAdmin();

async function bootAdmin() {
  refreshButton.addEventListener("click", loadUsers);
  openAppButton.addEventListener("click", () => {
    window.location.href = "/app";
  });
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
    });
    window.location.href = "/";
  });
  await loadUsers();
}

async function loadUsers() {
  errorBox.textContent = "";
  refreshButton.disabled = true;
  try {
    const data = await fetchJson("/api/admin/users");
    currentAdmin = data.admin;
    csrfToken = data.csrfToken || "";
    renderUsers(data.users || []);
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    refreshButton.disabled = false;
  }
}

function renderUsers(users) {
  usersBody.innerHTML = "";
  emptyState.classList.toggle("visible", users.length === 0);

  users.forEach((user) => {
    const tr = document.createElement("tr");
    const counts = user.counts || {};
    const isSelf = currentAdmin?.id === user.id;
    const approvalBadge = user.isAdmin
      ? '<span class="admin-badge approved">Admin</span>'
      : user.approved
        ? '<span class="admin-badge approved">Aprobado</span>'
        : '<span class="admin-badge pending">Pendiente</span>';
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(user.name)}</strong>
        ${approvalBadge}
      </td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(formatDateTime(user.createdAt))}</td>
      <td>
        <span class="admin-counts">
          ${countChip("Clientes", counts.clients)}
          ${countChip("Equipos", counts.equipment)}
          ${countChip("Productos", counts.products)}
          ${countChip("Services", counts.services)}
        </span>
      </td>
      <td>
        <div class="admin-row-actions">
          ${
            user.approved
              ? `<button class="small-button" type="button" data-impersonate="${escapeHtml(user.id)}" ${isSelf ? "disabled" : ""}>
                  ${isSelf ? "Tu cuenta" : "Entrar"}
                </button>`
              : `<button class="small-button" type="button" data-approve-user="${escapeHtml(user.id)}">
                  Aprobar
                </button>`
          }
          <button class="small-button delete" type="button" data-delete-user="${escapeHtml(user.id)}" ${isSelf ? "disabled" : ""}>
            Eliminar
          </button>
        </div>
      </td>
    `;
    usersBody.appendChild(tr);
  });

  usersBody.querySelectorAll("[data-impersonate]").forEach((button) => {
    button.addEventListener("click", async () => {
      await impersonate(button.dataset.impersonate);
    });
  });
  usersBody.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      const user = users.find((item) => item.id === button.dataset.deleteUser);
      if (user) await deleteUser(user);
    });
  });
  usersBody.querySelectorAll("[data-approve-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      const user = users.find((item) => item.id === button.dataset.approveUser);
      if (user) await approveUser(user);
    });
  });
}

async function impersonate(userId) {
  errorBox.textContent = "";
  try {
    await fetchJson("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    window.location.href = "/app";
  } catch (error) {
    errorBox.textContent = error.message;
  }
}

async function deleteUser(user) {
  const counts = user.counts || {};
  const message = [
    `Eliminar la cuenta de ${user.name}?`,
    "",
    "Tambien se eliminaran:",
    `${Number(counts.clients || 0)} cliente(s)`,
    `${Number(counts.equipment || 0)} equipo(s)`,
    `${Number(counts.products || 0)} producto(s)`,
    `${Number(counts.services || 0)} service(s)`,
    "",
    "Esta accion no se puede deshacer.",
  ].join("\n");

  if (!window.confirm(message)) return;

  errorBox.textContent = "";
  try {
    await fetchJson("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    await loadUsers();
  } catch (error) {
    errorBox.textContent = error.message;
  }
}

async function approveUser(user) {
  errorBox.textContent = "";
  try {
    await fetchJson("/api/admin/approve-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    await loadUsers();
  } catch (error) {
    errorBox.textContent = error.message;
  }
}

async function fetchJson(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(method !== "GET" && csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      window.location.href = "/";
      return {};
    }
    throw new Error(data.error || "No se pudo completar la accion.");
  }
  return data;
}

function countChip(label, value) {
  return `<span>${escapeHtml(label)}: <strong>${Number(value || 0)}</strong></span>`;
}

function formatDateTime(value) {
  if (!value) return "---";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
