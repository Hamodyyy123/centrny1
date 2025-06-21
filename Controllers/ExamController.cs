using centrny1.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

public class ExamStatsViewModel
{
    public int ExamCode { get; set; }
    public string ExamName { get; set; }
    public int NumberTookExam { get; set; }
    public int NumberDidNotTakeExam { get; set; }
}

public class ExamQuestionItem
{
    public int QuestionCode { get; set; }
    public int QuestionDegree { get; set; }
}

public class SetExamQuestionsModel
{
    public int ExamCode { get; set; }
    public int InsertUserCode { get; set; }
    public List<ExamQuestionItem> Questions { get; set; }
}

public class ExamController : Controller
{
    private CenterContext db = new CenterContext();

    private int GetSessionRootCode()
    {
        var rootCodeStr = HttpContext.Session.GetString("RootCode");
        int rootCode = 0;
        int.TryParse(rootCodeStr, out rootCode);
        return rootCode;
    }
    private bool IsSessionCenter()
    {
        return HttpContext.Session.GetString("IsCenter") == "true";
    }
    private int GetSessionUserCode()
    {
        var userCodeStr = HttpContext.Session.GetString("UserCode");
        int userCode = 0;
        int.TryParse(userCodeStr, out userCode);
        return userCode;
    }

    private TimeOnly ParseTimeOnly(string timeString)
    {
        if (string.IsNullOrWhiteSpace(timeString))
            throw new ArgumentException("Time string cannot be null or empty");
        timeString = timeString.Replace("ص", "").Replace("م", "").Trim();
        timeString = timeString.Replace("AM", "").Replace("PM", "").Replace("am", "").Replace("pm", "").Trim();
        if (TimeOnly.TryParse(timeString, out var timeOnly))
            return timeOnly;
        if (TimeSpan.TryParse(timeString, out var timeSpan))
            return new TimeOnly(timeSpan.Hours, timeSpan.Minutes);
        string[] formats = { "HH:mm", "H:mm", "hh:mm", "h:mm" };
        foreach (var format in formats)
            if (TimeOnly.TryParseExact(timeString, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out timeOnly))
                return timeOnly;
        throw new FormatException($"Unable to parse time string: '{timeString}'");
    }

    [HttpGet]
    public IActionResult GetCentersByRootCode()
    {
        int rootCode = GetSessionRootCode();
        var centers = db.Centers.Where(c => c.RootCode == rootCode)
            .Select(c => new { value = c.CenterCode, text = c.CenterName })
            .ToList();
        return Json(centers);
    }

    [HttpGet]
    public IActionResult GetBranchesByCenter(int centerCode)
    {
        var branches = db.Branches.Where(b => b.CenterCode == centerCode)
            .Select(b => new { value = b.BranchCode, text = b.BranchName })
            .ToList();
        return Json(branches);
    }

    [HttpGet]
    public IActionResult GetTeacherByRoot()
    {
        int rootCode = GetSessionRootCode();
        var teacher = db.Teachers.FirstOrDefault(t => t.RootCode == rootCode);
        if (teacher == null)
            return Json(null);
        return Json(new { value = teacher.TeacherCode, text = teacher.TeacherName });
    }

