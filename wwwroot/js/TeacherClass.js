$(document).ready(function () {
    // Load teachers
    $.getJSON('/TeacherClass/GetTeachers', function (teachers) {
        $.each(teachers, function (i, teacher) {
            $('#teacherSelect').append($('<option>', {
                value: teacher.teacherCode,
                text: teacher.teacherName
            }));
        });
    });

    $('#filterBtn').on('click', function () {
        loadGrid();
    });

    $('#addClassBtn').on('click', function () {
        openAddClassModal();
    });

    function loadGrid() {
        var teacherCode = $('#teacherSelect').val();
        var date = $('#dateInput').val();
        if (!teacherCode || !date) {
            $('#gridWrapper').html('<div class="alert alert-warning">Please select a teacher and date.</div>');
            return;
        }
        $.getJSON('/TeacherClass/GetTeacherClassesGrid', { teacherCode: teacherCode, insertDate: date }, function (data) {
            renderGrid(data);
        });
    }

    function renderGrid(classes) {
        var html = '<div class="table-responsive"><table class="table table-bordered align-middle text-center">';
        html += '<thead><tr>';
        for (var i = 1; i <= 10; i++) {
            html += '<th>Class ' + i + '</th>';
        }
        html += '</tr></thead><tbody><tr>';

        for (var j = 0; j < 10; j++) {
            var c = classes[j];
            if (c) {
                html += '<td>' +
                    '<div><b>' + (c.className || '') + '</b></div>' +
                    '<div>Subject: ' + (c.subjectName || '') + '</div>' +
                    '<div>Year: ' + (c.yearName || '') + '</div>' +
                    '<div>Branch: ' + (c.branchName || '') + '</div>' +
                    '<div>Center: ' + (c.centerName || '') + '</div>' +
                    '<div>Hall: ' + (c.hallName || '') + '</div>' +
                    '<div>Time: ' + (c.startTime || '') + ' - ' + (c.endTime || '') + '</div>' +
                    '<div>Span: ' + (c.timeSpan || '') + '</div>' +
                    '<button class="btn btn-danger btn-sm mt-2 delete-class-btn" data-classcode="' + c.classCode + '">Delete</button>' +
                    '</td>';
            } else {
                html += '<td></td>';
            }
        }
        html += '</tr></tbody></table></div>';
        $('#gridWrapper').html(html);
    }

    // Handle delete
    $(document).on('click', '.delete-class-btn', function () {
        var classCode = $(this).data('classcode');
        if (confirm('Are you sure you want to delete this class?')) {
            $.ajax({
                url: '/TeacherClass/DeleteClass',
                method: 'POST',
                data: { classCode: classCode },
                success: function (res) {
                    if (res.success) {
                        loadGrid();
                    } else {
                        alert("Failed to delete class: " + res.message);
                    }
                }
            });
        }
    });

    // Add Class Modal Logic
    function openAddClassModal() {
        var teacherCode = $('#teacherSelect').val();
        var date = $('#dateInput').val();
        if (!teacherCode || !date) {
            alert("Please select a teacher and date.");
            return;
        }
        $('#submitAddClassBtn').prop('disabled', true);
        $('#selectedScheduleCode').val('');
        $('#selectedHallCode').val('');
        // Load schedules for teacher & date
        $.getJSON('/TeacherClass/GetSchedulesForDay', { teacherCode: teacherCode, date: date }, function (schedules) {
            var html = '<table class="table table-bordered"><thead><tr>' +
                '<th></th><th>Schedule Name</th><th>Year</th><th>Subject</th><th>Hall</th><th>Start Time</th><th>End Time</th></tr></thead><tbody>';
            if (schedules.length > 0) {
                $.each(schedules, function (i, sch) {
                    html += '<tr>' +
                        '<td><input type="radio" name="scheduleRadio" value="' + sch.scheduleCode + '" data-hall="' + sch.hallCode + '"></td>' +
                        '<td>' + sch.scheduleName + '</td>' +
                        '<td>' + (sch.yearName || '') + '</td>' +
                        '<td>' + (sch.subjectName || '') + '</td>' +
                        '<td>' + (sch.hallName || '') + '</td>' +
                        '<td>' + (sch.startTime ? sch.startTime.substring(0, 5) : '') + '</td>' +
                        '<td>' + (sch.endTime ? sch.endTime.substring(0, 5) : '') + '</td>' +
                        '</tr>';
                });
            } else {
                html += '<tr><td colspan="7" class="text-center">No schedules found for this teacher and date.</td></tr>';
            }
            html += '</tbody></table>';
            $('#scheduleTableWrapper').html(html);
            $('#addClassModal').modal('show');
        });
    }

    // Schedule radio select
    $(document).on('change', 'input[name="scheduleRadio"]', function () {
        $('#selectedScheduleCode').val($(this).val());
        $('#selectedHallCode').val($(this).data('hall'));
        $('#submitAddClassBtn').prop('disabled', false);
    });

    // Add Class Form Submit
    // In your submit handler
    $('#addClassForm').on('submit', function (e) {
        e.preventDefault();
        var teacherCode = $('#teacherSelect').val();
        var scheduleCode = $('#selectedScheduleCode').val();
        var hallCode = $('#selectedHallCode').val();
        if (!teacherCode || !scheduleCode || !hallCode) {
            $('#addClassError').removeClass('d-none').text("Select a schedule record!");
            return;
        }
        $.ajax({
            url: '/TeacherClass/AddClassFromSchedule',
            method: 'POST',
            data: {
                scheduleCode: scheduleCode,
                hallCode: hallCode
            },
            success: function (res) {
                if (res.success) {
                    $('#addClassModal').modal('hide');
                    $('#addClassError').addClass('d-none').text('');
                    loadGrid();
                } else {
                    $('#addClassError')
                        .removeClass('d-none')
                        .text(res.message || "Unknown error.");
                    setTimeout(function () {
                        $('#addClassError').addClass('d-none').text('');
                    }, 5000);
                }
            }
        });
    });

    // Optionally auto-load grid on page load
    loadGrid();
});