$(document).ready(function () {
    const $loginForm = $('#loginForm');
    const $username = $('#username');
    const $password = $('#password');
    const $loginBtn = $loginForm.find('button[type="submit"]');
    const $errorMsg = $('#errorMessage');
    const $overlay = $('#loadingOverlay');
    const $loginContainer = $('.login-container');

    // Hide overlay on load
    $overlay.hide();

    // Fade in the login container on page load
    $loginContainer.css({
        'animation': 'fadeInUp 1s cubic-bezier(.39,.575,.565,1) forwards'
    });

    // Button should be disabled until both fields are filled
    function checkInputs() {
        if ($username.val().trim() && $password.val().trim()) {
            $loginBtn.prop('disabled', false);
        } else {
            $loginBtn.prop('disabled', true);
        }
    }

    // On any input, check button enable/disable
    $username.add($password).on('input', function () {
        checkInputs();
        $errorMsg.removeClass('show').text('');
    });

    // Initial check (button disabled on load)
    checkInputs();
    $username.focus();

    $loginForm.on('submit', function (e) {
        e.preventDefault();
        $errorMsg.removeClass('show').text('');
        $overlay.fadeIn(150); // Show overlay

        const Username = $username.val();
        const Password = $password.val();

        $.ajax({
            url: '/Home/Authenticate',
            method: 'POST',
            contentType: 'application/x-www-form-urlencoded',
            data: `username=${encodeURIComponent(Username)}&password=${encodeURIComponent(Password)}`,
            success: function (response) {
                $overlay.fadeOut(100);
                if (response.success) {
                    window.location.href = response.redirectUrl;
                } else {
                    $errorMsg.text(response.message).addClass('show');
                }
            },
            error: function () {
                $overlay.fadeOut(100);
                $errorMsg.text('An error occurred. Please try again.').addClass('show');
            }
        });
    });
});