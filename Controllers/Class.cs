using centrny1.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq; // for JObject

namespace centrny1.Controllers
{
    [Route("Class")]
    public class ClassController : Controller
    {
        private readonly CenterContext _context;

        public ClassController(CenterContext context)
        {
            _context = context;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            return View();
        }

        [HttpGet("GetHallsWithClassGrid")]
        public async Task<IActionResult> GetHallsWithClassGrid(DateTime? insertDate, int? branchCode, int? rootCode)
        {
            if (!branchCode.HasValue)
            {
                return Json(new object[0]);
            }

            // Filter halls by branch and root code
            var hallsQuery = _context.Halls.AsQueryable();
            hallsQuery = hallsQuery.Where(h => h.BranchCode == branchCode);
            if (rootCode.HasValue)
            {
                hallsQuery = hallsQuery.Where(h => h.RootCode == rootCode.Value);
            }

            var halls = await hallsQuery
                .Select(h => new
                {
                    hallName = h.HallName,
                    hallCode = h.HallCode
                })
                .ToListAsync();

            var date = insertDate?.Date ?? DateTime.Today;

            var classes = await _context.Classes
                .Where(c => (!insertDate.HasValue || c.InsertTime.Date == date)
                            && c.BranchCode == branchCode)
                .ToListAsync();

            var reservations = await _context.Reservations
                .Where(r => r.RTime == DateOnly.FromDateTime(date)
                            && r.BranchCode == branchCode)
                .ToListAsync();

            var teachers = await _context.Teachers.ToListAsync();
            var subjects = await _context.Subjects.ToListAsync();
            var years = await _context.Years.ToListAsync();

            var data = halls.Select(hall =>
            {
                var classItems = classes
                    .Where(c => c.HallCode == hall.hallCode)
                    .Select(c => new
                    {
                        type = "class",
                        classCode = c.ClassCode,
                        className = c.ClassName,
                        teacherName = teachers.FirstOrDefault(t => t.TeacherCode == c.TeacherCode)?.TeacherName ?? "",
                        subjectName = subjects.FirstOrDefault(s => s.SubjectCode == c.SubjectCode)?.SubjectName ?? "",
                        yearName = years.FirstOrDefault(y => y.YearCode == c.YearCode)?.YearName ?? "",
                        classStartTime = c.ClassStartTime.HasValue ? c.ClassStartTime.Value.ToString("HH:mm") : "",
                        classEndTime = c.ClassEndTime.HasValue ? c.ClassEndTime.Value.ToString("HH:mm") : "",
                        startTimeSort = c.ClassStartTime.HasValue ? c.ClassStartTime.Value.ToTimeSpan() : TimeSpan.MaxValue
                    });

                var reservationItems = reservations
                    .Where(r => r.HallCode == hall.hallCode)
                    .Select(r => new
                    {
                        type = "reservation",
                        reservationCode = r.ReservationCode,
                        teacherName = teachers.FirstOrDefault(t => t.TeacherCode == r.TeacherCode)?.TeacherName ?? "",
                        capacity = r.Capacity,
                        description = r.Description,
                        cost = r.Cost,
                        deposit = r.Deposit,
                        period = r.Period,
                        reservationTime = r.RTime.ToString("yyyy-MM-dd"),
                        reservationStartTime = r.ReservationStartTime.HasValue ? r.ReservationStartTime.Value.ToString("HH:mm") : "",
                        reservationEndTime = r.ReservationEndTime.HasValue ? r.ReservationEndTime.Value.ToString("HH:mm") : "",
                        finalCost = r.FinalCost,
                        startTimeSort = r.ReservationStartTime.HasValue ? r.ReservationStartTime.Value.ToTimeSpan() : TimeSpan.MaxValue
                    });

                var merged = classItems.Cast<object>().Concat(reservationItems.Cast<object>())
                    .OrderBy(x => (TimeSpan)x.GetType().GetProperty("startTimeSort").GetValue(x))
                    .Take(10)
                    .ToList();

                return new
                {
                    hall.hallName,
                    hall.hallCode,
                    slots = merged
                };
            }).ToList();

            return Json(data);
        }
        [HttpGet("GetHallsByBranch")]
        public async Task<IActionResult> GetHallsByBranch(int branchCode)
        {
            var halls = await _context.Halls
                .Where(h => h.BranchCode == branchCode)
                .Select(h => new { h.HallCode, h.HallName })
                .ToListAsync();
            return Json(halls);
        }

