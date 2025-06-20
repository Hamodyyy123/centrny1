using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System;
using System.Collections.Generic;
using centrny1.Models;
using Microsoft.EntityFrameworkCore; // Needed for transaction support

namespace centrny1.Controllers
{
    public class StudentExamController : Controller
    {
        private readonly CenterContext db;

        public StudentExamController(CenterContext context)
        {
            db = context;
        }

        public IActionResult Index()
        {
            return View();
        }

        // GET: /StudentExam/GetStudentExams?studentCode=21
        [HttpGet]
        public JsonResult GetStudentExams(int studentCode)
        {
            try
            {
                var subjectCodes = db.Learns
                    .Where(l => l.StudentCode == studentCode)
                    .Select(l => l.SubjectCode)
                    .Distinct()
                    .ToList();

                var exams = db.Exams
                    .Where(e => subjectCodes.Contains(e.SubjectCode))
                    .Select(e => new
                    {
                        examCode = e.ExamCode,
                        examName = e.ExamName,
                        examTimer = e.ExamTimer,
                        // Add duration in minutes!
                        examDurationMinutes = e.ExamTimer.Hour * 60 + e.ExamTimer.Minute,
                        subjectCode = e.SubjectCode,
                        teacherCode = e.TeacherCode,
                        eduYearCode = e.EduYearCode,
                        studentExam = db.StudentExams
                            .Where(se => se.StudentCode == studentCode && se.ExamCode == e.ExamCode)
                            .Select(se => new { se.StudentResult, se.ExamDegree })
                            .FirstOrDefault()
                    })
                    .ToList()
                    .Select(e => new
                    {
                        examCode = e.examCode,
                        examName = e.examName,
                        examTimer = e.examTimer,
                        examDurationMinutes = e.examDurationMinutes, // New: send to frontend!
                        subjectCode = e.subjectCode,
                        teacherCode = e.teacherCode,
                        eduYearCode = e.eduYearCode,
                        alreadyTaken = e.studentExam != null,
                        degree = e.studentExam?.StudentResult ?? 0,
                        maxDegree = e.studentExam?.ExamDegree ?? 0
                    })
                    .ToList();

                return Json(exams);
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                var msg = ex.Message;
                if (ex.InnerException != null)
                    msg += " | Inner: " + ex.InnerException.Message;
                if (ex.InnerException?.InnerException != null)
                    msg += " | Inner2: " + ex.InnerException.InnerException.Message;
                return Json(new { message = msg });
            }
        }

        // GET: /StudentExam/GetExamQuestions?examCode=123
        [HttpGet]
        public JsonResult GetExamQuestions(int examCode)
        {
            try
            {
                var questions = db.ExamQuestions
                    .Where(eq => eq.ExamCode == examCode)
                    .Join(db.Questions,
                        eq => eq.QuestionCode,
                        q => q.QuestionCode,
                        (eq, q) => new
                        {
                            questionCode = q.QuestionCode,
                            questionText = q.QuestionContent,
                            degree = eq.QuestionDegree,
                            answers = db.Answers
                                .Where(a => a.QuestionCode == q.QuestionCode)
                                .Select(a => new
                                {
                                    answerCode = a.AnswerCode,
                                    answerText = a.AnswerContent
                                })
                                .ToList()
                        }
                    ).ToList();

                return Json(questions);
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;
                var msg = ex.Message;
                if (ex.InnerException != null)
                    msg += " | Inner: " + ex.InnerException.Message;
                if (ex.InnerException?.InnerException != null)
                    msg += " | Inner2: " + ex.InnerException.InnerException.Message;
                return Json(new { message = msg });
            }
        }

