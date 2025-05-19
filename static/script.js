let notificationShown = false;

function validateDates() {
  const startDate = document.getElementById("rental-start").value;
  const endDate = document.getElementById("rental-end").value;

  if (startDate && endDate) {
    if (new Date(startDate) > new Date(endDate)) {
      showNotification(
        "Дата начала не может быть позже даты окончания",
        "error"
      );
      document.getElementById("rental-start").value = "";
      document.getElementById("rental-end").value = "";
      return false;
    }
  }
  return true;
}

function showNotification(message, type) {
  if (notificationShown) return;
  notificationShown = true;

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.getElementById("notifications-container").appendChild(notification);
  setTimeout(() => {
    notification.remove();
    notificationShown = false;
  }, 3000);
}

// Handle authentication errors
document.body.addEventListener("htmx:afterRequest", function (evt) {
  if (evt.detail.pathInfo.requestPath === "/api/cart/items") {
    if (evt.detail.xhr.status === 401) {
      const response = JSON.parse(evt.detail.xhr.response);
      if (response.redirect) {
        window.location.href = response.redirect;
      }
    }
  }
});
