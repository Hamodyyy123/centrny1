using Microsoft.AspNetCore.Mvc;
using centrny1.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Text.Json;

namespace centrny1.Controllers
{
    public class QuestionController : Controller
    {
        private readonly CenterContext _context;

        public QuestionController(CenterContext context)
        {
            _context = context;
        }

        public IActionResult Index()
        {
            return View();
        }

        // --- SESSION-BASED USER RETRIEVAL HELPERS ---

        private int GetUserCode()
        {
            var userCodeStr = HttpContext.Session.GetString("UserCode");
            if (int.TryParse(userCodeStr, out int userCode) && userCode > 0)
                return userCode;

            var userJson = HttpContext.Session.GetString("User");
            if (!string.IsNullOrEmpty(userJson))
            {
                try
                {
                    var user = JsonSerializer.Deserialize<User>(userJson);
                    if (user != null)
                        return user.UserCode;
                }
                catch { }
            }
            return 0;
        }

        private int GetUserRootCode()
        {
            int userCode = GetUserCode();
            var user = _context.Users.FirstOrDefault(u => u.UserCode == userCode);
            if (user == null)
                return 0;
            var group = _context.Groups.FirstOrDefault(g => g.GroupCode == user.GroupCode);
            if (group == null)
                return 0;
            return group.RootCode;
        }

        private int GetUserGroupCode()
        {
            int userCode = GetUserCode();
            var user = _context.Users.FirstOrDefault(u => u.UserCode == userCode);
            if (user == null)
                return 0;
            return user.GroupCode;
        }

        // =========================
        // CHAPTERS, LESSONS, QUESTIONS
        // =========================

        [HttpGet]
        public JsonResult GetChaptersWithLessonsAndQuestions(int page = 1, int pageSize = 5)
        {
            var rootCode = GetUserRootCode();
            if (rootCode == 0)
                return Json(new { chapters = new List<object>(), totalCount = 0 });

            var query = _context.Lessons
                .Where(l => l.ChapterCode == null && l.RootCode == rootCode);

            int totalCount = query.Count();

            var chapters = query
                .OrderBy(l => l.LessonCode)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(chapter => new
                {
                    chapterName = chapter.LessonName,
                    chapterCode = chapter.LessonCode,
                    rootCode = chapter.RootCode,
                    yearCode = chapter.YearCode,
                    eduYearCode = chapter.EduYearCode,
                    teacherCode = chapter.TeacherCode,
                    subjectCode = chapter.SubjectCode,
                    lessons = _context.Lessons
                        .Where(l => l.ChapterCode == chapter.LessonCode && l.RootCode == rootCode)
                        .Select(l => new
                        {
                            lessonName = l.LessonName,
                            lessonCode = l.LessonCode,
                            questions = _context.Questions
                                .Where(q => q.LessonCode == l.LessonCode)
                                .Select(q => new
                                {
                                    questionCode = q.QuestionCode,
                                    questionContent = q.QuestionContent,
                                    examCode = q.ExamCode,
                                    lessonCode = q.LessonCode
                                }).ToList()
                        }).ToList()
                }).ToList();

            return Json(new { chapters, totalCount });
        }

        [HttpGet]
        public JsonResult GetAnswersByQuestion(int questionCode)
        {
            var answers = _context.Answers
                .Where(a => a.QuestionCode == questionCode)
                .Select(a => new
                {
                    answerCode = a.AnswerCode,
                    answerContent = a.AnswerContent,
                    isTrue = a.IsTrue,
                    questionCode = a.QuestionCode,
                    isActive = a.IsActive
                }).ToList();

            return Json(answers);
        }

