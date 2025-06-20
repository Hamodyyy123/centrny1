using centrny1.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Load configuration from appsettings.json
var config = builder.Configuration;

// Configure services
builder.Services.AddControllersWithViews();

// Add session with options (recommended to set IdleTimeout and essential cookies)
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(8); // 8 hour session timeout (match your login logic)
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Add database context using dependency injection
builder.Services.AddDbContext<CenterContext>(options =>
    options.UseSqlServer(config.GetConnectionString("DefaultConnection")));

// Enable IIS support
builder.WebHost.UseIISIntegration(); // Enables IIS integration

// Enable logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Enable CORS if needed
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// Build the application
var app = builder.Build();

// Use session BEFORE UseRouting/UseAuthorization
app.UseSession();

// Configure middleware pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

// Middleware setup
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors("AllowAll"); // Ensure CORS is applied for API accessibility
app.UseAuthorization();

// Exception handling for logging errors instead of improper redirection
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Unhandled exception: {ex.Message}");
        context.Response.StatusCode = 500;
        await context.Response.WriteAsync("Internal Server Error");
    }
});

// Configure routing
app.UseEndpoints(endpoints =>
{
    endpoints.MapControllerRoute(
        name: "default",
        pattern: "{controller=Home}/{action=Index}/{id?}");
});

// Run the application
app.Run();