    [HttpGet]
    public IActionResult GetAllExams()
    {
        int rootCode = GetSessionRootCode();

        var exams = (from e in db.Exams
                     where e.IsActive == true
                     join edu in db.EduYears on e.EduYearCode equals edu.EduCode
                     join teacher in db.Teachers on e.TeacherCode equals teacher.TeacherCode
                     // Only exams where both the teacher and the eduyear belong to the current root
                     where edu.RootCode == rootCode && teacher.RootCode == rootCode
                     join subject in db.Subjects on e.SubjectCode equals subject.SubjectCode into subjectGroup
                     from subject in subjectGroup.DefaultIfEmpty()
                     join year in db.Years on e.YearCode equals year.YearCode into yearGroup
                     from year in yearGroup.DefaultIfEmpty()
                     join branch in db.Branches on e.BranchCode equals branch.BranchCode into branchGroup
                     from branch in branchGroup.DefaultIfEmpty()
                     select new
                     {
                         examCode = e.ExamCode,
                         examName = e.ExamName,
                         examDegree = e.ExamDegree,
                         averageMarks = db.StudentExams
                             .Where(se => se.ExamCode == e.ExamCode)
                             .Any()
                             ? (double)db.StudentExams.Where(se => se.ExamCode == e.ExamCode).Sum(se => se.StudentResult)
                                 / db.StudentExams.Where(se => se.ExamCode == e.ExamCode).Count()
                             : 0,
                         examPercentage = e.ExamSuccessPercent,
                         // Always provide exam duration as minutes
                         examTimer = e.ExamTimer.ToString(@"HH\:mm"),
                         examDurationMinutes = e.ExamTimer.Hour * 60 + e.ExamTimer.Minute,
                         isDone = e.IsDone,
                         isExam = e.IsExam,
                         isOnline = e.IsOnline,
                         teacherCode = e.TeacherCode,
                         teacherName = teacher.TeacherName,
                         subjectCode = e.SubjectCode,
                         subjectName = subject != null ? subject.SubjectName : "Unknown Subject",
                         branchCode = e.BranchCode,
                         branchName = branch != null ? branch.BranchName : "Unknown Branch",
                         yearCode = e.YearCode,
                         yearName = year != null ? year.YearName : "Unknown Year",
                         eduYearCode = e.EduYearCode,
                         eduYearName = edu.EduName,
                         insertUser = e.InsertUser,
                         insertTime = e.InserTime
                     }).ToList();

        return Json(exams);
    }

    [HttpGet]
    public IActionResult GetExam(int id)
    {
        var e = db.Exams.FirstOrDefault(x => x.ExamCode == id && x.IsActive == true);
        if (e == null)
            return NotFound();
        return Json(new
        {
            examCode = e.ExamCode,
            examName = e.ExamName,
            examDegree = e.ExamDegree,
            examResult = e.ExamAverageMark,
            examPercentage = e.ExamSuccessPercent,
            examTimer = e.ExamTimer.ToString(@"HH\:mm"),
            examDurationMinutes = e.ExamTimer.Hour * 60 + e.ExamTimer.Minute,
            isDone = e.IsDone,
            isExam = e.IsExam,
            isOnline = e.IsOnline,
            teacherCode = e.TeacherCode,
            subjectCode = e.SubjectCode,
            branchCode = e.BranchCode,
            yearCode = e.YearCode,
            eduYearCode = e.EduYearCode,
            insertUser = e.InsertUser,
            insertTime = e.InserTime
        });
    }

    [HttpGet]
    public IActionResult GetExamStats(int examCode)
    {
        var exam = db.Exams.FirstOrDefault(e => e.ExamCode == examCode && e.IsActive == true);
        if (exam == null)
            return Json(new { success = false, error = "Exam not found" });

        var eligibleStudentCodes = db.Learns
            .Where(l =>
                l.TeacherCode == exam.TeacherCode &&
                l.SubjectCode == exam.SubjectCode &&
                l.BranchCode == exam.BranchCode &&
                l.EduYearCode == exam.EduYearCode)
            .Select(l => l.StudentCode)
            .ToList();

        var studentsWhoTookExam = db.StudentExams
            .Where(se => se.ExamCode == exam.ExamCode && eligibleStudentCodes.Contains(se.StudentCode))
            .Select(se => se.StudentCode)
            .Distinct()
            .ToList();

        int tookExam = studentsWhoTookExam.Count;
        int didntTakeExam = eligibleStudentCodes.Count - tookExam;

        return Json(new
        {
            success = true,
            examCode = exam.ExamCode,
            examName = exam.ExamName,
            numberTookExam = tookExam,
            numberDidNotTakeExam = didntTakeExam
        });
    }