        [HttpGet("GetRootCodes")]
        public async Task<IActionResult> GetRootCodes()
        {
            var roots = await _context.Roots
                .Select(r => new { r.RootCode, r.RootName })
                .ToListAsync();
            return Json(roots);
        }

        [HttpGet("GetBranchCodes")]
        public async Task<IActionResult> GetBranchCodes(int? rootCode)
        {
            var query = _context.Branches.AsQueryable();
            if (rootCode.HasValue)
                query = query.Where(b => b.RootCode == rootCode.Value);

            var branches = await query
                .Select(b => new { b.BranchCode, b.BranchName })
                .ToListAsync();
            return Json(branches);
        }

        [HttpGet("GetScheduleCodes")]
        public async Task<IActionResult> GetScheduleCodes()
        {
            var schedules = await _context.Schedules
                .Select(s => new { s.ScheduleCode, s.ScheduleName })
                .ToListAsync();
            return Json(schedules);
        }

        [HttpGet("GetSchedulesForDay")]
        public async Task<IActionResult> GetSchedulesForDay(DateTime? date, int? rootCode)
        {
            if (!rootCode.HasValue || !date.HasValue)
                return Json(new object[0]);

            var schedules = await (from s in _context.Schedules
                                   join h in _context.Halls on s.HallCode equals h.HallCode
                                   join b in _context.Branches on h.BranchCode equals b.BranchCode
                                   where b.RootCode == rootCode.Value
                                         && s.StartTime.HasValue
                                         && s.StartTime.Value.Date == date.Value.Date
                                   select new
                                   {
                                       s.ScheduleCode,
                                       s.ScheduleName,
                                       s.HallCode,
                                       s.TeacherCode,
                                       s.EduYearCode,
                                       s.SubjectCode,
                                       s.YearCode,
                                       s.InsertUser,
                                       s.StartTime,
                                       s.EndTime
                                   }).ToListAsync();

            return Json(schedules);
        }

        [HttpGet("GetTeachers")]
        public async Task<IActionResult> GetTeachers()
        {
            var teachers = await _context.Teachers
                .Select(t => new { t.TeacherCode, t.TeacherName, t.IsStaff })
                .ToListAsync();
            return Json(teachers);
        }

        [HttpGet("GetSubjects")]
        public async Task<IActionResult> GetSubjects()
        {
            var subjects = await _context.Subjects
                .Select(s => new { s.SubjectCode, s.SubjectName })
                .ToListAsync();
            return Json(subjects);
        }

        [HttpGet("GetYears")]
        public async Task<IActionResult> GetYears()
        {
            var years = await _context.Years
                .Select(y => new { y.YearCode, y.YearName })
                .ToListAsync();
            return Json(years);
        }

        [HttpGet("GetEduYears")]
        public async Task<IActionResult> GetEduYears()
        {
            var eduyears = await _context.EduYears
                .Select(e => new { e.EduCode, e.EduName })
                .ToListAsync();
            return Json(eduyears);
        }

