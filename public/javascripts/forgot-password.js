document.getElementById("cancelButton").addEventListener("click", function () {
  if (document.referrer) {
    history.back();
  } else {
    window.location.href = "/";
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("forgotPasswordForm");
  const messageElement = document.getElementById("message");
  const emailInput = document.getElementById("email");

  // Kiểm tra nếu csrfToken tồn tại
  const csrfTokenElement = document.getElementById("csrfToken");
  const csrfToken = csrfTokenElement ? csrfTokenElement.value : null;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    console.log("Input Email:", email); // Debug log

    if (!email) {
      showMessage("This email cannot be empty!", "error");
      return;
    }

    if (!validateEmail(email)) {
      showMessage("Invalid email format!", "error");
      return;
    }

    await handleSubmit(email);
  });

  async function handleSubmit(email) {
    showMessage("Processing...", "processing");

    try {
      // Gửi yêu cầu kiểm tra email đến máy chủ
      const checkResponse = await fetch(`/check-email?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken && { "X-CSRF-Token": csrfToken })
,
        },
      });

      const checkData = await checkResponse.json();
      console.log("Check Email Response:", checkData);

      if (!checkData.exists) {
        showMessage("This email is not registered!", "error");
        return;
      }

      // Nếu email tồn tại, tiếp tục gửi yêu cầu đặt lại mật khẩu
      const response = await fetch("/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken && { "CSRF-Token": csrfToken }),
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log("Server Data:", data);

      if (!response.ok) {
        showMessage(data.message || "An error occurred!", "error");
        return;
      }

      showMessage("✅ " + data.message, "success");

    } catch (error) {
      console.error("Error in handleSubmit:", error);
      showMessage("Something went wrong. Please try again.", "error");
    }
  }

  function showMessage(text, type) {
    console.log("showMessage called with:", text, type); // Debug log
    if (!messageElement) {
      console.error("messageElement not found in DOM!");
      return;
    }

    messageElement.innerHTML = `<span class="error-icon"></span> ${text}`;
    messageElement.classList.remove("hidden-message", "success-message", "error-message", "processing-message");

    if (type === "error") {
      messageElement.classList.add("error-message");
      messageElement.style.color = "red"; // 🔴 Đảm bảo hiển thị màu đỏ
    } else if (type === "success") {
      messageElement.classList.add("success-message");
      messageElement.style.color = "green";
    } else if (type === "processing") {
      messageElement.classList.add("processing-message");
      messageElement.style.color = "blue";
    }

    console.log("Updated messageElement:", messageElement); // Debug log
  }

  function validateEmail(email) {
    return /^[^\s@]+@hrms\.com$/.test(email);
  }
});
