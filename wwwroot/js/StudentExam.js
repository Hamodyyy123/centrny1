let studentCode = parseInt(document.getElementById('studentCodeInput').value) || 1;
let examDuration = 0;
let timerInterval;
let timeLeftSeconds = 0;
let currentExamCode = null;
let currentExamDurationMinutes = 0; // NEW: Store the duration in minutes for timer use

function showError(msg) {
    const errDiv = document.getElementById('examErrorMsg');
    if (errDiv) {
        errDiv.textContent = msg;
        errDiv.style.display = 'block';
    } else {
        alert(msg);
    }
}

function clearError() {
    const errDiv = document.getElementById('examErrorMsg');
    if (errDiv) {
        errDiv.textContent = '';
        errDiv.style.display = 'none';
    }
}

function loadStudentExams() {
    fetch('/StudentExam/GetStudentExams?studentCode=' + studentCode)
        .then(response => {
            if (!response.ok) throw new Error("Failed to load exams.");
            return response.json();
        })
        .then(data => {
            const tbody = document.querySelector("#examsTable tbody");
            tbody.innerHTML = "";
            if (!data || data.length === 0) {
                tbody.innerHTML = "<tr><td colspan='7'>No exams found for this student.</td></tr>";
                return;
            }
            data.forEach(exam => {
                const tr = document.createElement("tr");
                let actionCell = '';
                if (exam.alreadyTaken) {
                    actionCell = `<span class="badge bg-success" style="font-size:1em;">Degree: ${exam.degree} / ${exam.maxDegree}</span>`;
                } else {
                    // Pass both examCode and examDurationMinutes (not examTimer!) to attendExam
                    actionCell = `<button class="modern-btn exam-index-btn-primary" onclick="attendExam('${exam.examCode}', '${exam.examName}', ${exam.examDurationMinutes})">Attend Exam</button>`;
                }
                tr.innerHTML = `
                    <td>${exam.examCode}</td>
                    <td>${exam.examName}</td>
                    <td>${exam.examTimer ? exam.examTimer : ''}</td>
                    <td>${exam.subjectCode}</td>
                    <td>${exam.teacherCode}</td>
                    <td>${exam.eduYearCode}</td>
                    <td>
                        ${actionCell}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            // update label if exists
            const label = document.getElementById('currentStudentCodeLabel');
            if (label) label.textContent = `(Student Code: ${studentCode})`;
        })
        .catch(err => {
            showError(err.message);
            console.error(err);
        });
}

// Listen for student code input change to load exams for another student
document.addEventListener("DOMContentLoaded", function () {
    const codeInput = document.getElementById("studentCodeInput");
    if (codeInput) {
        codeInput.addEventListener("change", function () {
            studentCode = parseInt(codeInput.value) || 1;
            loadStudentExams();
        });
    }
    loadStudentExams();
});

// Accept duration in minutes directly!
window.attendExam = function (examCode, examName, examDurationMinutes) {
    clearError();
    currentExamCode = examCode;
    currentExamDurationMinutes = examDurationMinutes || 30; // fallback to 30 mins if missing
    document.getElementById('attendExamModal').style.display = 'flex';
    document.getElementById('examTitle').textContent = examName + " (Exam Code: " + examCode + ")";
    // Fetch questions and answers
    fetch(`/StudentExam/GetExamQuestions?examCode=${examCode}`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load questions.");
            return res.json();
        })
        .then(data => {
            renderQuestions(data);
        }).catch(err => {
            showError('Loading questions failed: ' + err.message);
        });
    // Set up exam timer (now using examDurationMinutes)
    examDuration = currentExamDurationMinutes;
    timeLeftSeconds = examDuration * 60;
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeftSeconds--;
        updateTimerDisplay();
        if (timeLeftSeconds <= 0) {
            clearInterval(timerInterval);
            submitExam();
        }
    }, 1000);
};

function renderQuestions(data) {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    if (!data || data.length === 0) {
        container.innerHTML = '<div>No questions found for this exam.</div>';
        return;
    }
    data.forEach((q, idx) => {
        const qDiv = document.createElement('div');
        qDiv.classList.add('mb-4', 'p-3');
        qDiv.style.border = '1.2px solid #e0e6ef';
        qDiv.style.borderRadius = '10px';
        qDiv.innerHTML = `
            <div style="font-weight:bold;margin-bottom:8px;">
                Q${idx + 1}: ${q.questionText}
                <span style="font-size:0.98em;color:#1976d2;margin-left:10px;">[Degree: ${q.degree}]</span>
            </div>
            <div>
                <table class="table table-bordered" style="margin-bottom:0;">
                    <thead>
                        <tr>
                            <th>Answer</th>
                            <th>Select</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(q.answers || []).map(ans => `
                            <tr>
                                <td>${ans.answerText}</td>
                                <td>
                                    <input type="radio" name="q_${q.questionCode}" value="${ans.answerCode}" required />
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(qDiv);
    });
}

// Timer UI
function updateTimerDisplay() {
    const disp = document.getElementById('examTimer');
    if (!disp) return;
    let min = Math.floor(timeLeftSeconds / 60);
    let sec = timeLeftSeconds % 60;
    disp.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    if (timeLeftSeconds <= 60) {
        disp.style.color = "#ff0000";
        disp.style.fontWeight = "bold";
        disp.style.background = "#fff3cd";
    } else {
        disp.style.color = "";
        disp.style.background = "";
    }
    if (timeLeftSeconds <= 0) {
        disp.textContent = "Time's up!";
    }
}

// Modal controls
document.getElementById('closeExamModal').onclick = function () {
    document.getElementById('attendExamModal').style.display = 'none';
    if (timerInterval) clearInterval(timerInterval);
    clearError();
};

document.getElementById('examForm').onsubmit = function (e) {
    e.preventDefault();
    submitExam();
};

function submitExam() {
    if (timerInterval) clearInterval(timerInterval);
    clearError();
    // Collect answers
    const qDivs = document.querySelectorAll('#questionsContainer > div');
    const answers = [];
    qDivs.forEach(div => {
        const radio = div.querySelector('input[type="radio"]:checked');
        if (radio) {
            const questionCode = radio.name.replace('q_', '');
            const answerCode = radio.value;
            answers.push({ questionCode, answerCode });
        }
    });

    fetch('/StudentExam/SubmitExam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentCode,
            examCode: currentExamCode,
            answers
        })
    })
        .then(async res => {
            let contentType = res.headers.get("content-type");
            if (!res.ok) {
                let errorMsg = "Unknown error";
                if (contentType && contentType.includes("application/json")) {
                    let errData = await res.json();
                    errorMsg = errData.message || JSON.stringify(errData);
                } else {
                    errorMsg = await res.text();
                }
                throw new Error(errorMsg);
            }
            return res.json();
        })
        .then(result => {
            alert(result.message || "Exam submitted!");
            document.getElementById('attendExamModal').style.display = 'none';
            loadStudentExams(); // reload in case of status update
        })
        .catch(err => {
            showError("Submission failed: " + err.message);
            console.error(err);
        });
}