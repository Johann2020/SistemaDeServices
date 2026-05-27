const form = document.querySelector("#auth-form");
const nameField = document.querySelector(".auth-name-field");
const nameInput = document.querySelector("#auth-name");
const emailInput = document.querySelector("#auth-email");
const passwordInput = document.querySelector("#auth-password");
const errorBox = document.querySelector("#auth-error");
const submitButton = document.querySelector("#auth-submit");
const modeButtons = [...document.querySelectorAll("[data-auth-mode]")];

let mode = "login";

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.authMode;
    modeButtons.forEach((item) => item.classList.toggle("active", item === button));
    nameField.classList.toggle("hidden", mode !== "register");
    submitButton.textContent = mode === "register" ? "Crear cuenta" : "Ingresar";
    errorBox.textContent = "";
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
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
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo ingresar.");
    const cameFromAdmin = window.location.pathname === "/admin" || window.location.pathname === "/admin.html";
    window.location.href = cameFromAdmin && data.user?.isAdmin ? "/admin" : "/app";
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});
