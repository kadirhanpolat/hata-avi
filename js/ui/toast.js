export function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn("Toast element not found in HTML");
    return;
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}

window.showToast = showToast;
