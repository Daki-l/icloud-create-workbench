import { api, formValues } from "./api.js?v=3";

const form = document.querySelector("#loginForm");
const errorBox = document.querySelector("#loginError");

/** 提交管理员登录表单。 */
async function login(event) {
  event.preventDefault();
  errorBox.textContent = "";
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    await api("/api/auth/login", { method: "POST", body: JSON.stringify(formValues(form)) });
    location.href = "/";
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

form.addEventListener("submit", login);
