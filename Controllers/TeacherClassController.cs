using centrny1.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace centrny1.Controllers
{
    [Route("TeacherClass")]
    public class TeacherClassController : Controller
    {
        private readonly CenterContext _context;

        public TeacherClassController(CenterContext context)
        {
            _context = context;
        }

        [HttpGet("Teacher")]
        public IActionResult Teacher()
        {
            return View("~/Views/Class/Teacher.cshtml");
        }

        [HttpGet("GetTeachers")]
        public async Task<IActionResult> GetTeachers()
        {
            var teachers = await _context.Teachers
                .Select(t => new { t.TeacherCode, t.TeacherName })
                .ToListAsync();
            return Json(teachers);
        }

        [HttpGet("GetTeacherClassesGrid")]
        public async Task<IActionResult> GetTeacherClassesGrid(int teacherCode, string insertDate)
        {
            DateTime date;
            if (!DateTime.TryParse(insertDate, out date))
                date = DateTime.Today;

            var classes = await _context.Classes
                .Where(c => c.TeacherCode == teacherCode && c.InsertTime.Date == date.Date)
                .OrderBy(c => c.ClassStartTime)
                .Take(10)
                .ToListAsync();

            var subjects = await _context.Subjects.ToListAsync();
            var years = await _context.Years.ToListAsync();
            var branches = await _context.Branches.ToListAsync();
            var centers = await _context.Centers.ToListAsync();
            var halls = await _context.Halls.ToListAsync();

            var classItems = classes.Select(c => new
            {
                c.ClassName,
                c.ClassCode,
                SubjectName = subjects.FirstOrDefault(s => s.SubjectCode == c.SubjectCode)?.SubjectName ?? "",
                YearName = years.FirstOrDefault(y => y.YearCode == c.YearCode)?.YearName ?? "",
                BranchName = branches.FirstOrDefault(b => b.BranchCode == c.BranchCode)?.BranchName ?? "",
                CenterName = centers.FirstOrDefault(ce => ce.CenterCode == branches.FirstOrDefault(b => b.BranchCode == c.BranchCode)?.CenterCode)?.CenterName ?? "",
                HallName = halls.FirstOrDefault(h => h.HallCode == c.HallCode)?.HallName ?? "",
                StartTime = c.ClassStartTime.HasValue ? c.ClassStartTime.Value.ToString("HH:mm") : "",
                EndTime = c.ClassEndTime.HasValue ? c.ClassEndTime.Value.ToString("HH:mm") : "",
                TimeSpan = (c.ClassStartTime.HasValue && c.ClassEndTime.HasValue)
                    ? (c.ClassEndTime.Value - c.ClassStartTime.Value).ToString() : ""
            }).ToList();

            // Always 10 columns
            while (classItems.Count < 10)
                classItems.Add(null);

            return Json(classItems);
        }

        [HttpGet("GetSchedulesForDay")]
        public async Task<IActionResult> GetSchedulesForDay(int teacherCode, DateTime date)
        {
            var schedules = await (from s in _context.Schedules
                                   join y in _context.Years on s.YearCode equals y.YearCode into yrs
                                   from y in yrs.DefaultIfEmpty()
                                   join sub in _context.Subjects on s.SubjectCode equals sub.SubjectCode into subs
                                   from sub in subs.DefaultIfEmpty()
                                   join h in _context.Halls on s.HallCode equals h.HallCode into halls
                                   from h in halls.DefaultIfEmpty()
                                   where s.TeacherCode == teacherCode && s.StartTime.HasValue && s.StartTime.Value.Date == date.Date
                                   select new
                                   {
                                       scheduleCode = s.ScheduleCode,
                                       scheduleName = s.ScheduleName,
                                       yearCode = s.YearCode,
                                       yearName = y != null ? y.YearName : "",
                                       subjectCode = s.SubjectCode,
                                       subjectName = sub != null ? sub.SubjectName : "",
                                       hallCode = s.HallCode,
                                       hallName = h != null ? h.HallName : "",
                                       startTime = s.StartTime,
                                       endTime = s.EndTime
                                   }).ToListAsync();
            return Json(schedules);
        }

        [HttpPost("AddClassFromSchedule")]
        public async Task<IActionResult> AddClassFromSchedule([FromForm] int scheduleCode, [FromForm] int hallCode)
        {
            try
            {
                var schedule = await _context.Schedules.FirstOrDefaultAsync(s => s.ScheduleCode == scheduleCode);
                if (schedule == null)
                    return Json(new { success = false, message = "Schedule not found." });

                var classDate = schedule.StartTime?.Date ?? DateTime.Today;
                var startTime = schedule.StartTime.HasValue ? TimeOnly.FromDateTime(schedule.StartTime.Value) : (TimeOnly?)null;

                // === DUPLICATE CHECK ===
                var exists = await _context.Classes
                    .AnyAsync(c => c.ScheduleCode == scheduleCode && c.ClassStartTime == startTime && c.InsertTime.Date == classDate);
                if (exists)
                    return Json(new { success = false, message = "This class was already added for this schedule and time." });
                // =======================

                int teacherCode = schedule.TeacherCode ?? 0;
                var teacher = await _context.Teachers.FirstOrDefaultAsync(t => t.TeacherCode == teacherCode);
                int rootCode = teacher != null ? teacher.RootCode : 0;

                var endTime = schedule.EndTime.HasValue ? TimeOnly.FromDateTime(schedule.EndTime.Value) : (TimeOnly?)null;
                if (startTime == null || endTime == null)
                    return Json(new { success = false, message = "Class times missing." });

                int insertUserCode = schedule.InsertUser ?? 1;

                var newClass = new Class
                {
                    ClassName = schedule.ScheduleName,
                    HallCode = schedule.HallCode ?? hallCode,
                    TeacherCode = schedule.TeacherCode ?? 0,
                    EduYearCode = schedule.EduYearCode ?? 0,
                    SubjectCode = schedule.SubjectCode ?? 0,
                    YearCode = schedule.YearCode,
                    ScheduleCode = schedule.ScheduleCode,
                    NoOfStudents = 0,
                    TotalAmount = 0,
                    TeacherAmount = 0,
                    CenterAmount = 0,
                    BranchCode = schedule.HallCode.HasValue
                        ? _context.Halls.FirstOrDefault(h => h.HallCode == schedule.HallCode)?.BranchCode ?? 0
                        : 0,
                    RootCode = rootCode,
                    InsertUser = insertUserCode,
                    ClassStartTime = startTime,
                    ClassEndTime = endTime,
                    InsertTime = schedule.StartTime ?? DateTime.Now
                };

                _context.Classes.Add(newClass);
                await _context.SaveChangesAsync();

                return Json(new { success = true, classCode = newClass.ClassCode });
            }
            catch (Exception ex)
            {
                string errorMsg = ex.Message;
                if (ex.InnerException != null)
                    errorMsg += " | Inner: " + ex.InnerException.Message;
                return StatusCode(500, new { success = false, message = errorMsg, stack = ex.StackTrace });
            }
        }

        [HttpPost("DeleteClass")]
        public IActionResult DeleteClass(int classCode)
        {
            var classObj = _context.Classes.Find(classCode);
            if (classObj == null)
                return Json(new { success = false, message = "Class not found" });
            _context.Classes.Remove(classObj);
            _context.SaveChanges();
            return Json(new { success = true });
        }
    }
}