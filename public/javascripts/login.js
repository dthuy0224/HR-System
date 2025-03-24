document.addEventListener("DOMContentLoaded", function () {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const form = document.getElementById("loginForm");
    const csrfTokenElement = document.querySelector('input[name="_csrf"]');
    const csrfToken = csrfTokenElement ? csrfTokenElement.value : "";
    const submitButton = form.querySelector("button[type='submit']");

    const emailError = document.getElementById("emailError"); 
    const passwordError = document.getElementById("passwordError");


    
   
    const showError = (element, message) => {
        element.textContent = message;
        element.style.color = "red";
        element.style.fontWeight = "bold";
        element.style.display = "inline"; 
    };


    const clearError = (element) => {
        element.textContent = "";
        element.style.display = "none";
    };

 // ✅ Xử lý sự kiện khi nhập vào email/password để xoá lỗi khi sửa lại
    emailInput.addEventListener("input", () => clearError(emailError));
    passwordInput.addEventListener("input", () => clearError(passwordError));


    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearError(emailError);
        clearError(passwordError);


        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();


        if (!email) {
            showError(emailError, "Email cannot be empty!");
            return;
        }


        // ✅ Kiểm tra định dạng email
        const emailRegex = /^[^\s@]+@hrms\.com$/;
        if (!emailRegex.test(email)) {
            showError(emailError, "Invalid email format!");
            emailInput.focus();
            passwordInput.focus();
            return;
        }


        if (!password) {
            showError(passwordError, "Password cannot be empty!");
            return;
        }


        if (!csrfToken) {
            alert("CSRF token missing!");
            return;
        }


        // ✅ Vô hiệu hóa nút submit & hiển thị trạng thái loading
        submitButton.disabled = true;
        submitButton.textContent = "Log In";


        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "CSRF-Token": csrfToken
                },
                body: new URLSearchParams({ email, password, _csrf: csrfToken }).toString(),
            });


            const data = await response.json();


            if (!response.ok) {
                if (data.error === "email_not_found") {
                    showError(emailError, "This email is not registered!");
                } else if (data.error === "invalid_password") {
                    showError(passwordError, "Wrong password!");
                } else {
                    alert(data.message || "Login failed! Please try again.");
                }
                return;
            }


            // ✅ Redirect đúng userType
            window.location.href =
                data.userType === "admin" ? "/admin" :
                data.userType === "manager" ? "/manager" :
                "/employee";


        } catch (error) {
            console.error("Error during login:", error);
            alert("Login request failed. Please check your network and try again.");
        } finally {
            // ✅ Kích hoạt lại nút submit sau khi xử lý xong
            submitButton.disabled = false;
            submitButton.textContent = "Log In";
        }
    });
});





