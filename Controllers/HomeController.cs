using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using centrny1.Models;
using Microsoft.AspNetCore.Http;
using System.Linq;

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

            var user = _context.Users
                .Where(u => u.Username == username)
                .FirstOrDefault();

            if (user == null || user.Password != password)
            {
                _logger.LogWarning($"Login failed for user '{username}'");
                return Json(new { success = false, message = "Invalid Username or Password" });
            }

            // Store session info if needed
            HttpContext.Session.SetString("Username", user.Username);

            _logger.LogInformation($"Login successful for: {username}");

            // Redirect to Root management page
            string redirectUrl = Url.Action("Root", "Home");
            return Json(new { success = true, redirectUrl = redirectUrl });
        }

        public IActionResult Root()
        {
            // Your root management logic
            return View();
        }
    }
}