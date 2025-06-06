$(document).ready(function () {
    let currentRootCode = 1;
    let currentRootName = "";
    let currentBranchCode = null;

    // Set the chosenDateInput to today on page load
    const today = new Date().toISOString().slice(0, 10);
    $('#chosenDateInput').val(today);
    $('#chosenDateDisplay').text('Selected: ' + today);
    $('#clearDateBtn').show();

    $('#hallsTable tbody').html('<tr><td colspan="11" class="text-center">Please select a branch to view data.</td></tr>');

    function fetchRootNameAndBranches() {
        $.get('/Class/GetRootCodes', function (roots) {
            let root = roots.find(r => r.rootCode == currentRootCode);
            currentRootName = root ? root.rootName : "Root";
            $('#branchFilterLabel').text('Choose Branch for ' + currentRootName);
            updateBranchDropdown();
        });
    }

    function updateBranchDropdown() {
        $.get('/Class/GetBranchCodes', { rootCode: currentRootCode }, function (data) {
            let options = '<option value="">Choose Branch for ' + currentRootName + '</option>';
            data.forEach(b => options += `<option value="${b.branchCode}">${b.branchName}</option>`);
            $('#branchFilter').html(options);
            if (data.length > 0) {
                $('#branchFilter').val(data[0].branchCode).trigger('change');
            }
        });
    }

    fetchRootNameAndBranches();

    $('#branchFilter').on('change', function () {
        const branchCode = $(this).val();
        currentBranchCode = branchCode && branchCode !== "" ? parseInt(branchCode, 10) : null;
        if (!currentBranchCode) {
            $('#hallsTable tbody').html('<tr><td colspan="11" class="text-center">Please select a branch to view data.</td></tr>');
            return;
        }
        const date = $('#chosenDateInput').val() || today;
        fetchAndRender(date, currentBranchCode);
    });

    $('#chooseDateBtn').on('click', function () {
        $('#chosenDateInput').removeClass('d-none').focus().click();
    });

    $('#chosenDateInput').on('change', function () {
        const chosenDate = $(this).val();
        if (chosenDate) {
            $('#chosenDateDisplay').text('Selected: ' + chosenDate);
            $('#clearDateBtn').show();
            if (currentBranchCode) fetchAndRender(chosenDate, currentBranchCode);
            $('#chosenDateInput').addClass('d-none');
        }
    });

    $('#clearDateBtn').on('click', function () {
        $('#chosenDateInput').val(today);
        $('#chosenDateDisplay').text('Selected: ' + today);
        $(this).show();
        $('#chosenDateInput').addClass('d-none');
        if (currentBranchCode) fetchAndRender(today, currentBranchCode);
    });

    function fetchAndRender(date, branchCode) {
        $.ajax({
            url: '/Class/GetHallsWithClassGrid',
            type: 'GET',
            dataType: 'json',
            data: {
                insertDate: date,
                branchCode: branchCode
            },
            success: function (data) {
                renderTable(data);
            },
            error: function () {
                $('#hallsTable tbody').html('<tr><td colspan="11" class="text-danger text-center">Failed to load data.</td></tr>');
            }
        });
    }

    function renderTable(data) {
        if (!data || data.length === 0) {
            $('#hallsTable tbody').html('<tr><td colspan="11" class="text-center">No data found for the selected branch.</td></tr>');
            return;
        }
        let rowsHtml = '';
        data.forEach(function (hall) {
            rowsHtml += `<tr><td class="align-middle fw-semibold">${hall.hallName}</td>`;
            for (let i = 0; i < 10; i++) {
                const slot = hall.slots && hall.slots[i];
                if (slot) {
                    if (slot.type === "class") {
                        let classTimeText = "";
                        if (slot.classStartTime && slot.classEndTime) {
                            classTimeText = `<div class="small text-muted mb-2">from ${slot.classStartTime} to ${slot.classEndTime}</div>`;
                        }
                        rowsHtml += `
                        <td class="class-cell text-center align-middle"
                            data-classcode="${slot.classCode || ''}"
                            data-hallcode="${hall.hallCode}" 
                            data-classname="${slot.className}" 
                            data-teachername="${slot.teacherName}"
                            data-subjectname="${slot.subjectName}"
                            data-yearname="${slot.yearName}"
                            data-classstarttime="${slot.classStartTime || ''}"
                            data-classendtime="${slot.classEndTime || ''}">
                            <div class="fw-bold mb-1">${slot.className}</div>
                            <div class="small text-muted mb-1">Teacher: ${slot.teacherName}</div>
                            <div class="small text-muted mb-1">Subject: ${slot.subjectName}</div>
                            <div class="small text-muted mb-2">Year: ${slot.yearName}</div>
                            ${classTimeText}
                            <div class="d-flex justify-content-center gap-2 mt-2">
                                <button type="button" class="btn btn-outline-secondary btn-sm rounded-circle edit-class-btn" title="Edit" data-bs-toggle="tooltip">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button type="button" class="btn btn-outline-danger btn-sm rounded-circle delete-class-btn" title="Delete" data-bs-toggle="tooltip">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>`;
                    } else if (slot.type === "reservation") {
                        let reservationTimeText = "";
                        if (slot.reservationStartTime && slot.reservationEndTime) {
                            reservationTimeText = `<div class="small text-muted mb-1">Time: ${slot.reservationStartTime} - ${slot.reservationEndTime}</div>`;
                        }
                        rowsHtml += `
                        <td class="reservation-cell text-center align-middle"
                            data-reservationcode="${slot.reservationCode || ''}"
                            data-hallcode="${hall.hallCode}" 
                            data-teachername="${slot.teacherName}"
                            data-capacity="${slot.capacity || ''}"
                            data-description="${slot.description || ''}"
                            data-cost="${slot.cost || ''}"
                            data-deposit="${slot.deposit !== undefined && slot.deposit !== null ? slot.deposit : ''}"
                            data-period="${slot.period || ''}"
                            data-reservationtime="${slot.reservationTime || ''}"
                            data-reservationstarttime="${slot.reservationStartTime || ''}"
                            data-reservationendtime="${slot.reservationEndTime || ''}"
                            data-finalcost="${slot.finalCost !== undefined && slot.finalCost !== null ? slot.finalCost : ''}">
                            <div class="fw-bold mb-1 text-primary">[Reservation]</div>
                            <div class="small text-muted mb-1">Teacher: ${slot.teacherName}</div>
                            <div class="small text-muted mb-1">Capacity: ${slot.capacity}</div>
                            <div class="small text-muted mb-1">Description: ${slot.description || ""}</div>
                            ${reservationTimeText}
                            <div class="d-flex justify-content-center gap-2 mt-2">
                                <button type="button" class="btn btn-outline-secondary btn-sm rounded-circle edit-reservation-btn" title="Edit Reservation" data-bs-toggle="tooltip">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button type="button" class="btn btn-outline-danger btn-sm rounded-circle delete-reservation-btn" title="Delete Reservation" data-bs-toggle="tooltip">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>`;
                    }
                } else {
                    rowsHtml += `<td class="text-center align-middle"></td>`;
                }
            }
            rowsHtml += '</tr>';
        });
        $('#hallsTable tbody').html(rowsHtml);

        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // --- Add Session Modal Logic ---
    $('#addSessionBtn').on('click', function () {
        var modal = new bootstrap.Modal(document.getElementById('addSessionModal'));
        modal.show();
    });

    function openAddClassFromScheduleModal() {
        if (!currentRootCode) {
            alert("Please select a root before adding.");
            return;
        }
        const date = $('#chosenDateInput').val() || today;
        $('#schedulesTable tbody').html('<tr><td colspan="9" class="text-center">Loading schedules...</td></tr>');
        $.get('/Class/GetSchedulesForDay', { date: date, rootCode: currentRootCode }, function (schedules) {
            if (!schedules || schedules.length === 0) {
                $('#schedulesTable tbody').html('<tr><td colspan="9" class="text-center text-danger">No schedules found for this date and root.</td></tr>');
                return;
            }
            $.when(
                $.get('/Class/GetTeachers'),
                $.get('/Class/GetSubjects'),
                $.get('/Class/GetYears'),
                $.get('/Class/GetEduYears'),
                $.get('/Class/GetHallsWithClassGrid', { insertDate: date, branchCode: currentBranchCode })
            ).done(function (teachersRes, subjectsRes, yearsRes, eduyearsRes, hallsRes) {
                const teachers = teachersRes[0];
                const subjects = subjectsRes[0];
                const years = yearsRes[0];
                const eduyears = eduyearsRes[0];
                const halls = [];
                if (hallsRes[0] && Array.isArray(hallsRes[0])) {
                    hallsRes[0].forEach(h => halls.push({ hallName: h.hallName, hallCode: h.hallCode }));
                }

                let rows = '';
                schedules.forEach(s => {
                    const teacher = teachers.find(t => t.teacherCode === s.teacherCode);
                    const subject = subjects.find(sub => sub.subjectCode === s.subjectCode);
                    const year = years.find(y => y.yearCode === s.yearCode);
                    const eduyear = eduyears.find(e => e.eduCode === s.eduYearCode);
                    const hall = halls.find(h => h.hallCode === s.hallCode);

                    let startTimeStr = "";
                    let endTimeStr = "";
                    if (s.startTime && typeof s.startTime === "string" && s.startTime.length >= 16) {
                        startTimeStr = s.startTime.substring(11, 16);
                    }
                    if (s.endTime && typeof s.endTime === "string" && s.endTime.length >= 16) {
                        endTimeStr = s.endTime.substring(11, 16);
                    }

                    rows += `<tr>
                        <td>${s.scheduleName}</td>
                        <td>${teacher ? teacher.teacherName : ''}</td>
                        <td>${hall ? hall.hallName : s.hallCode}</td>
                        <td>${subject ? subject.subjectName : ''}</td>
                        <td>${year ? year.yearName : ''}</td>
                        <td>${eduyear ? eduyear.eduName : ''}</td>
                        <td>${startTimeStr}</td>
                        <td>${endTimeStr}</td>
                        <td>
                            <button class="btn btn-success btn-sm select-schedule-btn" 
                                data-schedulecode="${s.scheduleCode}" 
                                data-hallcode="${s.hallCode}"
                                data-rootcode="${currentRootCode}">
                                Add
                            </button>
                        </td>
                    </tr>`;
                });
                $('#schedulesTable tbody').html(rows);
            });
        });

        var modal = new bootstrap.Modal(document.getElementById('selectScheduleModal'));
        modal.show();
    }

    // Bind both buttons to this function
    $('#addClassFromScheduleBtn').on('click', openAddClassFromScheduleModal);
    $('#addClassFromScheduleBtnModal').on('click', function () {
        $('#addSessionModal').modal('hide');
        setTimeout(openAddClassFromScheduleModal, 300);
    });

    $('#addReservationBtnModal').on('click', function () {
        $('#addSessionModal').modal('hide');
        loadReservationTeachers();
        loadReservationHalls();
        $('#addReservationForm')[0].reset();
        $('#ReservationTime').val($('#chosenDateInput').val() || "");
        $('#ReservationPeriod').val('');
        var modal = new bootstrap.Modal(document.getElementById('addReservationModal'));
        modal.show();
    });

    // "First time?" link next to Teacher dropdown in Reservation Modal
    $('#ReservationTeacherCode').parent().on('click', '#firstTimeTeacherBtn', function () {
        $('#addTeacherForm')[0].reset();
        var modal = new bootstrap.Modal(document.getElementById('addTeacherModal'));
        modal.show();
    });

    // Add Teacher Modal Form Submission
    $('#addTeacherForm').on('submit', function (e) {
        e.preventDefault();
        var data = {
            TeacherName: $('#TeacherName').val(),
            Teacher_Phone: $('#Teacher_Phone').val(),
            Teacher_Address: $('#Teacher_Address').val(),
            Insert_User: $('#Insert_User').val()
        };
        $.post('/Class/AddTeacher', data, function (result) {
            if (result.success) {
                var teacherModal = bootstrap.Modal.getInstance(document.getElementById('addTeacherModal'));
                teacherModal.hide();
                loadReservationTeachers(function () {
                    $('#ReservationTeacherCode').val(result.teacherCode);
                });
                alert('Teacher added successfully!');
            } else {
                alert(result.message || 'Error adding teacher');
            }
        }).fail(function (xhr) {
            alert('Error adding teacher: ' + (xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Server Error'));
        });
    });

    function loadReservationTeachers(callback) {
        $.get('/Class/GetTeachers', function (data) {
            let options = '<option value="">Select Teacher</option>';
            data.filter(t => !t.isStaff).forEach(t => {
                options += `<option value="${t.teacherCode}">${t.teacherName}</option>`;
            });
            $('#ReservationTeacherCode').html(options);
            if (typeof callback === "function") callback();
        });
    }
    function loadReservationHalls() {
        if (!currentBranchCode) {
            $('#ReservationHallCode').html('<option value="">Select Branch First</option>');
            return;
        }
        $.get('/Class/GetHallsByBranch', { branchCode: currentBranchCode }, function (data) {
            let options = '<option value="">Select Hall</option>';
            data.forEach(h => {
                options += `<option value="${h.hallCode}">${h.hallName}</option>`;
            });
            $('#ReservationHallCode').html(options);
        });
    }
    $('#ReservationStartTime, #ReservationEndTime').on('change', function () {
        const start = $('#ReservationStartTime').val();
        const end = $('#ReservationEndTime').val();
        if (start && end) {
            const [startH, startM] = start.split(':').map(Number);
            const [endH, endM] = end.split(':').map(Number);
            let period = (endH + endM / 60) - (startH + startM / 60);
            if (period < 0) period += 24;
            $('#ReservationPeriod').val(period.toFixed(2));
        } else {
            $('#ReservationPeriod').val('');
        }
    });
    $('#addReservationForm').on('submit', function (e) {
        e.preventDefault();
        var formData = $(this).serialize();
        formData += (formData ? '&' : '') + 'BranchCode=' + encodeURIComponent(currentBranchCode || '');
        $.post('/Class/AddReservation', formData, function (result) {
            if (result.success) {
                var modal = bootstrap.Modal.getInstance(document.getElementById('addReservationModal'));
                modal.hide();
                if (currentBranchCode) fetchAndRender($('#chosenDateInput').val() || today, currentBranchCode);
            } else {
                alert(result.message || 'Error adding reservation');
            }
        }).fail(function (xhr) {
            alert('Error adding reservation: ' + (xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Server Error'));
        });
    });

    // Add class from chosen schedule
    $('#schedulesTable').on('click', '.select-schedule-btn', function () {
        const scheduleCode = $(this).data('schedulecode');
        const hallCode = $(this).data('hallcode');
        const rootCode = $(this).data('rootcode');
        if (!scheduleCode || !hallCode || !rootCode) {
            alert('Missing schedule, hall, or root code');
            return;
        }
        $.post('/Class/AddClassFromSchedule', { scheduleCode, hallCode, rootCode }, function (result) {
            if (result.success) {
                var modal = bootstrap.Modal.getInstance(document.getElementById('selectScheduleModal'));
                modal.hide();
                if (currentBranchCode) fetchAndRender($('#chosenDateInput').val() || today, currentBranchCode);
                alert('Class added successfully!');
            } else {
                alert(result.message || 'Error adding class');
            }
        }).fail(function (xhr) {
            let msg = "Server Error";
            if (xhr.responseJSON && xhr.responseJSON.message) {
                msg = xhr.responseJSON.message;
                if (xhr.responseJSON.stack)
                    msg += "\n\n" + xhr.responseJSON.stack;
            }
            alert('Error adding class: ' + msg);
        });
    });

    // Edit Reservation logic
    $('#hallsTable').on('click', '.edit-reservation-btn', function () {
        const cell = $(this).closest('.reservation-cell');
        $('#EditReservationCode').val(cell.data('reservationcode') || '');
        $('#EditReservationHallCode').val(cell.data('hallcode') || '');
        $('#EditReservationCapacity').val(cell.data('capacity') || '');
        $('#EditReservationFinalCost').val(cell.data('finalcost') ?? '');
        $('#EditReservationStartTime').val(cell.data('reservationstarttime') || '');
        $('#EditReservationEndTime').val(cell.data('reservationendtime') || '');
        $('#EditReservationStartTime, #EditReservationEndTime').off('change').on('change', function () {
            const start = $('#EditReservationStartTime').val();
            const end = $('#EditReservationEndTime').val();
            if (start && end) {
                const [startH, startM] = start.split(':').map(Number);
                const [endH, endM] = end.split(':').map(Number);
                let period = (endH + endM / 60) - (startH + startM / 60);
                if (period < 0) period += 24;
                $('#EditReservationPeriod').val(period.toFixed(2));
            } else {
                $('#EditReservationPeriod').val('');
            }
        }).trigger('change');
        $.get('/Class/GetTeachers', function (data) {
            let options = '<option value="">Select Teacher</option>';
            data.filter(t => !t.isStaff).forEach(t => {
                options += `<option value="${t.teacherCode}">${t.teacherName}</option>`;
            });
            $('#EditReservationTeacherCode').html(options);
            $('#EditReservationTeacherCode option').each(function () {
                if ($(this).text().trim().toLowerCase() === (cell.data('teachername') || '').trim().toLowerCase())
                    $(this).prop('selected', true);
            });
        });
        var modal = new bootstrap.Modal(document.getElementById('editReservationModal'));
        modal.show();
    });

    $('#editReservationForm').on('submit', function (e) {
        e.preventDefault();
        var formData = $(this).serialize();
        $.post('/Class/EditReservation', formData, function (result) {
            if (result.success) {
                var modal = bootstrap.Modal.getInstance(document.getElementById('editReservationModal'));
                modal.hide();
                if (currentBranchCode) fetchAndRender($('#chosenDateInput').val() || today, currentBranchCode);
            } else {
                alert(result.message || 'Error editing reservation');
            }
        }).fail(function (xhr) {
            alert('Error editing reservation: ' + (xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'Server Error'));
        });
    });

    $('#hallsTable').on('click', '.delete-reservation-btn', function () {
        if (!confirm('Are you sure you want to delete this reservation?')) return;
        const cell = $(this).closest('.reservation-cell');
        const reservationCode = cell.data('reservationcode');
        if (!reservationCode) {
            alert('Reservation code is missing. Cannot delete this reservation.');
            return;
        }
        $.ajax({
            url: '/Class/DeleteReservation',
            type: 'POST',
            data: { reservationCode },
            success: function (result) {
                if (result.success) {
                    if (currentBranchCode) fetchAndRender($('#chosenDateInput').val() || today, currentBranchCode);
                } else {
                    alert('Error deleting reservation: ' + (result.message || 'Unknown error'));
                }
            },
            error: function (xhr) {
                alert('Failed to delete reservation. Server returned ' + xhr.status);
            }
        });
    });

    // Edit Class logic
    $('#hallsTable').on('click', '.edit-class-btn', function () {
        const cell = $(this).closest('.class-cell');
        const classCode = cell.data('classcode');
        const className = cell.data('classname');
        const teacherName = cell.data('teachername');
        const subjectName = cell.data('subjectname');
        const yearName = cell.data('yearname');
        const classStartTime = cell.data('classstarttime');
        const classEndTime = cell.data('classendtime');

        function showModalAfterDropdowns() {
            $('#EditClassCode').val(classCode || '');
            $('#EditClassName').val(className || '');
            $('#editClassStartTime').val(classStartTime || '');
            $('#editClassEndTime').val(classEndTime || '');

            $('#EditTeacherCode option').each(function () {
                if ($(this).text().trim().toLowerCase() === (teacherName || '').trim().toLowerCase())
                    $(this).prop('selected', true);
            });
            $('#EditSubjectCode option').each(function () {
                if ($(this).text().trim().toLowerCase() === (subjectName || '').trim().toLowerCase())
                    $(this).prop('selected', true);
            });
            $('#EditYearCode option').each(function () {
                if ($(this).text().trim().toLowerCase() === (yearName || '').trim().toLowerCase())
                    $(this).prop('selected', true);
            });

            setEditFieldRequired(false);

            var modal = new bootstrap.Modal(document.getElementById('editClassModal'));
            modal.show();
        }

        // Load dropdowns for teachers (IsStaff==true), subjects, and years
        let loaded = 0;
        function checkLoaded() { loaded++; if (loaded === 3) showModalAfterDropdowns(); }

        $.get('/Class/GetTeachers', function (data) {
            let options = '<option value="">Select Teacher</option>';
            data.filter(t => t.isStaff).forEach(t => {
                options += `<option value="${t.teacherCode}">${t.teacherName}</option>`;
            });
            $('#EditTeacherCode').html(options);
            checkLoaded();
        });
        $.get('/Class/GetSubjects', function (data) {
            let options = '<option value="">Select Subject</option>';
            data.forEach(s => options += `<option value="${s.subjectCode}">${s.subjectName}</option>`);
            $('#EditSubjectCode').html(options);
            checkLoaded();
        });
        $.get('/Class/GetYears', function (data) {
            let options = '<option value="">Select Year</option>';
            data.forEach(y => options += `<option value="${y.yearCode}">${y.yearName}</option>`);
            $('#EditYearCode').html(options);
            checkLoaded();
        });
    });

    $('#addClassModal').on('hidden.bs.modal', function () {
        setEditFieldRequired(true);
    });

    $('#hallsTable').on('click', '.delete-class-btn', function () {
        if (!confirm('Are you sure you want to delete this class?')) return;
        const cell = $(this).closest('.class-cell');
        const classCode = cell.data('classcode');
        if (!classCode) {
            alert('Class code is missing. Cannot delete this class.');
            return;
        }
        $.ajax({
            url: '/Class/DeleteClass',
            type: 'POST',
            data: { classCode },
            success: function (result) {
                if (result.success) {
                    if (currentBranchCode) fetchAndRender($('#chosenDateInput').val() || today, currentBranchCode);
                } else {
                    alert('Error deleting class: ' + (result.message || 'Unknown error'));
                }
            },
            error: function (xhr) {
                alert('Failed to delete class. Server returned ' + xhr.status);
            }
        });
    });

    function setEditFieldRequired(isRequired) {
        const fields = [
            '#EditClassName',
            '#EditTeacherCode',
            '#EditSubjectCode',
            '#EditYearCode',
            '#editClassStartTime',
            '#editClassEndTime'
        ];
        fields.forEach(sel => {
            if (isRequired) {
                $(sel).attr('required', 'required');
            } else {
                $(sel).removeAttr('required');
            }
        });
    }

    $('#editClassForm').on('submit', function (e) {
        e.preventDefault();
        const data = {
            ClassCode: $('#EditClassCode').val(),
            ClassName: $('#EditClassName').val(),
            TeacherCode: $('#EditTeacherCode').val(),
            SubjectCode: $('#EditSubjectCode').val(),
            YearCode: $('#EditYearCode').val(),
            ClassStartTime: $('#editClassStartTime').val(),
            ClassEndTime: $('#editClassEndTime').val()
        };
        $.post('/Class/EditClass', data, function (result) {
            if (result.success) {
                var modal = bootstrap.Modal.getInstance(document.getElementById('editClassModal'));
                modal.hide();
                if (currentBranchCode) fetchAndRender($('#chosenDateInput').val() || today, currentBranchCode);
            } else {
                alert('Error editing class');
            }
        });
    });
});