        // POST: /StudentExam/SubmitExam
        [HttpPost]
        public JsonResult SubmitExam([FromBody] ExamSubmission submission)
        {
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    // Prevent duplicate StudentExam records
                    var alreadyExamExists = db.StudentExams.Any(se => se.StudentCode == submission.StudentCode && se.ExamCode == submission.ExamCode);
                    if (alreadyExamExists)
                    {
                        Response.StatusCode = 400;
                        return Json(new { message = "You have already submitted this exam." });
                    }

                    // Check for duplicate answers in submission (same QuestionCode more than once)
                    var duplicateCheck = submission.Answers
                        .GroupBy(a => a.QuestionCode)
                        .Where(g => g.Count() > 1)
                        .Select(g => g.Key)
                        .ToList();
                    if (duplicateCheck.Any())
                    {
                        Response.StatusCode = 400;
                        return Json(new { message = "Duplicate answers for questions: " + string.Join(", ", duplicateCheck) });
                    }

                    // Prepare degree calculations and question lookups
                    var examQuestions = db.ExamQuestions
                        .Where(eq => eq.ExamCode == submission.ExamCode)
                        .ToList();

                    var questions = db.Questions
                        .Where(q => examQuestions.Select(eq => eq.QuestionCode).Contains(q.QuestionCode))
                        .ToList();

                    int totalDegree = examQuestions.Sum(eq => eq.QuestionDegree);
                    int studentDegree = 0;
                    int correctAnswers = 0;

                    // Insert StudentExam (trigger will create StudentAnswers)
                    StudentExam studExam = new StudentExam
                    {
                        StudentCode = submission.StudentCode,
                        ExamCode = submission.ExamCode,
                        ExamDegree = totalDegree,
                        StudentResult = 0, // Will be updated after answer evaluation
                        IsActive = true,
                        InsertUser = 1,
                        InsertTime = DateTime.Now
                    };
                    db.StudentExams.Add(studExam);
                    db.SaveChanges();

                    // Update StudentAnswers with student's selected answers and evaluate
                    foreach (var ans in submission.Answers)
                    {
                        int qCode = int.Parse(ans.QuestionCode);
                        int aCode = int.Parse(ans.AnswerCode);

                        var eq = examQuestions.FirstOrDefault(x => x.QuestionCode == qCode);
                        var q = questions.FirstOrDefault(x => x.QuestionCode == qCode);
                        if (eq == null || q == null) continue;

                        var correctAnswer = db.Answers.FirstOrDefault(a => a.QuestionCode == qCode && a.IsTrue);
                        bool isCorrect = (correctAnswer != null && correctAnswer.AnswerCode == aCode);

                        int questionDegree = eq.QuestionDegree;
                        int studentQDegree = isCorrect ? questionDegree : 0;
                        if (isCorrect) { studentDegree += questionDegree; correctAnswers++; }

                        var studentAnswerRow = db.StudentAnswers.FirstOrDefault(
                            sa => sa.StudentCode == submission.StudentCode
                                && sa.ExamCode == submission.ExamCode
                                && sa.QuestionCode == qCode
                        );

                        if (studentAnswerRow != null)
                        {
                            studentAnswerRow.StudentAnswerCode = aCode;
                            studentAnswerRow.StudentDegree = studentQDegree;
                            // Right_Answer_Code is set by trigger
                        }
                    }

                    // Update StudentResult in StudentExam
                    studExam.StudentResult = studentDegree;
                    db.SaveChanges();

                    transaction.Commit();

                    string percentMsg = "Exam submitted! Degree: " + studentDegree + "/" + totalDegree + ". Correct Answers: " + correctAnswers;
                    return Json(new { message = percentMsg });
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                    Response.StatusCode = 500;
                    var msg = ex.Message;
                    if (ex.InnerException != null)
                        msg += " | Inner: " + ex.InnerException.Message;
                    if (ex.InnerException?.InnerException != null)
                        msg += " | Inner2: " + ex.InnerException.InnerException.Message;
                    return Json(new { message = msg });
                }
            }
        }

        public class ExamSubmission
        {
            public int StudentCode { get; set; }
            public int ExamCode { get; set; }
            public List<AnswerObj> Answers { get; set; }
        }

        public class AnswerObj
        {
            public string QuestionCode { get; set; }
            public string AnswerCode { get; set; }
        }
    }
}