        [HttpPost]
        public JsonResult AddAnswers([FromForm] List<string> AnswerContent, [FromForm] List<bool> IsTrue, [FromForm] int QuestionCode)
        {
            try
            {
                if (AnswerContent == null || IsTrue == null || AnswerContent.Count != IsTrue.Count)
                    return Json(new { success = false, message = "Invalid answer data." });

                int correctCount = IsTrue.Count(x => x);
                if (correctCount > 1)
                    return Json(new { success = false, message = "Only one correct answer is allowed per question." });

                bool alreadyCorrectInDb = _context.Answers.Any(a => a.QuestionCode == QuestionCode && a.IsTrue);
                if (alreadyCorrectInDb && correctCount > 0)
                    return Json(new { success = false, message = "A correct answer already exists. Only one correct answer is allowed per question." });

                for (int i = 0; i < AnswerContent.Count; i++)
                {
                    var ans = new Answer
                    {
                        AnswerContent = AnswerContent[i],
                        IsTrue = IsTrue[i],
                        QuestionCode = QuestionCode,
                        InsertUser = GetUserCode(),
                        InsertTime = DateTime.Now,
                        IsActive = true
                    };
                    _context.Answers.Add(ans);
                }
                _context.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public JsonResult EditAnswer(int AnswerCode, string AnswerContent, bool IsTrue)
        {
            try
            {
                var answer = _context.Answers.FirstOrDefault(a => a.AnswerCode == AnswerCode);
                if (answer == null)
                    return Json(new { success = false, message = "Answer not found." });

                if (IsTrue && !_context.Answers.Where(a => a.QuestionCode == answer.QuestionCode && a.AnswerCode != AnswerCode).All(a => !a.IsTrue))
                {
                    return Json(new { success = false, message = "Only one correct answer is allowed per question." });
                }

                answer.AnswerContent = AnswerContent;
                answer.IsTrue = IsTrue;
                answer.LastUpdateUser = GetUserCode();
                answer.LastUpdateTime = DateTime.Now;
                _context.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public JsonResult DeleteAnswer(int AnswerCode)
        {
            try
            {
                var answer = _context.Answers.FirstOrDefault(a => a.AnswerCode == AnswerCode);
                if (answer == null)
                    return Json(new { success = false, message = "Answer not found." });

                _context.Answers.Remove(answer);
                _context.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public JsonResult AddQuestion(string QuestionContent, int LessonCode, int? ExamCode)
        {
            try
            {
                var q = new Question
                {
                    QuestionContent = QuestionContent,
                    LessonCode = LessonCode,
                    ExamCode = ExamCode,
                    InsertUser = GetUserCode(),
                    InsertTime = DateTime.Now
                };
                _context.Questions.Add(q);
                _context.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public JsonResult EditQuestion(int QuestionCode, string QuestionContent, int LessonCode, int? ExamCode)
        {
            try
            {
                var question = _context.Questions.FirstOrDefault(x => x.QuestionCode == QuestionCode);
                if (question == null)
                    return Json(new { success = false, message = "Question not found." });

                question.QuestionContent = QuestionContent;
                question.LessonCode = LessonCode;
                question.ExamCode = ExamCode;
                question.LastUpdateUser = GetUserCode();
                question.LastUpdateTime = DateTime.Now;
                _context.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public JsonResult DeleteQuestion(int QuestionCode)
        {
            try
            {
                var question = _context.Questions.FirstOrDefault(x => x.QuestionCode == QuestionCode);
                if (question == null)
                    return Json(new { success = false, message = "Question not found." });
                _context.Questions.Remove(question);
                _context.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // =========================
        // CHAPTER (Add Chapter) -- NEW FUNCTIONALITY
        // =========================
        [HttpGet]
        public JsonResult GetEduYearsByRoot()
        {
            int rootCode = GetUserRootCode();

            var years = (from teach in _context.Teaches
                         join eduyear in _context.EduYears on teach.EduYearCode equals eduyear.EduCode
                         where teach.RootCode == rootCode
                         select new { teach.EduYearCode, eduyear.EduName })
                        .Distinct()
                        .OrderBy(y => y.EduYearCode)
                        .ToList();

            return Json(years.Select(y => new { eduYearCode = y.EduYearCode, eduYearName = y.EduName }));
        }

        [HttpGet]
        public JsonResult GetTeachersByRoot()
        {
            int rootCode = GetUserRootCode();
            var teachers = _context.Teaches
                .Where(t => t.RootCode == rootCode)
                .Select(t => t.TeacherCode)
                .Distinct()
                .ToList();
            var teacherList = teachers.Select(t => new {
                teacherCode = t,
                teacherName = _context.Teachers.FirstOrDefault(x => x.TeacherCode == t)?.TeacherName ?? "N/A"
            }).ToList();
            return Json(teacherList);
        }

        [HttpGet]
        public JsonResult GetSubjectsByTeacherYear(int teacherCode, int eduYearCode)
        {
            int rootCode = GetUserRootCode();
            var subjects = _context.Teaches
                .Where(t => t.TeacherCode == teacherCode && t.EduYearCode == eduYearCode && t.RootCode == rootCode)
                .Select(t => t.SubjectCode)
                .Distinct()
                .ToList();
            var subjectList = subjects.Select(s => new {
                subjectCode = s,
                subjectName = _context.Subjects.FirstOrDefault(x => x.SubjectCode == s)?.SubjectName ?? "N/A"
            }).ToList();
            return Json(subjectList);
        }

        [HttpGet]
        public JsonResult IsUserCenter()
        {
            int rootCode = GetUserRootCode();
            var root = _context.Roots.FirstOrDefault(r => r.RootCode == rootCode);
            return Json(new { isCenter = root != null && root.IsCenter });
        }

        [HttpPost]
        public JsonResult AddChapter(string LessonName, int EduYearCode, int TeacherCode, int SubjectCode)
        {
            try
            {
                int userCode = GetUserCode();
                int rootCode = GetUserRootCode();

                var teach = _context.Teaches.FirstOrDefault(t =>
                    t.TeacherCode == TeacherCode &&
                    t.EduYearCode == EduYearCode &&
                    t.SubjectCode == SubjectCode &&
                    t.RootCode == rootCode
                );

                if (teach == null)
                    return Json(new { success = false, message = "Matching Teach record not found." });

                var lesson = new Lesson
                {
                    LessonName = LessonName,
                    RootCode = rootCode,
                    EduYearCode = EduYearCode,
                    TeacherCode = TeacherCode,
                    SubjectCode = SubjectCode,
                    ChapterCode = null,
                    YearCode = teach.YearCode,
                    IsActive = true,
                    InsertUser = userCode,
                    InsertTime = DateTime.Now
                };

                _context.Lessons.Add(lesson);
                _context.SaveChanges();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public JsonResult AddLesson(string LessonName, int RootCode, int TeacherCode, int SubjectCode, int EduYearCode, int? ChapterCode, int? YearCode)
        {
            try
            {
                var lesson = new Lesson
                {
                    LessonName = LessonName,
                    RootCode = RootCode,
                    TeacherCode = TeacherCode,
                    SubjectCode = SubjectCode,
                    EduYearCode = EduYearCode,
                    ChapterCode = ChapterCode,
                    YearCode = YearCode,
                    IsActive = true,
                    InsertUser = GetUserCode(),
                    InsertTime = DateTime.Now
                };
                _context.Lessons.Add(lesson);
                _context.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        [HttpGet]
        public JsonResult SearchQuestions(string term)
        {
            int rootCode = GetUserRootCode();
            if (rootCode == 0 || string.IsNullOrWhiteSpace(term))
                return Json(new List<object>());

            var questions = (from q in _context.Questions
                             join l in _context.Lessons on q.LessonCode equals l.LessonCode
                             where q.QuestionContent.Contains(term) && l.RootCode == rootCode
                             select new
                             {
                                 questionCode = q.QuestionCode,
                                 questionContent = q.QuestionContent,
                                 lessonCode = q.LessonCode,
                                 lessonName = l.LessonName,
                                 examCode = q.ExamCode
                             }).ToList();

            return Json(questions);
        }

        // ---- For Info Box (User, Root, Teacher) ----
        [HttpGet]
        public JsonResult GetUserRootTeacherInfo()
        {
            int userCode = GetUserCode();
            int rootCode = GetUserRootCode();

            var teacher = _context.Teachers.FirstOrDefault(t => t.RootCode == rootCode);
            var teacherName = teacher != null ? teacher.TeacherName : "N/A";
            var root = _context.Roots.FirstOrDefault(r => r.RootCode == rootCode);

            return Json(new
            {
                userCode = userCode,
                rootCode = rootCode,
                teacherName = teacherName,
                isCenter = root != null && root.IsCenter
            });
        }
    }
}