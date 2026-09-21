[Route("api/[controller]")]
public class OrdersController {
  [HttpGet("{id}")]
  public object Get(string id) => new { id };
}