    [HttpPost]
    public IActionResult AddExam([FromBody] Exam exam)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(exam.ExamName))
                return BadRequest(new { success = false, error = "Exam Name is required." });
            if (exam.TeacherCode <= 0)
                return BadRequest(new { success = false, error = "Teacher must be set." });
            if (exam.SubjectCode <= 0)
                return BadRequest(new { success = false, error = "Subject must be selected." });
            if (exam.YearCode == null || exam.YearCode <= 0)
                return BadRequest(new { success = false, error = "Year must be selected." });
            if (exam.BranchCode <= 0)
                return BadRequest(new { success = false, error = "Branch must be selected." });

            string timerString = exam.ExamTimer.ToString();
            exam.ExamTimer = ParseTimeOnly(timerString);

            // Initial dummy value; will be set correctly in SetExamQuestions
            exam.ExamDegree = "1";
            exam.ExamAverageMark = "1";
            exam.ExamSuccessPercent = "1";
            exam.IsDone = false;
            exam.IsActive = true;
            exam.InsertUser = GetSessionUserCode();
            exam.InserTime = DateTime.Now;

            db.Exams.Add(exam);
            db.SaveChanges();
            return Json(new { success = true, examCode = exam.ExamCode });
        }
        catch (Exception ex)
        {
            string errorMsg = ex.Message;
            Exception inner = ex.InnerException;
            while (inner != null)
            {
                errorMsg = inner.Message;
                inner = inner.InnerException;
            }
            return StatusCode(500, new { success = false, error = errorMsg });
        }
    }

    [HttpPost]
    public IActionResult EditExam([FromBody] Exam exam)
    {
        try
        {
            if (exam.TeacherCode == 0)
                return BadRequest(new { success = false, error = "Teacher is required." });
            if (exam.SubjectCode == 0)
                return BadRequest(new { success = false, error = "Subject is required." });
            if (exam.YearCode == null || exam.YearCode == 0)
                return BadRequest(new { success = false, error = "Year is required." });
            if (exam.BranchCode == 0)
                return BadRequest(new { success = false, error = "Branch is required." });

            var dbExam = db.Exams.FirstOrDefault(e => e.ExamCode == exam.ExamCode && e.IsActive == true);
            if (dbExam == null)
                return NotFound(new { success = false, error = "Exam not found." });

            dbExam.ExamName = exam.ExamName;
            string timerString = exam.ExamTimer.ToString();
            dbExam.ExamTimer = ParseTimeOnly(timerString);
            dbExam.TeacherCode = exam.TeacherCode;
            dbExam.SubjectCode = exam.SubjectCode;
            dbExam.YearCode = exam.YearCode;
            dbExam.BranchCode = exam.BranchCode;
            dbExam.EduYearCode = exam.EduYearCode;
            dbExam.IsExam = exam.IsExam;
            dbExam.IsOnline = exam.IsOnline;
            dbExam.LastUpdateUser = GetSessionUserCode();
            dbExam.LastUpdateTime = DateTime.Now;
            db.SaveChanges();

            return Json(new { success = true });
        }
        catch (Exception ex)
        {
            string errorMsg = ex.Message;
            Exception inner = ex.InnerException;
            while (inner != null)
            {
                errorMsg = inner.Message;
                inner = inner.InnerException;
            }
            return StatusCode(500, new { success = false, error = errorMsg });
        }
    }

    [HttpPost]
    public IActionResult DeleteExam([FromBody] int examCode)
    {
        try
        {
            var exam = db.Exams.FirstOrDefault(e => e.ExamCode == examCode);
            if (exam == null)
                return Json(new { success = false, error = "Exam not found." });
            exam.IsActive = false;
            db.SaveChanges();
            return Json(new { success = true });
        }
        catch (Exception ex)
        {
            string errorMsg = ex.Message;
            Exception inner = ex.InnerException;
            while (inner != null)
            {
                errorMsg = inner.Message;
                inner = inner.InnerException;
            }
            return StatusCode(500, new { success = false, error = errorMsg });
        }
    }

    [HttpGet]
    public IActionResult GetEduYears(string rootCode)
    {
        int parsedRootCode;
        if (!int.TryParse(rootCode, out parsedRootCode))
        {
            return Json(new List<object>());
        }
        var eduYears = db.EduYears.Where(e => e.RootCode == parsedRootCode)
            .Select(e => new { value = e.EduCode, text = e.EduName })
            .ToList();
        return Json(eduYears);
    }

    [HttpGet]
    public IActionResult GetTeachersByEduYear(int eduYearCode)
    {
        var teacherCodes = db.Teaches.Where(t => t.EduYearCode == eduYearCode).Select(t => t.TeacherCode).Distinct().ToList();
        var teachers = db.Teachers.Where(t => teacherCodes.Contains(t.TeacherCode))
            .Select(t => new { value = t.TeacherCode, text = t.TeacherName })
            .ToList();
        return Json(teachers);
    }

    [HttpGet]
    public IActionResult GetSubjectsByTeacherAndEduYear(int teacherCode, int eduYearCode)
    {
        var subjectCodes = db.Teaches
            .Where(t => t.TeacherCode == teacherCode && t.EduYearCode == eduYearCode)
            .Select(t => t.SubjectCode)
            .Distinct()
            .ToList();
        var subjects = db.Subjects
            .Where(s => subjectCodes.Contains(s.SubjectCode))
            .Select(s => new { value = s.SubjectCode, text = s.SubjectName })
            .ToList();
        return Json(subjects);
    }

    [HttpGet]
    public IActionResult GetYearsByTeacherEduYearSubject(int teacherCode, int eduYearCode, int subjectCode)
    {
        var yearCodes = db.Teaches
            .Where(t => t.TeacherCode == teacherCode && t.EduYearCode == eduYearCode && t.SubjectCode == subjectCode)
            .Select(t => t.YearCode)
            .Distinct()
            .ToList();
        var years = db.Years
            .Where(y => yearCodes.Contains(y.YearCode))
            .Select(y => new { value = y.YearCode, text = y.YearName })
            .ToList();
        return Json(years);
    }

    [HttpGet]
    public IActionResult GetBranchesByAll(int teacherCode, int eduYearCode, int subjectCode, int yearCode)
    {
        var branchCodes = db.Teaches
            .Where(t => t.TeacherCode == teacherCode && t.EduYearCode == eduYearCode && t.SubjectCode == subjectCode && t.YearCode == yearCode)
            .Select(t => t.BranchCode)
            .Distinct()
            .ToList();
        var branches = db.Branches
            .Where(b => branchCodes.Contains(b.BranchCode))
            .Select(b => new { value = b.BranchCode, text = b.BranchName })
            .ToList();
        return Json(branches);
    }

    [HttpGet]
    public IActionResult GetExamQuestions(int examCode)
    {
        try
        {
            var exam = db.Exams.FirstOrDefault(e => e.ExamCode == examCode && e.IsActive == true);
            if (exam == null)
            {
                return Json(new { chosen = new object[0], available = new object[0], chosenFlat = new object[0], availableFlat = new object[0] });
            }
            var teacherLessons = db.Lessons
                .Where(l => l.TeacherCode == exam.TeacherCode)
                .Select(l => new {
                    l.LessonCode,
                    l.LessonName,
                    l.ChapterCode,
                    l.TeacherCode
                })
                .ToList();
            var lessonCodes = teacherLessons.Select(l => l.LessonCode).ToList();
            var chapters = teacherLessons
                .Where(l => l.ChapterCode == null)
                .ToDictionary(l => l.LessonCode, l => l.LessonName ?? "Unnamed Chapter");
            var chosen = (from eq in db.ExamQuestions
                          join q in db.Questions on eq.QuestionCode equals q.QuestionCode
                          join lesson in db.Lessons on q.LessonCode equals lesson.LessonCode into lessonGroup
                          from lesson in lessonGroup.DefaultIfEmpty()
                          where eq.ExamCode == examCode && eq.IsActive == true
                          select new
                          {
                              QuestionCode = q.QuestionCode,
                              QuestionContent = q.QuestionContent,
                              QuestionDegree = eq.QuestionDegree,
                              LessonCode = lesson != null ? lesson.LessonCode : 0,
                              LessonName = lesson != null ? lesson.LessonName : "Unknown Lesson",
                              ChapterCode = lesson != null ? lesson.ChapterCode : null,
                              ChapterName = lesson != null && lesson.ChapterCode != null && chapters.ContainsKey(lesson.ChapterCode.Value)
                                            ? chapters[lesson.ChapterCode.Value]
                                            : "Unknown Chapter"
                          }).ToList();
            var chosenCodes = chosen.Select(q => q.QuestionCode).ToList();
            var availableData = (from q in db.Questions
                                 join lesson in db.Lessons on q.LessonCode equals lesson.LessonCode into lessonGroup
                                 from lesson in lessonGroup.DefaultIfEmpty()
                                 where lessonCodes.Contains(q.LessonCode ?? 0) && !chosenCodes.Contains(q.QuestionCode)
                                 select new
                                 {
                                     QuestionCode = q.QuestionCode,
                                     QuestionContent = q.QuestionContent,
                                     LessonCode = lesson != null ? lesson.LessonCode : 0,
                                     LessonName = lesson != null ? lesson.LessonName : "Unknown Lesson",
                                     ChapterCode = lesson != null ? lesson.ChapterCode : null,
                                     ChapterName = lesson != null && lesson.ChapterCode != null && chapters.ContainsKey(lesson.ChapterCode.Value)
                                                   ? chapters[lesson.ChapterCode.Value]
                                                   : "Unknown Chapter"
                                 }).ToList();
            return Json(new
            {
                chosen = chosen,
                available = availableData,
                chosenFlat = chosen,
                availableFlat = availableData
            });
        }
        catch
        {
            return Json(new { chosen = new object[0], available = new object[0], chosenFlat = new object[0], availableFlat = new object[0] });
        }
    }

    [HttpPost]
    public IActionResult SetExamQuestions([FromBody] SetExamQuestionsModel model)
    {
        try
        {
            if (model == null || model.Questions == null || model.Questions.Count == 0)
                return Json(new { success = false, error = "Please select at least one question." });

            int examCode = model.ExamCode;
            int insertUserCode = model.InsertUserCode;
            var questions = model.Questions;

            var existingQuestions = db.ExamQuestions.Where(eq => eq.ExamCode == examCode).ToList();
            if (existingQuestions.Any())
                db.ExamQuestions.RemoveRange(existingQuestions);

            int totalDegree = 0;
            foreach (var q in questions)
            {
                db.ExamQuestions.Add(new ExamQuestion
                {
                    ExamCode = examCode,
                    QuestionCode = q.QuestionCode,
                    QuestionDegree = q.QuestionDegree,
                    IsActive = true,
                    InsertUser = insertUserCode,
                    InsertTime = DateTime.Now
                });
                totalDegree += q.QuestionDegree;
            }

            var exam = db.Exams.FirstOrDefault(e => e.ExamCode == examCode);
            if (exam != null)
            {
                // Make sure to always update ExamDegree to the correct sum
                exam.ExamDegree = totalDegree.ToString();
                exam.LastUpdateUser = insertUserCode;
                exam.LastUpdateTime = DateTime.Now;
            }
            db.SaveChanges();

            // NEW: Sync Student_Exam.Exam_Degree for all students of this exam from the Exam table
            SyncAllStudentExamDegrees(examCode);

            return Json(new
            {
                success = true,
                message = $"Successfully saved {questions.Count} questions with total degree {totalDegree}",
                totalQuestions = questions.Count,
                totalDegree = totalDegree
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    // Helper: Update all Student_Exam.Exam_Degree for a given exam
    private void SyncAllStudentExamDegrees(int examCode)
    {
        var exam = db.Exams.FirstOrDefault(e => e.ExamCode == examCode);
        if (exam == null) return;
        var studentExams = db.StudentExams.Where(se => se.ExamCode == examCode).ToList();
        foreach (var studentExam in studentExams)
        {
            // Convert the string ExamDegree to an integer before assigning it to the nullable int property  
            if (int.TryParse(exam.ExamDegree, out int parsedDegree))
            {
                studentExam.ExamDegree = parsedDegree;
            }
            else
            {
                studentExam.ExamDegree = null; // Handle invalid conversion gracefully  
            }
        }
        db.SaveChanges();
    }

    // ========= SEARCH QUESTIONS FOR ADD QUESTIONS MODAL =========
    [HttpGet]
    public IActionResult SearchQuestions(string term)
    {
        int rootCode = GetSessionRootCode();
        if (string.IsNullOrWhiteSpace(term)) return Json(new List<object>());

        var query = from q in db.Questions
                    join lesson in db.Lessons on q.LessonCode equals lesson.LessonCode
                    where lesson.RootCode == rootCode
                       && q.QuestionContent.Contains(term)
                    select new
                    {
                        questionCode = q.QuestionCode,
                        questionContent = q.QuestionContent,
                        lessonName = lesson.LessonName,
                        lessonCode = lesson.LessonCode
                    };

        return Json(query.Take(50).ToList());
    }

    public IActionResult Index()
    {
        ViewData["IsCenter"] = IsSessionCenter() ? "true" : "false";
        ViewData["RootCode"] = GetSessionRootCode();
        return View();
    }
}