        [HttpPost("AddClassFromSchedule")]
        public async Task<IActionResult> AddClassFromSchedule([FromForm] int scheduleCode, [FromForm] int hallCode)
        {
            try
            {
                var schedule = await _context.Schedules.FirstOrDefaultAsync(s => s.ScheduleCode == scheduleCode);
                if (schedule == null)
                    return Json(new { success = false, message = "Schedule not found." });

                var hall = await _context.Halls.FirstOrDefaultAsync(h => h.HallCode == hallCode);
                if (hall == null)
                    return Json(new { success = false, message = "Hall not found." });

                var classDate = schedule.StartTime?.Date ?? DateTime.Today;
                var startTime = schedule.StartTime.HasValue ? TimeOnly.FromDateTime(schedule.StartTime.Value) : (TimeOnly?)null;
                var endTime = schedule.EndTime.HasValue ? TimeOnly.FromDateTime(schedule.EndTime.Value) : (TimeOnly?)null;
                if (startTime == null || endTime == null)
                    return Json(new { success = false, message = "Class times missing." });

                // --- Double-booking prevention ---
                if (await HasHallConflict(hallCode, classDate, startTime.Value, endTime.Value))
                    return Json(new { success = false, message = "Hall is not available for this time slot." });
                // --- End double-booking prevention ---

                int rootCode = 1;
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
                    BranchCode = hall.BranchCode,
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

        [HttpPost("AddClass")]
        public async Task<IActionResult> AddClass([FromForm] Class model, [FromForm] string ClassStartTime, [FromForm] string ClassEndTime)
        {
            if (!string.IsNullOrEmpty(ClassStartTime))
                model.ClassStartTime = TimeOnly.Parse(ClassStartTime);
            else
                model.ClassStartTime = null;

            if (!string.IsNullOrEmpty(ClassEndTime))
                model.ClassEndTime = TimeOnly.Parse(ClassEndTime);
            else
                model.ClassEndTime = null;

            if (model.BranchCode == 0)
            {
                return StatusCode(400, new { success = false, message = "BranchCode must be provided." });
            }

            // --- Double-booking prevention ---
            if (model.ClassStartTime.HasValue && model.ClassEndTime.HasValue)
            {
                var date = model.InsertTime.Date;
                var startTime = model.ClassStartTime.Value;
                var endTime = model.ClassEndTime.Value;
                if (await HasHallConflict(model.HallCode, date, startTime, endTime))
                    return Json(new { success = false, message = "Hall is not available for this time slot." });
            }
            // --- End double-booking prevention ---

            _context.Classes.Add(model);
            await _context.SaveChangesAsync();
            return Json(new { success = true, classCode = model.ClassCode });
        }

        [HttpPost("EditClass")]
        public async Task<IActionResult> EditClass(
            [FromForm] int ClassCode,
            [FromForm] string ClassName,
            [FromForm] int? TeacherCode,
            [FromForm] int? SubjectCode,
            [FromForm] int? YearCode,
            [FromForm] string ClassStartTime,
            [FromForm] string ClassEndTime)
        {
            var classObj = await _context.Classes.FindAsync(ClassCode);
            if (classObj == null)
                return Json(new { success = false, message = "Class not found" });

            if (!string.IsNullOrWhiteSpace(ClassName)) classObj.ClassName = ClassName;
            if (TeacherCode.HasValue) classObj.TeacherCode = TeacherCode.Value;
            if (SubjectCode.HasValue) classObj.SubjectCode = SubjectCode.Value;
            if (YearCode.HasValue) classObj.YearCode = YearCode.Value;
            if (!string.IsNullOrEmpty(ClassStartTime)) classObj.ClassStartTime = TimeOnly.Parse(ClassStartTime);
            if (!string.IsNullOrEmpty(ClassEndTime)) classObj.ClassEndTime = TimeOnly.Parse(ClassEndTime);

            await _context.SaveChangesAsync();
            return Json(new { success = true });
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

        [HttpPost("AddReservation")]
        public async Task<IActionResult> AddReservation(
            [FromForm] int HallCode,
            [FromForm] int TeacherCode,
            [FromForm] int Capacity,
            [FromForm] string Description,
            [FromForm] decimal Cost,
            [FromForm] string ReservationStartTime,
            [FromForm] string ReservationEndTime,
            [FromForm] int Deposit,
            [FromForm] string RTime,
            [FromForm] int? FinalCost,
            [FromForm] int BranchCode
        )
        {
            try
            {
                TimeOnly? startTime = !string.IsNullOrWhiteSpace(ReservationStartTime) ? TimeOnly.Parse(ReservationStartTime) : (TimeOnly?)null;
                TimeOnly? endTime = !string.IsNullOrWhiteSpace(ReservationEndTime) ? TimeOnly.Parse(ReservationEndTime) : (TimeOnly?)null;
                var date = !string.IsNullOrWhiteSpace(RTime) ? DateOnly.Parse(RTime).ToDateTime(TimeOnly.MinValue).Date : DateTime.Today;

                // --- Double-booking prevention ---
                if (startTime.HasValue && endTime.HasValue)
                {
                    if (await HasHallConflict(HallCode, date, startTime.Value, endTime.Value))
                        return Json(new { success = false, message = "Hall is not available for this time slot." });
                }
                // --- End double-booking prevention ---

                var reservation = new Reservation
                {
                    HallCode = HallCode,
                    TeacherCode = TeacherCode,
                    Capacity = Capacity,
                    Description = Description ?? "",
                    Cost = Cost,
                    Deposit = Deposit,
                    FinalCost = FinalCost,
                    BranchCode = BranchCode,
                    ReservationStartTime = startTime,
                    ReservationEndTime = endTime,
                    RTime = !string.IsNullOrWhiteSpace(RTime)
                        ? DateOnly.Parse(RTime)
                        : DateOnly.FromDateTime(DateTime.Now)
                };

                if (reservation.ReservationStartTime.HasValue && reservation.ReservationEndTime.HasValue)
                {
                    var period = reservation.ReservationEndTime.Value - reservation.ReservationStartTime.Value;
                    if (period < TimeSpan.Zero)
                        period += TimeSpan.FromDays(1);
                    reservation.Period = (decimal)period.TotalHours;
                }
                else
                {
                    reservation.Period = 0;
                }

                _context.Reservations.Add(reservation);
                await _context.SaveChangesAsync();

                return Json(new { success = true, reservationCode = reservation.ReservationCode });
            }
            catch (Exception ex)
            {
                var errorMsg = ex.Message;
                if (ex.InnerException != null)
                    errorMsg += " | Inner: " + ex.InnerException.Message;
                return StatusCode(500, new { success = false, message = errorMsg });
            }
        }

        [HttpPost("EditReservation")]
        public async Task<IActionResult> EditReservation(
            [FromForm] int ReservationCode,
            [FromForm] int TeacherCode,
            [FromForm] int Capacity,
            [FromForm] string Description,
            [FromForm] decimal Cost,
            [FromForm] string ReservationStartTime,
            [FromForm] string ReservationEndTime,
            [FromForm] int Deposit,
            [FromForm] string RTime,
            [FromForm] int? FinalCost
        )
        {
            try
            {
                var reservation = await _context.Reservations.FindAsync(ReservationCode);
                if (reservation == null)
                    return Json(new { success = false, message = "Reservation not found" });

                reservation.TeacherCode = TeacherCode;
                reservation.Capacity = Capacity;
                reservation.Description = Description ?? "";
                reservation.Cost = Cost;
                reservation.Deposit = Deposit;
                reservation.FinalCost = FinalCost;

                if (!string.IsNullOrWhiteSpace(ReservationStartTime))
                    reservation.ReservationStartTime = TimeOnly.Parse(ReservationStartTime);
                if (!string.IsNullOrWhiteSpace(ReservationEndTime))
                    reservation.ReservationEndTime = TimeOnly.Parse(ReservationEndTime);

                if (!string.IsNullOrWhiteSpace(RTime))
                    reservation.RTime = DateOnly.Parse(RTime);

                if (reservation.ReservationStartTime.HasValue && reservation.ReservationEndTime.HasValue)
                {
                    var period = reservation.ReservationEndTime.Value - reservation.ReservationStartTime.Value;
                    if (period < TimeSpan.Zero)
                        period += TimeSpan.FromDays(1);
                    reservation.Period = (decimal)period.TotalHours;
                }
                else
                {
                    reservation.Period = 0;
                }

                await _context.SaveChangesAsync();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("DeleteReservation")]
        public IActionResult DeleteReservation(int reservationCode)
        {
            var reservation = _context.Reservations.Find(reservationCode);
            if (reservation == null)
                return Json(new { success = false, message = "Reservation not found" });
            _context.Reservations.Remove(reservation);
            _context.SaveChanges();
            return Json(new { success = true });
        }

        [HttpPost("AddTeacher")]
        public async Task<IActionResult> AddTeacher([FromForm] string TeacherName, [FromForm] string Teacher_Phone, [FromForm] string Teacher_Address, [FromForm] int Insert_User)
        {
            try
            {
                var teacher = new Teacher
                {
                    TeacherName = TeacherName,
                    TeacherPhone = Teacher_Phone,
                    TeacherAddress = Teacher_Address,
                    IsActive = true,
                    IsStaff = false,
                    RootCode = 1,
                    InsertUser = Insert_User,
                    InsertTime = DateTime.Now
                };
                _context.Teachers.Add(teacher);
                await _context.SaveChangesAsync();
                return Json(new { success = true, teacherCode = teacher.TeacherCode });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("CheckHallTimeAvailable")]
        public async Task<IActionResult> CheckHallTimeAvailable([FromBody] JObject input)
        {
            if (input == null)
                return Json(new { success = true });
            
            // Defensive extraction with error reporting
            int hallCode = 0;
            string date = null;
            string startTime = null;
            string endTime = null;
            int? excludeClassCode = null;
            int? excludeReservationCode = null;

            try { hallCode = input["HallCode"]?.Value<int>() ?? 0; } catch { }
            try { date = input["Date"]?.ToString(); } catch { }
            try { startTime = input["StartTime"]?.ToString(); } catch { }
            try { endTime = input["EndTime"]?.ToString(); } catch { }
            try { excludeClassCode = input["ExcludeClassCode"]?.Value<int?>(); } catch { }
            try { excludeReservationCode = input["ExcludeReservationCode"]?.Value<int?>(); } catch { }

            if (hallCode == 0 || string.IsNullOrWhiteSpace(date) || string.IsNullOrWhiteSpace(startTime) || string.IsNullOrWhiteSpace(endTime))
                return Json(new { success = false, message = "Missing required fields", debug = new { hallCode, date, startTime, endTime } });

            if (!DateTime.TryParse(date, out DateTime parsedDate))
                return Json(new { success = false, message = "Invalid date format", debug = date });

            if (!TimeOnly.TryParse(startTime, out TimeOnly s))
                return Json(new { success = false, message = "Invalid start time", debug = startTime });

            if (!TimeOnly.TryParse(endTime, out TimeOnly e))
                return Json(new { success = false, message = "Invalid end time", debug = endTime });

            var dateOnly = parsedDate.Date;

            var classConflicts = await _context.Classes
                .Where(c =>
                    c.HallCode == hallCode &&
                    c.InsertTime.Date == dateOnly &&
                    (excludeClassCode == null || c.ClassCode != excludeClassCode) &&
                    c.ClassStartTime.HasValue && c.ClassEndTime.HasValue
                )
                .ToListAsync();

            var reservationConflicts = await _context.Reservations
                .Where(r =>
                    r.HallCode == hallCode &&
                    r.RTime == DateOnly.FromDateTime(dateOnly) &&
                    (excludeReservationCode == null || r.ReservationCode != excludeReservationCode) &&
                    r.ReservationStartTime.HasValue && r.ReservationEndTime.HasValue
                )
                .ToListAsync();

            bool hasConflict = false;
            System.Collections.Generic.List<string> conflicts = new();

            static bool Overlaps(TimeOnly s1, TimeOnly e1, TimeOnly s2, TimeOnly e2)
            {
                var t1Start = s1.ToTimeSpan();
                var t1End = e1 < s1 ? e1.ToTimeSpan() + TimeSpan.FromDays(1) : e1.ToTimeSpan();
                var t2Start = s2.ToTimeSpan();
                var t2End = e2 < s2 ? e2.ToTimeSpan() + TimeSpan.FromDays(1) : e2.ToTimeSpan();
                return t1Start < t2End && t2Start < t1End;
            }

            foreach (var c in classConflicts)
            {
                if (Overlaps(s, e, c.ClassStartTime.Value, c.ClassEndTime.Value))
                {
                    hasConflict = true;
                    conflicts.Add($"Class: {c.ClassName} ({c.ClassStartTime.Value:HH:mm}-{c.ClassEndTime.Value:HH:mm})");
                }
            }
            foreach (var r in reservationConflicts)
            {
                if (Overlaps(s, e, r.ReservationStartTime.Value, r.ReservationEndTime.Value))
                {
                    hasConflict = true;
                    conflicts.Add($"Reservation: {r.Description} ({r.ReservationStartTime.Value:HH:mm}-{r.ReservationEndTime.Value:HH:mm})");
                }
            }
            if (hasConflict)
                return Json(new { success = false, message = "Time slot not available.", conflicts });
            return Json(new { success = true });
        }

        // --- Helper method for double-booking prevention for both classes and reservations ---
        private async Task<bool> HasHallConflict(int hallCode, DateTime date, TimeOnly start, TimeOnly end)
        {
            // Classes
            var classes = await _context.Classes
                .Where(c => c.HallCode == hallCode
                            && c.InsertTime.Date == date
                            && c.ClassStartTime.HasValue && c.ClassEndTime.HasValue)
                .ToListAsync();

            // Reservations
            var dateOnly = DateOnly.FromDateTime(date);
            var reservations = await _context.Reservations
                .Where(r => r.HallCode == hallCode
                            && r.RTime == dateOnly
                            && r.ReservationStartTime.HasValue && r.ReservationEndTime.HasValue)
                .ToListAsync();

            bool Overlaps(TimeOnly s1, TimeOnly e1, TimeOnly s2, TimeOnly e2)
            {
                var t1Start = s1.ToTimeSpan();
                var t1End = e1 < s1 ? e1.ToTimeSpan() + TimeSpan.FromDays(1) : e1.ToTimeSpan();
                var t2Start = s2.ToTimeSpan();
                var t2End = e2 < s2 ? e2.ToTimeSpan() + TimeSpan.FromDays(1) : e2.ToTimeSpan();
                return t1Start < t2End && t2Start < t1End;
            }

            foreach (var c in classes)
                if (Overlaps(start, end, c.ClassStartTime.Value, c.ClassEndTime.Value))
                    return true;

            foreach (var r in reservations)
                if (Overlaps(start, end, r.ReservationStartTime.Value, r.ReservationEndTime.Value))
                    return true;

            return false;
        }
    }
}