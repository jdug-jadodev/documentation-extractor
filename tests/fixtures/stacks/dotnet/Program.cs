var app = WebApplication.Create(args);
app.MapGet("/health", () => "ok");
app.MapPost("/orders", () => Results.Ok());
app.Run();
