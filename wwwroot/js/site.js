$(document).ready(function () {
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        const $errorMsg = $('#errorMessage');
        $errorMsg.removeClass('show').text('');
        $('#loadingOverlay').fadeIn(150);

        const Username = $('#username').val();
        const Password = $('#password').val();

        $.ajax({
            url: '/Home/Authenticate',
            method: 'POST',
            contentType: 'application/x-www-form-urlencoded',
            data: `username=${encodeURIComponent(Username)}&password=${encodeURIComponent(Password)}`,
            success: function (response) {
                $('#loadingOverlay').fadeOut(100);
                if (response.success) {
                    window.location.href = response.redirectUrl;
                } else {
                    $errorMsg.text(response.message).addClass('show');
                }
            },
            error: function () {
                $('#loadingOverlay').fadeOut(100);
                $errorMsg.text('An error occurred. Please try again.').addClass('show');
            }
        });
    });

    // Hide error on input
    $('#username, #password').on('input', function () {
        $('#errorMessage').removeClass('show').text('');
    });
});