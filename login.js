const form = document.querySelector("#auth-form");
const nameField = document.querySelector(".auth-name-field");
const nameInput = document.querySelector("#auth-name");
const emailInput = document.querySelector("#auth-email");
const passwordInput = document.querySelector("#auth-password");
const messageBox = document.querySelector("#auth-message");
const errorBox = document.querySelector("#auth-error");
const submitButton = document.querySelector("#auth-submit");
const modeButtons = [...document.querySelectorAll("[data-auth-mode]")];

let mode = "login";

function setMode(nextMode) {
  mode = nextMode;
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  nameField.classList.toggle("hidden", mode !== "register");
  submitButton.textContent = mode === "register" ? "Crear cuenta" : "Ingresar";
  messageBox.textContent = "";
  errorBox.textContent = "";
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.authMode));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageBox.textContent = "";
  errorBox.textContent = "";
  submitButton.disabled = true;

  try {
    const response = await fetch(`/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
      }),
    });
    const data = await readResponseData(response);
    if (!response.ok) throw new Error(data.error || "No se pudo ingresar.");
    if (mode === "register" && data.pendingApproval) {
      setMode("login");
      messageBox.textContent = "Cuenta creada. Queda pendiente de aprobacion manual antes de poder ingresar.";
      passwordInput.value = "";
      return;
    }
    const cameFromAdmin = window.location.pathname === "/admin" || window.location.pathname === "/admin.html";
    window.location.href = cameFromAdmin && data.user?.isAdmin ? "/admin" : "/app";
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

async function readResponseData(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.trim() || "No se pudo completar la accion." };
  }
}
