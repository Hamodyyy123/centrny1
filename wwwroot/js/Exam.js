$(function () {
    // =============================
    // Exam Modal Logic
    // =============================

    // ----- Modal and Form Variables -----
    var $addModal = $('#examModal');
    var addModal = new bootstrap.Modal($addModal[0]);
    var $form = $('#examForm');

    var $editModal = $('#editExamModal');
    var editModal = new bootstrap.Modal($editModal[0]);
    var $editForm = $('#editExamForm');
    var editingExamId = null;

    // ----- Utility Functions -----
    function isCenterUser() {
        return window.isCenterUser === true || window.isCenterUser === "true";
    }

    function fetchAndPopulateCenters($centerDropdown, callback) {
        $centerDropdown.empty().append($('<option>').val('').text('-- Select Center --'));
        $.get('/Exam/GetCentersByRootCode', function (centers) {
            centers.forEach(function (c) {
                $centerDropdown.append($('<option>').val(c.value).text(c.text));
            });
            if (callback) callback();
        });
    }

    function fetchAndPopulateBranches($branchDropdown, centerCode) {
        $branchDropdown.empty().append($('<option>').val('').text('-- Select Branch --'));
        if (!centerCode) return;
        $.get('/Exam/GetBranchesByCenter?centerCode=' + centerCode, function (branches) {
            branches.forEach(function (b) {
                $branchDropdown.append($('<option>').val(b.value).text(b.text));
            });
        });
    }

    function fetchAndDisplayTeacher($teacherContainer) {
        $.get('/Exam/GetTeacherByRoot', function (teacher) {
            if (teacher && teacher.value) {
                $teacherContainer.html(`<div class="alert alert-info mb-3"><strong>Teacher:</strong> ${teacher.text}</div>`);
                $('#AddExamTeacherCode').val(teacher.value);
            } else {
                $teacherContainer.html('<div class="alert alert-warning mb-3">No teacher found for this root.</div>');
                $('#AddExamTeacherCode').val('');
            }
        });
    }

    function populateSelect($select, data, selectedValue) {
        $select.empty();
        $select.append($('<option>').val('').text('-- Select --'));
        data.forEach(function (item) {
            $select.append($('<option>').val(item.value).text(item.text));
        });
        if (selectedValue !== undefined && selectedValue !== null && selectedValue !== '' && selectedValue !== 0 && selectedValue !== '0') {
            $select.val(selectedValue);
        } else {
            $select.val('');
        }
    }

    function displayError(msg) {
        var $errorDiv = $('#examError');
        $errorDiv.text(msg).show();
    }

    function displayEditError(msg) {
        var $errorDiv = $('#editExamError');
        $errorDiv.text(msg).show();
    }

    function loadEduYears(selected) {
        $.get('/Exam/GetEduYears?rootCode=' + window.rootCode, function (data) {
            var $eduYear = $('#EduYearCode');
            $eduYear.empty();
            $eduYear.append($('<option>').val('').text('-- Select Educational Year --'));
            data.forEach(function (item) {
                $eduYear.append($('<option>').val(item.value).text(item.text));
            });
            if (selected) {
                $eduYear.val(selected);
            } else {
                $eduYear.val('');
            }
        });
    }

    // =============================
    // Exam Stats Logic (NEW)
    // =============================

    function loadExamStats(examCode) {
        // Show loading spinner
        $('#examStatsContent').html('<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>');
        $('#examStatsModal').modal('show');
        $.get('/Exam/GetExamStats?examCode=' + examCode, function (res) {
            if (res.success) {
                $('#examStatsContent').html(
                    `<div class="alert alert-info mb-0">
                    <b>Stats for: ${res.examName}</b><br>
                    <b>Took Exam:</b> ${res.numberTookExam}<br>
                    <b>Did NOT Take Exam:</b> ${res.numberDidNotTakeExam}
                </div>`
                );
            } else {
                $('#examStatsContent').html('<div class="alert alert-warning mb-0">' + (res.error || 'Error loading stats') + '</div>');
            }
        });
    }

    // =============================
    // Exams Table Logic
    // =============================

    function loadExams() {
        $.get('/Exam/GetAllExams', function (data) {
            var isCenter = isCenterUser();

            // For root users, get teacher name from first exam (since all have the same teacher)
            if (!isCenter && data.length > 0) {
                var teacherName = data[0].teacherName || '';
                $('#exam-for-teacher').show().html(
                    `<strong>Exams for: </strong><span class="text-primary">${teacherName}</span>`
                );
            } else {
                $('#exam-for-teacher').hide();
            }

            var html = '<table class="table exam-index-table align-middle mb-0">';
            html += '<thead><tr>';
            html += '<th>Code</th><th>Name</th><th>Degree</th><th>Average Marks</th><th>Percent</th><th>Timer (hh:mm)</th><th>EduYear</th>';
            if (isCenter) html += '<th>Teacher</th>';
            html += '<th>Year</th><th>Subject</th><th>Branch</th><th>Done</th><th>Exam</th><th>Online</th><th>Action</th>';
            html += '</tr></thead><tbody>';

            data.forEach(function (exam) {
                html += `<tr>
                    <td>${exam.examCode ?? ''}</td>
                    <td>${exam.examName ?? ''}</td>
                    <td>${exam.examDegree ?? ''}</td>
          <td>${exam.averageMarks !== undefined ? exam.averageMarks.toFixed(2) : ''}</td>
                    <td>${exam.examPercentage ?? ''}</td>
                    <td>${exam.examTimer ?? ''}</td>
                    <td>${exam.eduYearName ?? ''}</td>`;
                if (isCenter) html += `<td>${exam.teacherName ?? ''}</td>`;
                html += `<td>${exam.yearName ?? ''}</td>
                    <td>${exam.subjectName ?? ''}</td>
                    <td>${exam.branchName ?? ''}</td>
                    <td>${exam.isDone ? 'Yes' : 'No'}</td>
                    <td>${exam.isExam ? 'Yes' : 'No'}</td>
                    <td>${exam.isOnline ? 'Yes' : 'No'}</td>
                    <td>
                        <div class="d-flex flex-column gap-1">
                            <button class="btn exam-index-btn-questions btn-sm shadow-sm mb-1 add-questions" data-id="${exam.examCode}" title="Add Questions">
                                <i class="bi bi-list-check"></i> Add Questions
                            </button>
                            <button class="btn exam-index-btn-edit btn-sm shadow-sm mb-1 edit-exam" data-id="${exam.examCode}" title="Edit">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn exam-index-btn-delete btn-sm shadow-sm mb-1 delete-exam" data-id="${exam.examCode}" title="Delete">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                            <button class="btn btn-info btn-sm mb-1 view-exam-stats" data-id="${exam.examCode}" title="View Exam Stats">
                                <i class="bi bi-bar-chart-line"></i> Stats
                            </button>
                        </div>
                    </td>
                </tr>`;
            });
            html += '</tbody></table>';
            $('#exam-details').html(html);
        });
    }

    // Show stats when clicking the stats button
    $('#exam-details').on('click', '.view-exam-stats', function () {
        var examCode = $(this).data('id');
        loadExamStats(examCode);
    });

    // =============================
    // Dependent Dropdowns for Add Exam
    // =============================

    $form.on('change', '[name="EduYearCode"]', function () {
        var eduYearCode = $(this).val();
        var isCenter = isCenterUser();

        $form.find('[name="SubjectCode"]').empty().append($('<option>').val('').text('-- Select --'));
        $form.find('[name="YearCode"]').empty().append($('<option>').val('').text('-- Select --'));

        if (!eduYearCode) return;

        if (isCenter) {
            var $teacher = $form.find('[name="TeacherCode"]');
            $teacher.empty();
            $teacher.append($('<option>').val('').text('-- Select --'));
            $.get('/Exam/GetTeachersByEduYear?eduYearCode=' + eduYearCode, function (data) {
                data.forEach(function (item) {
                    $teacher.append($('<option>').val(item.value).text(item.text));
                });
                $teacher.prop('disabled', false);
                $teacher.trigger('change');
            });
        } else {
            var teacherCode = $('#AddExamTeacherCode').val();
            if (!teacherCode) return;
            $.get('/Exam/GetSubjectsByTeacherAndEduYear?teacherCode=' + teacherCode + '&eduYearCode=' + eduYearCode, function (data) {
                var $subject = $form.find('[name="SubjectCode"]');
                $subject.empty().append($('<option>').val('').text('-- Select --'));
                data.forEach(function (item) {
                    $subject.append($('<option>').val(item.value).text(item.text));
                });
                $subject.prop('disabled', false);
                $subject.trigger('change');
            });
        }
    });

    $form.on('change', '[name="TeacherCode"]', function () {
        var eduYearCode = $form.find('[name="EduYearCode"]').val();
        var teacherCode = $(this).val();
        var $subject = $form.find('[name="SubjectCode"]');
        $subject.empty().append($('<option>').val('').text('-- Select --'));
        $form.find('[name="YearCode"]').empty().append($('<option>').val('').text('-- Select --'));
        if (!teacherCode) return;
        $.get('/Exam/GetSubjectsByTeacherAndEduYear?teacherCode=' + teacherCode + '&eduYearCode=' + eduYearCode, function (data) {
            data.forEach(function (item) {
                $subject.append($('<option>').val(item.value).text(item.text));
            });
            $subject.prop('disabled', false);
            $subject.trigger('change');
        });
    });

    $form.on('change', '[name="SubjectCode"]', function () {
        var eduYearCode = $form.find('[name="EduYearCode"]').val();
        var isCenter = isCenterUser();
        var teacherCode = isCenter ? $form.find('[name="TeacherCode"]').val() : $('#AddExamTeacherCode').val();
        var subjectCode = $(this).val();
        var $year = $form.find('[name="YearCode"]');
        $year.empty().append($('<option>').val('').text('-- Select --'));
        if (!subjectCode) return;
        $.get('/Exam/GetYearsByTeacherEduYearSubject?teacherCode=' + teacherCode + '&eduYearCode=' + eduYearCode + '&subjectCode=' + subjectCode, function (data) {
            data.forEach(function (item) {
                $year.append($('<option>').val(item.value).text(item.text));
            });
            $year.prop('disabled', false);
            $year.trigger('change');
        });
    });

    $form.on('change', '[name="YearCode"]', function () {
        var eduYearCode = $form.find('[name="EduYearCode"]').val();
        var isCenter = isCenterUser();
        var teacherCode = isCenter ? $form.find('[name="TeacherCode"]').val() : $('#AddExamTeacherCode').val();
        var subjectCode = $form.find('[name="SubjectCode"]').val();
        var yearCode = $(this).val();

        if (isCenter) {
            var $branch = $('#BranchCode');
            $branch.empty().append($('<option>').val('').text('-- Select --'));
            if (!yearCode) return;
            $.get('/Exam/GetBranchesByAll?teacherCode=' + teacherCode + '&eduYearCode=' + eduYearCode + '&subjectCode=' + subjectCode + '&yearCode=' + yearCode, function (data) {
                data.forEach(function (item) {
                    $branch.append($('<option>').val(item.value).text(item.text));
                });
                $branch.prop('disabled', false);
            });
        }
    });

    // =============================
    // Add Exam Modal Handler
    // =============================
    $('#addExamBtn').on('click', function () {
        var isCenter = isCenterUser();
        $('#examError').hide();
        var $form = $('#examForm');
        $form[0].reset();

        $form.find('select').val('').empty().append($('<option>').val('').text('-- Select --'));

        $('#teacherDropdownGroup').hide();
        $('#teacherDisplayGroup').hide();
        $('#centerDropdownGroup').hide();
        $('#branchDropdownGroup').hide();
        $('#rootBranchDropdownGroup').hide();

        if (isCenter) {
            $('#teacherDropdownGroup').show();
            $('#branchDropdownGroup').show();
        } else {
            $('#teacherDisplayGroup').show();
            $('#centerDropdownGroup').show();
            $('#rootBranchDropdownGroup').show();
            fetchAndDisplayTeacher($('#teacherDisplayContainer'));
            fetchAndPopulateCenters($('#AddExamCenterCode'));
            $('#AddExamBranchCode').empty().append($('<option>').val('').text('-- Select Branch --'));
        }

        loadEduYears();

        $('#examModalLabel').text('Add Exam');
        addModal.show();
    });

    $('#AddExamCenterCode').on('change', function () {
        var centerCode = $(this).val();
        fetchAndPopulateBranches($('#AddExamBranchCode'), centerCode);
    });

    // =============================
    // Add Exam Submit Handler
    // =============================
    $('#examForm').on('submit', function (e) {
        e.preventDefault();
        $('#examError').hide();

        var isCenter = isCenterUser();
        var branchVal = isCenter ? $('#BranchCode').val() : $('#AddExamBranchCode').val();

        var data = {
            ExamName: $('#ExamName').val(),
            ExamTimer: $('#ExamTimer').val(),
            ExamDegree: "0",
            ExamResult: "0",
            ExamPercentage: "0",
            IsExam: $('#IsExam').is(':checked'),
            IsOnline: $('#IsOnline').is(':checked'),
            TeacherCode: isCenter ? $('#TeacherCode').val() : $('#AddExamTeacherCode').val(),
            CenterCode: isCenter ? null : $('#AddExamCenterCode').val(),
            BranchCode: branchVal,
            YearCode: $('#YearCode').val(),
            SubjectCode: $('#SubjectCode').val(),
            EduYearCode: $('#EduYearCode').val()
        };

        if (!isCenter) {
            if (!data.TeacherCode) {
                $('#examError').text('No teacher found for your root.').show();
                return;
            }
            if (!data.CenterCode) {
                $('#examError').text('Please select a center.').show();
                return;
            }
            if (!data.BranchCode) {
                $('#examError').text('Please select a branch.').show();
                return;
            }
        } else {
            if (!data.BranchCode) {
                $('#examError').text('Please select a branch.').show();
                return;
            }
        }

        $.ajax({
            url: '/Exam/AddExam',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function (res) {
                if (res.success) {
                    addModal.hide();
                    loadExams();
                } else {
                    $('#examError').text(res.error || 'Error adding exam').show();
                }
            },
            error: function (xhr) {
                var err = "Unknown error";
                if (xhr.responseJSON && xhr.responseJSON.error)
                    err = xhr.responseJSON.error;
                else if (xhr.responseText)
                    try { err = JSON.parse(xhr.responseText).error; } catch (e) { }
                $('#examError').text(err).show();
            }
        });
    });
    // =============================
    // Edit Exam Logic
    // =============================

    // Reference to the edit form and modal (update selectors if needed)
    var $editForm = $('#editExamForm');
    var editModal = new bootstrap.Modal(document.getElementById('editExamModal'));
    var editingExamId = null;

    // Open edit modal and load exam data
    $('#exam-details').on('click', '.edit-exam', function () {
        editingExamId = $(this).data('id');
        $editForm[0].reset();
        $('#editExamError').hide();
        $.get('/Exam/GetExam?id=' + editingExamId, function (exam) {
            // Set form fields
            $editForm.find('[name="ExamCode"]').val(exam.examCode);
            $editForm.find('[name="ExamName"]').val(exam.examName);
            $editForm.find('[name="ExamTimer"]').val(exam.examTimer);
            $editForm.find('[name="IsExam"]').prop('checked', exam.isExam);
            $editForm.find('[name="IsOnline"]').prop('checked', exam.isOnline);

            // Set hidden fields for required codes
            $editForm.find('[name="TeacherCode"]').val(exam.teacherCode);
            $editForm.find('[name="SubjectCode"]').val(exam.subjectCode);
            $editForm.find('[name="YearCode"]').val(exam.yearCode);
            $editForm.find('[name="BranchCode"]').val(exam.branchCode);
            $editForm.find('[name="EduYearCode"]').val(exam.eduYearCode);

            $('#editExamModalLabel').text('Edit Exam');
            editModal.show();
        });
    });

    // Handle edit form submit
    $editForm.on('submit', function (e) {
        e.preventDefault();
        $('#editExamError').hide();

        // Build data object, converting codes to numbers
        var data = {
            ExamCode: $editForm.find('[name="ExamCode"]').val(),
            ExamName: $editForm.find('[name="ExamName"]').val(),
            ExamTimer: $editForm.find('[name="ExamTimer"]').val(),
            IsExam: $editForm.find('[name="IsExam"]').is(':checked'),
            IsOnline: $editForm.find('[name="IsOnline"]').is(':checked'),
            TeacherCode: Number($editForm.find('[name="TeacherCode"]').val()),
            SubjectCode: Number($editForm.find('[name="SubjectCode"]').val()),
            YearCode: Number($editForm.find('[name="YearCode"]').val()),
            BranchCode: Number($editForm.find('[name="BranchCode"]').val()),
            EduYearCode: Number($editForm.find('[name="EduYearCode"]').val())
        };

        $.ajax({
            url: '/Exam/EditExam',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function (res) {
                if (res.success) {
                    editModal.hide();
                    loadExams();
                } else {
                    $('#editExamError').text(res.error || 'Error updating exam').show();
                }
            },
            error: function (xhr) {
                var err = "Unknown error";
                if (xhr.responseJSON && xhr.responseJSON.error)
                    err = xhr.responseJSON.error;
                else if (xhr.responseText)
                    try { err = JSON.parse(xhr.responseText).error; } catch (e) { }
                $('#editExamError').text(err).show();
            }
        });
    });

    // Delete exam logic (no change)
    $('#exam-details').on('click', '.delete-exam', function () {
        var id = $(this).data('id');
        if (!confirm('Delete this exam?')) return;
        $.ajax({
            url: '/Exam/DeleteExam',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(id),
            success: function (res) {
                if (res.success) {
                    loadExams();
                } else {
                    $('#examError').text(res.error || 'Error deleting exam').show();
                }
            },
            error: function (xhr) {
                var err = "Unknown error";
                if (xhr.responseJSON && xhr.responseJSON.error)
                    err = xhr.responseJSON.error;
                else if (xhr.responseText)
                    try { err = JSON.parse(xhr.responseText).error; } catch (e) { }
                $('#examError').text(err).show();
            }
        });
    });

    // =============================
    // Questions Management System
    // =============================
    var chosenQuestions = [];
    var availableQuestions = [];
    var currentExamCode = null;
    var drake = null;
    var availableCurrentPage = 1;
    var chosenCurrentPage = 1;
    var itemsPerPage = 10;
    var availableGroupedData = [];
    var chosenGroupedData = [];
    var chapterExpanded = {};
    var lessonExpanded = {};

    $('#exam-details').on('click', '.add-questions', function () {
        var examCode = $(this).data('id');
        currentExamCode = examCode;
        $('#questionsExamCode').val(examCode);
        availableCurrentPage = 1;
        chosenCurrentPage = 1;
        chosenQuestions = [];
        availableQuestions = [];
        availableGroupedData = [];
        chosenGroupedData = [];
        chapterExpanded = {};
        lessonExpanded = {};
        $.get(`/Exam/GetExamQuestions?examCode=${examCode}`, function (data) {
            if (data.chosenFlat && Array.isArray(data.chosenFlat)) {
                data.chosenFlat.forEach(function (q) {
                    chosenQuestions.push({
                        questionCode: q.questionCode,
                        questionContent: q.questionContent,
                        questionDegree: q.questionDegree || 1,
                        lessonCode: q.lessonCode,
                        lessonName: q.lessonName,
                        chapterCode: q.chapterCode,
                        chapterName: q.chapterName
                    });
                });
            }
            if (data.availableFlat && Array.isArray(data.availableFlat)) {
                data.availableFlat.forEach(function (q) {
                    availableQuestions.push({
                        questionCode: q.questionCode,
                        questionContent: q.questionContent,
                        lessonCode: q.lessonCode,
                        lessonName: q.lessonName,
                        chapterCode: q.chapterCode,
                        chapterName: q.chapterName
                    });
                });
            }
            rebuildGroupedData();
            renderQuestionsLists();
            var questionsModal = new bootstrap.Modal(document.getElementById('questionsModal'));
            questionsModal.show();
        });
    });

    function groupQuestionsByChapterLesson(questionsList) {
        if (!questionsList || !Array.isArray(questionsList)) return [];
        var grouped = {};
        questionsList.forEach(function (question) {
            var chapterCode = question.chapterCode || 0;
            var lessonCode = question.lessonCode;
            if (!grouped[chapterCode]) {
                grouped[chapterCode] = {
                    chapterCode: chapterCode,
                    chapterName: question.chapterName || `Chapter ${chapterCode}`,
                    lessons: {}
                };
            }
            if (!grouped[chapterCode].lessons[lessonCode]) {
                grouped[chapterCode].lessons[lessonCode] = {
                    lessonCode: lessonCode,
                    lessonName: question.lessonName || `Lesson ${lessonCode}`,
                    questions: []
                };
            }
            grouped[chapterCode].lessons[lessonCode].questions.push({
                questionCode: question.questionCode,
                questionContent: question.questionContent,
                questionDegree: question.questionDegree
            });
        });
        var result = [];
        Object.keys(grouped).forEach(function (chapterCode) {
            var chapter = grouped[chapterCode];
            var lessonsArray = [];
            Object.keys(chapter.lessons).forEach(function (lessonCode) {
                lessonsArray.push(chapter.lessons[lessonCode]);
            });
            result.push({
                chapterCode: chapter.chapterCode,
                chapterName: chapter.chapterName,
                lessons: lessonsArray
            });
        });
        return result;
    }

    function flattenGroupedData(groupedData) {
        var flattened = [];
        if (!groupedData || !Array.isArray(groupedData)) return flattened;
        groupedData.forEach(function (chapter) {
            flattened.push({
                type: 'chapter',
                chapterCode: chapter.chapterCode,
                chapterName: chapter.chapterName,
                id: 'chapter-' + chapter.chapterCode
            });
            if (chapter.lessons && Array.isArray(chapter.lessons)) {
                chapter.lessons.forEach(function (lesson) {
                    flattened.push({
                        type: 'lesson',
                        lessonCode: lesson.lessonCode,
                        lessonName: lesson.lessonName,
                        chapterCode: chapter.chapterCode,
                        id: 'lesson-' + lesson.lessonCode
                    });
                    if (lesson.questions && Array.isArray(lesson.questions)) {
                        lesson.questions.forEach(function (question) {
                            flattened.push({
                                type: 'question',
                                questionCode: question.questionCode,
                                questionContent: question.questionContent,
                                questionDegree: question.questionDegree,
                                lessonCode: lesson.lessonCode,
                                chapterCode: chapter.chapterCode,
                                id: 'question-' + question.questionCode
                            });
                        });
                    }
                });
            }
        });
        return flattened;
    }

    function paginateArray(array, page, itemsPerPage) {
        var offset = (page - 1) * itemsPerPage;
        return array.slice(offset, offset + itemsPerPage);
    }

    function getTotalPages(array, itemsPerPage) {
        return Math.max(1, Math.ceil(array.length / itemsPerPage));
    }

    function createPaginationControls(containerId, currentPage, totalPages, onPageChange) {
        var container = $(`#${containerId}`);
        container.empty();
        if (totalPages <= 1) return;
        var pagination = $('<nav><ul class="pagination pagination-sm justify-content-center"></ul></nav>');
        var ul = pagination.find('ul');
        var prevDisabled = currentPage === 1 ? 'disabled' : '';
        ul.append(`<li class="page-item ${prevDisabled}"><a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a></li>`);
        var startPage = Math.max(1, currentPage - 2);
        var endPage = Math.min(totalPages, currentPage + 2);
        if (startPage > 1) {
            ul.append('<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>');
            if (startPage > 2) {
                ul.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
        }
        for (var i = startPage; i <= endPage; i++) {
            var active = i === currentPage ? 'active' : '';
            ul.append(`<li class="page-item ${active}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`);
        }
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                ul.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
            }
            ul.append(`<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`);
        }
        var nextDisabled = currentPage === totalPages ? 'disabled' : '';
        ul.append(`<li class="page-item ${nextDisabled}"><a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`);
        container.append(pagination);
        container.find('a.page-link').on('click', function (e) {
            e.preventDefault();
            var page = parseInt($(this).data('page'));
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
                onPageChange(page);
            }
        });
    }

    function rebuildGroupedData() {
        availableGroupedData = groupQuestionsByChapterLesson(availableQuestions);
        chosenGroupedData = groupQuestionsByChapterLesson(chosenQuestions);
    }

    function renderQuestionsLists() {
        var availableFlattened = flattenGroupedData(availableGroupedData);
        var chosenFlattened = flattenGroupedData(chosenGroupedData);

        var availablePaginated = paginateArray(availableFlattened, availableCurrentPage, itemsPerPage);
        var chosenPaginated = paginateArray(chosenFlattened, chosenCurrentPage, itemsPerPage);

        var $available = $('#availableQuestions').empty();
        availablePaginated.forEach(function (item) {
            if (item.type === 'chapter') {
                var expanded = chapterExpanded['available-' + item.chapterCode] !== false;
                $available.append(`
                    <li class="list-group-item bg-primary text-white fw-bold chapter-header" data-chapter="${item.chapterCode}" data-list="available" style="cursor: pointer;">
                        <i class="bi bi-chevron-${expanded ? "down" : "right"} chapter-arrow me-2"></i>
                        <i class="bi bi-book me-2"></i>${item.chapterName}
                    </li>
                `);
            } else if (item.type === 'lesson') {
                var expanded = lessonExpanded['available-' + item.lessonCode] !== false;
                $available.append(`
                    <li class="list-group-item bg-light fw-semibold ps-4 lesson-header" data-lesson="${item.lessonCode}" data-chapter="${item.chapterCode}" data-list="available" style="cursor: pointer;">
                        <i class="bi bi-chevron-${expanded ? "down" : "right"} lesson-arrow me-2"></i>
                        <i class="bi bi-journal-text me-2"></i>${item.lessonName}
                    </li>
                `);
            } else if (item.type === 'question') {
                var show = (chapterExpanded['available-' + item.chapterCode] !== false) &&
                    (lessonExpanded['available-' + item.lessonCode] !== false);
                $available.append(`
                    <li class="list-group-item ps-5 question-item" data-id="${item.questionCode}" data-chapter="${item.chapterCode}" data-lesson="${item.lessonCode}" style="${show ? "" : "display:none;"}">
                        ${item.questionContent}
                    </li>
                `);
            }
        });

        var $chosen = $('#chosenQuestions').empty();
        chosenPaginated.forEach(function (item) {
            if (item.type === 'chapter') {
                var expanded = chapterExpanded['chosen-' + item.chapterCode] !== false;
                $chosen.append(`
                    <li class="list-group-item bg-success text-white fw-bold chapter-header" data-chapter="${item.chapterCode}" data-list="chosen" style="cursor: pointer;">
                        <i class="bi bi-chevron-${expanded ? "down" : "right"} chapter-arrow me-2"></i>
                        <i class="bi bi-book me-2"></i>${item.chapterName}
                    </li>
                `);
            } else if (item.type === 'lesson') {
                var expanded = lessonExpanded['chosen-' + item.lessonCode] !== false;
                $chosen.append(`
                    <li class="list-group-item bg-light fw-semibold ps-4 lesson-header" data-lesson="${item.lessonCode}" data-chapter="${item.chapterCode}" data-list="chosen" style="cursor: pointer;">
                        <i class="bi bi-chevron-${expanded ? "down" : "right"} lesson-arrow me-2"></i>
                        <i class="bi bi-journal-text me-2"></i>${item.lessonName}
                    </li>
                `);
            } else if (item.type === 'question') {
                var show = (chapterExpanded['chosen-' + item.chapterCode] !== false) &&
                    (lessonExpanded['chosen-' + item.lessonCode] !== false);
                $chosen.append(`
                    <li class="list-group-item ps-5 d-flex align-items-center question-item" data-id="${item.questionCode}" data-chapter="${item.chapterCode}" data-lesson="${item.lessonCode}" style="${show ? "" : "display:none;"}">
                        <span class="flex-grow-1">${item.questionContent}</span>
                        <input type="number" class="form-control form-control-sm ms-2 question-degree" style="width:90px" placeholder="Degree" value="${item.questionDegree || 1}" min="1" required>
                    </li>
                `);
            }
        });

        var availableTotalPages = getTotalPages(availableFlattened, itemsPerPage);
        var chosenTotalPages = getTotalPages(chosenFlattened, itemsPerPage);

        createPaginationControls('availablePaginationTop', availableCurrentPage, availableTotalPages, function (page) {
            availableCurrentPage = page;
            renderQuestionsLists();
            $('#availableQuestions').parent().scrollTop(0);
        });
        createPaginationControls('availablePagination', availableCurrentPage, availableTotalPages, function (page) {
            availableCurrentPage = page;
            renderQuestionsLists();
            $('#availableQuestions').parent().scrollTop(0);
        });
        createPaginationControls('chosenPaginationTop', chosenCurrentPage, chosenTotalPages, function (page) {
            chosenCurrentPage = page;
            renderQuestionsLists();
            $('#chosenQuestions').parent().scrollTop(0);
        });
        createPaginationControls('chosenPagination', chosenCurrentPage, chosenTotalPages, function (page) {
            chosenCurrentPage = page;
            renderQuestionsLists();
            $('#chosenQuestions').parent().scrollTop(0);
        });

        $('#availableInfo').text(`Available Questions: ${availableQuestions.length} (Page ${availableCurrentPage} of ${availableTotalPages})`);
        $('#chosenInfo').text(`Chosen Questions: ${chosenQuestions.length} (Page ${chosenCurrentPage} of ${chosenTotalPages})`);

        if (drake && drake.destroy) drake.destroy();
        drake = dragula([document.getElementById('chosenQuestions'), document.getElementById('availableQuestions')], {
            accepts: function (el, target, source, sibling) {
                return $(el).hasClass('question-item');
            }
        });
        drake.on('drop', function (el, target, source) {
            var questionCode = parseInt($(el).data('id'));
            if (!target || !source || target === source) return;
            if (target.id === "chosenQuestions" && source.id === "availableQuestions") {
                var questionIndex = availableQuestions.findIndex(q => q.questionCode === questionCode);
                if (questionIndex !== -1) {
                    var question = availableQuestions.splice(questionIndex, 1)[0];
                    question.questionDegree = 1;
                    chosenQuestions.push(question);
                    rebuildGroupedData();
                    renderQuestionsLists();
                }
            } else if (target.id === "availableQuestions" && source.id === "chosenQuestions") {
                var questionIndex = chosenQuestions.findIndex(q => q.questionCode === questionCode);
                if (questionIndex !== -1) {
                    var question = chosenQuestions.splice(questionIndex, 1)[0];
                    delete question.questionDegree;
                    availableQuestions.push(question);
                    rebuildGroupedData();
                    renderQuestionsLists();
                }
            }
        });

        $('#availableQuestions').parent().scrollTop(0);
        $('#chosenQuestions').parent().scrollTop(0);
    }

    $(document).on('click', '.chapter-header', function () {
        var chapterCode = $(this).data('chapter');
        var whichList = $(this).data('list');
        var key = whichList + '-' + chapterCode;
        chapterExpanded[key] = !(chapterExpanded[key] !== false);
        renderQuestionsLists();
    });

    $(document).on('click', '.lesson-header', function () {
        var lessonCode = $(this).data('lesson');
        var whichList = $(this).data('list');
        var key = whichList + '-' + lessonCode;
        lessonExpanded[key] = !(lessonExpanded[key] !== false);
        renderQuestionsLists();
    });

    $(document).on('input change blur', '.question-degree', function () {
        var $input = $(this);
        var questionCode = parseInt($input.closest('li').data('id'));
        var degree = parseInt($input.val()) || 1;
        if (degree < 1) {
            degree = 1;
            $input.val(degree);
        }
        var questionIndex = chosenQuestions.findIndex(q => q.questionCode === questionCode);
        if (questionIndex !== -1) {
            chosenQuestions[questionIndex].questionDegree = degree;
        }
    });

    $('#questionsForm').on('submit', function (e) {
        e.preventDefault();
        $('#chosenQuestions .question-item').each(function () {
            var questionCode = parseInt($(this).data('id'));
            var degree = parseInt($(this).find('.question-degree').val()) || 1;
            var q = chosenQuestions.find(x => x.questionCode === questionCode);
            if (q) q.questionDegree = degree;
        });

        if (!chosenQuestions.length) {
            alert('Please select at least one question for the exam.');
            return;
        }
        var examCode = parseInt($('#questionsExamCode').val());
        var submitData = {
            ExamCode: examCode,
            InsertUserCode: 1,
            Questions: chosenQuestions.map(q => ({
                QuestionCode: q.questionCode,
                QuestionDegree: q.questionDegree || 1
            }))
        };
        $.ajax({
            url: '/Exam/SetExamQuestions',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(submitData),
            success: function (res) {
                if (res.success) {
                    alert(res.message || 'Questions saved successfully!');
                    bootstrap.Modal.getInstance(document.getElementById('questionsModal')).hide();
                    loadExams();
                } else {
                    alert('Error: ' + (res.error || 'Update failed'));
                }
            },
            error: function (xhr) {
                alert('Error saving questions: ' + (xhr.responseJSON?.error || 'Unknown error'));
            }
        });
    });

    // =============================
    // Initialization
    // =============================
    loadExams();
});