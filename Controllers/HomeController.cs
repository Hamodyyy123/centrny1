using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using centrny1.Models;
using Microsoft.AspNetCore.Http;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System;

namespace centrny1.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly CenterContext _context;

        public HomeController(ILogger<HomeController> logger, CenterContext context)
        {
            _logger = logger;
            _context = context;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public JsonResult Authenticate(string username, string password)
        {
            _logger.LogInformation($"Received login request: Username = {username}");

            string hashedPassword = HashPasswordMD5(password);

            var user = _context.Users
                .Where(u => u.Username == username)
                .FirstOrDefault();

            if (user == null || !string.Equals(user.Password, hashedPassword, System.StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning($"Login failed for user '{username}'");
                return Json(new { success = false, message = "Invalid Username or Password" });
            }

            // Step 1: Get the user's group code
            int userGroupCode = user.GroupCode;

            // Step 2: Find the group record
            var groupRecord = _context.Groups.FirstOrDefault(g => g.GroupCode == userGroupCode);

            // Step 3: Get the root code from the group record
            int rootCode = groupRecord != null ? groupRecord.RootCode : 0;

            // Step 4: Find the root record
            var rootRecord = _context.Roots.FirstOrDefault(r => r.RootCode == rootCode);

            // Step 5: Get isCenter from the root record
            bool isCenter = rootRecord != null ? rootRecord.IsCenter : false;

            // Store in session (save also user code)
            HttpContext.Session.SetString("Username", user.Username);
            HttpContext.Session.SetString("RootCode", rootCode.ToString());
            HttpContext.Session.SetString("IsCenter", isCenter ? "true" : "false");
            HttpContext.Session.SetString("UserCode", user.UserCode.ToString());
            HttpContext.Session.SetString("LastActivity", DateTime.UtcNow.ToString("o"));

            // Debug logs to verify session values
            _logger.LogWarning($"DEBUG: Username in session: {HttpContext.Session.GetString("Username")}");
            _logger.LogWarning($"DEBUG: RootCode in session: {HttpContext.Session.GetString("RootCode")}");
            _logger.LogWarning($"DEBUG: IsCenter in session: {HttpContext.Session.GetString("IsCenter")}");
            _logger.LogWarning($"DEBUG: UserCode in session: {HttpContext.Session.GetString("UserCode")}");
            _logger.LogWarning($"DEBUG: LastActivity in session: {HttpContext.Session.GetString("LastActivity")}");

            _logger.LogInformation($"Login successful for: {username}");

            string redirectUrl = Url.Action("Root", "Home");
            return Json(new { success = true, redirectUrl = redirectUrl });
        }

        public IActionResult Root()
        {
            // Check session timeout
            var lastActivityString = HttpContext.Session.GetString("LastActivity");
            if (!string.IsNullOrEmpty(lastActivityString) &&
                DateTime.TryParse(lastActivityString, out DateTime lastActivity))
            {
                if ((DateTime.UtcNow - lastActivity).TotalMinutes > 30)
                {
                    HttpContext.Session.Clear();
                    return RedirectToAction("Index");
                }
                else
                {
                    HttpContext.Session.SetString("LastActivity", DateTime.UtcNow.ToString("o"));
                }
            }

            var username = HttpContext.Session.GetString("Username");
            var rootcode = HttpContext.Session.GetString("RootCode");
            var iscenter = HttpContext.Session.GetString("IsCenter");

            // More debug logs to check session values
            _logger.LogWarning($"DEBUG (Root action): Username in session: {username}");
            _logger.LogWarning($"DEBUG (Root action): RootCode in session: {rootcode}");
            _logger.LogWarning($"DEBUG (Root action): IsCenter in session: {iscenter}");

            if (string.IsNullOrEmpty(username))
                return RedirectToAction("Index");

            ViewData["Username"] = username;
            ViewData["RootCode"] = rootcode;
            ViewData["IsCenter"] = iscenter;

            return View();
        }

        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Index");
        }

        private static string HashPasswordMD5(string password)
        {
            using (var md5 = MD5.Create())
            {
                byte[] inputBytes = Encoding.Unicode.GetBytes(password);
                byte[] hashBytes = md5.ComputeHash(inputBytes);
                return string.Concat(hashBytes.Select(b => b.ToString("X2")));
            }
        }
    }
}