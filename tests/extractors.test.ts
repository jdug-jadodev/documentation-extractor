import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { buildInventory } from "../src/discovery/inventory.js";
import { createPythonPlugin } from "../src/extractors/python/index.js";
import { createDotnetPlugin } from "../src/extractors/dotnet/index.js";
import { createNodeExpressPlugin } from "../src/extractors/node_express/index.js";
import { createSourceArchitecturePlugin } from "../src/extractors/source_architecture/index.js";
import { createJavaSpringPlugin } from "../src/extractors/java_spring/index.js";
import { createJavaWebFluxPlugin } from "../src/extractors/java_webflux/index.js";
import { MemorySnapshotReader } from "./support/memory-snapshot.js";

const root = process.cwd(); const grammar_root = join(root, "assets", "grammars");
test("P07/P41/N01: FastAPI se extrae como texto sin Python", async () => { const reader = new MemorySnapshotReader("demo", { "app.py": "from fastapi import FastAPI\napp=FastAPI()\n@app.get(\"/x\")\ndef x(): return {}\n" }); const inventory = await buildInventory(reader); const plugin = createPythonPlugin(); const candidates = await plugin.detect(inventory); const result = await plugin.extract(reader, candidates[0]!, { max_file_bytes: 100_000, grammar_root }); assert.equal(result.facts.filter((fact) => fact.kind === "http_endpoint").length, 1); });
test("P36: minimal API .NET conserva método y ruta", async () => { const reader = new MemorySnapshotReader("dotnet", { "Program.cs": "app.MapGet(\"/health\", () => \"ok\");" }); const inventory = await buildInventory(reader); const plugin = createDotnetPlugin(); const result = await plugin.extract(reader, (await plugin.detect(inventory))[0]!, { max_file_bytes: 100_000, grammar_root }); assert.equal(result.facts.some((fact) => fact.kind === "http_endpoint"), true); });

test("Express conserva rutas, montajes y acceso Supabase observables", async () => {
  const reader = new MemorySnapshotReader("express", {
    "package.json": JSON.stringify({ dependencies: { express: "^4.19.0", "@supabase/supabase-js": "^2.0.0" } }),
    "src/index.ts": "import express from 'express'; const app=express(); app.use('/auth', authRoutes); app.get('/health', health); router.post('/login', login); fetch(`${BACKEND_URL}/health`); supabase.from('users').select('*'); supabase.from('tokens').insert({});",
  });
  const inventory = await buildInventory(reader);
  const plugin = createNodeExpressPlugin();
  const candidate = (await plugin.detect(inventory))[0]!;
  const result = await plugin.extract(reader, candidate, { max_file_bytes: 100_000, grammar_root });
  assert.equal(result.facts.filter((fact) => fact.kind === "http_endpoint_fragment").length, 2);
  assert.equal(result.facts.some((fact) => fact.kind === "http_route_mount"), true);
  assert.equal(result.facts.some((fact) => fact.kind === "data_read"), true);
  assert.equal(result.facts.some((fact) => fact.kind === "data_write"), true);
  const fetchFact = result.facts.find((fact) => fact.kind === "http_client_call");
  assert.equal((fetchFact?.value as { method?: string }).method, "GET");
});

test("la arquitectura fuente conserva módulos, símbolos, imports, tecnologías y scripts", async () => {
  const reader = new MemorySnapshotReader("architecture", {
    "package.json": JSON.stringify({ packageManager: "pnpm@10", engines: { node: ">=20" }, scripts: { build: "tsc" }, dependencies: { express: "^4.19.0", zod: "^3.0.0" }, devDependencies: { typescript: "^6.0.0" } }),
    "src/application/usecase/LoginUseCase.ts": "export class LoginUseCase {\n  async execute(email: string) { return this.validate(email); }\n  private validate(email: string) { return Boolean(email); }\n}",
    "src/infrastructure/routes/auth.routes.ts": "import { LoginUseCase } from '../../application/usecase/LoginUseCase'; export function createAuthRouter() { return LoginUseCase; }",
    "src/utils/hash.ts": "export const hashPassword = async (value: string) => value;"
  });
  const plugin = createSourceArchitecturePlugin();
  const candidate = (await plugin.detect(await buildInventory(reader)))[0]!;
  const result = await plugin.extract(reader, candidate, { max_file_bytes: 100_000, grammar_root });
  assert.equal(result.facts.filter((fact) => fact.kind === "source_module").length, 3);
  assert.equal(result.facts.some((fact) => fact.kind === "code_symbol" && (fact.value as { name?: string }).name === "LoginUseCase"), true);
  const execute = result.facts.find((fact) => fact.kind === "code_symbol" && (fact.value as { name?: string }).name === "execute");
  assert.equal((execute?.value as { class_name?: string }).class_name, "LoginUseCase");
  assert.deepEqual((execute?.value as { calls?: string[] }).calls, ["validate"]);
  assert.match(String((execute?.value as { description?: string }).description), /Procesa/u);
  assert.equal(result.facts.some((fact) => fact.kind === "module_dependency" && (fact.value as { target_path?: string }).target_path === "src/application/usecase/LoginUseCase.ts"), true);
  assert.equal(result.facts.filter((fact) => fact.kind === "package_dependency").length, 3);
  assert.equal(result.facts.some((fact) => fact.kind === "build_script"), true);
});

test("el AST TypeScript resuelve métodos flecha, receptores, composición e inyección", async () => {
  const reader = new MemorySnapshotReader("ast-typescript", {
    "src/auth.ts": `
interface UserRepository { save(email: string): Promise<void>; }
class SqlUserRepository implements UserRepository { async save(email: string) { await persist(email); } }
class RegisterUser { constructor(private readonly repository: UserRepository) {} async execute(email: string) { return this.repository.save(email); } }
class AuthController { constructor(private readonly registerUser: RegisterUser) {} register = async (email: string) => this.registerUser.execute(email); }
const repository = new SqlUserRepository();
const registerUser = new RegisterUser(repository);
export const authController = new AuthController(registerUser);
`
  });
  const plugin = createSourceArchitecturePlugin();
  const result = await plugin.extract(reader, (await plugin.detect(await buildInventory(reader)))[0]!, { max_file_bytes: 100_000, grammar_root });
  const register = result.facts.find((fact) => fact.kind === "code_symbol" && (fact.value as { name?: string }).name === "register");
  assert.equal((register?.value as { class_name?: string }).class_name, "AuthController");
  const executeCall = result.facts.find((fact) => fact.kind === "symbol_call" && (fact.value as { caller_name?: string }).caller_name === "register" && (fact.value as { callee_name?: string }).callee_name === "execute");
  assert.equal((executeCall?.value as { receiver?: string }).receiver, "this.registerUser");
  assert.equal((executeCall?.value as { target_class?: string }).target_class, "RegisterUser");
  assert.equal((executeCall?.value as { resolution?: string }).resolution, "supported");
  assert.equal(result.facts.some((fact) => fact.kind === "dependency_binding" && (fact.value as { consumer_class?: string; implementation_type?: string }).consumer_class === "AuthController" && (fact.value as { implementation_type?: string }).implementation_type === "RegisterUser"), true);
});

test("el AST Java conserva clases, métodos, receptores e inyección de constructor", async () => {
  const reader = new MemorySnapshotReader("ast-java", {
    "src/main/java/com/acme/UserRepository.java": "package com.acme; public interface UserRepository { User findByEmail(String email); }",
    "src/main/java/com/acme/AuthService.java": "package com.acme; public class AuthService { private final UserRepository repository; public AuthService(UserRepository repository) { this.repository = repository; } public User login(String email) { return repository.findByEmail(email); } }",
    "src/main/java/com/acme/AuthController.java": "package com.acme; public class AuthController { private final AuthService service; public AuthController(AuthService service) { this.service = service; } public User login(String email) { return service.login(email); } }"
  });
  const plugin = createSourceArchitecturePlugin();
  const result = await plugin.extract(reader, (await plugin.detect(await buildInventory(reader)))[0]!, { max_file_bytes: 100_000, grammar_root });
  assert.equal(result.facts.some((fact) => fact.kind === "code_symbol" && (fact.value as { name?: string }).name === "AuthController"), true);
  const call = result.facts.find((fact) => fact.kind === "symbol_call" && (fact.value as { caller_class?: string }).caller_class === "AuthController" && (fact.value as { callee_name?: string }).callee_name === "login");
  assert.equal((call?.value as { receiver?: string }).receiver, "service");
  assert.equal((call?.value as { target_class?: string }).target_class, "AuthService");
  assert.equal((call?.value as { resolution?: string }).resolution, "supported");
  assert.equal(result.facts.some((fact) => fact.kind === "dependency_injection" && (fact.value as { class_name?: string; dependency_type?: string }).class_name === "AuthController" && (fact.value as { dependency_type?: string }).dependency_type === "AuthService"), true);
});

test("Spring anotado compone el prefijo de clase y enlaza el handler sin crear un endpoint falso", async () => {
  const reader = new MemorySnapshotReader("spring-annotated", {
    "pom.xml": "<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webflux</artifactId></dependency></dependencies></project>",
    "src/main/java/com/acme/UserController.java": `
package com.acme;
import reactor.core.publisher.Mono;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/users")
public class UserController {
  @GetMapping("/{id}")
  public Mono<String> find(@PathVariable("id") String id) { return Mono.just(id); }
  @RequestMapping(path = "/search", method = RequestMethod.POST)
  public String search() { return "ok"; }
}`
  });
  const plugin = createJavaSpringPlugin();
  const candidate = (await plugin.detect(await buildInventory(reader)))[0]!;
  const result = await plugin.extract(reader, candidate, { max_file_bytes: 100_000, grammar_root });
  const endpoints = result.facts.filter((fact) => fact.kind === "http_endpoint").map((fact) => fact.value as { method: string; path: string; handler_expression: string; reactive: boolean });
  assert.deepEqual(endpoints.map((item) => `${item.method} ${item.path}`).sort(), ["GET /users/{id}", "POST /users/search"]);
  assert.equal(endpoints[0]?.handler_expression.startsWith("UserController."), true);
  assert.equal(endpoints.find((item) => item.method === "GET")?.reactive, true);
});

test("WebFlux funcional detecta rutas builder, nest, referencias de handler y pipeline Reactor", async () => {
  const reader = new MemorySnapshotReader("webflux-functional", {
    "build.gradle": "dependencies { implementation 'org.springframework.boot:spring-boot-starter-webflux' }",
    "src/main/java/com/acme/WorkRouter.java": `
package com.acme;
class WorkRouter {
  RouterFunction<ServerResponse> routes(WorkHandler handler) {
    return route().POST("/work", handler::publish).DELETE("/work/{id}", request -> handler.remove(request)).path("/admin", builder -> builder.GET("", handler::list)).build();
  }
  RouterFunction<ServerResponse> attention(WorkHandler handler) {
    return RouterFunctions.route(POST("/attention").and(contentType(APPLICATION_JSON)), handler::create);
  }
}`,
    "src/main/java/com/acme/WorkHandler.java": `
package com.acme;
class WorkHandler {
  Mono<ServerResponse> publish(ServerRequest request) { return request.bodyToMono(Command.class).flatMap(service::save).thenReturn(ok()); }
  Flux<String> list() { return repository.findAll().map(Item::name); }
  Mono<Void> remove(ServerRequest request) { return Mono.when(repository.delete(), audit.save()).then(); }
}`
    ,"src/test/java/com/acme/WorkHandlerTest.java": "class WorkHandlerTest { void test() { route().GET(\"/fake\", handler::list).build(); } }"
  });
  const inventory = await buildInventory(reader);
  const plugin = createJavaWebFluxPlugin();
  const candidate = (await plugin.detect(inventory))[0]!;
  assert.ok(candidate);
  const result = await plugin.extract(reader, candidate, { max_file_bytes: 100_000, grammar_root });
  const endpoints = result.facts.filter((fact) => fact.kind === "http_endpoint").map((fact) => fact.value as { path: string; handler_expression: string; route_order: number });
  assert.equal(endpoints.some((item) => item.path === "/work" && item.handler_expression === "WorkHandler.publish"), true);
  assert.equal(endpoints.some((item) => item.path === "/admin" && item.handler_expression === "WorkHandler.list"), true);
  assert.equal(endpoints.some((item) => item.path === "/attention" && item.handler_expression === "WorkHandler.create"), true);
  assert.equal(endpoints.some((item) => item.path === "/work/{id}" && item.handler_expression.includes("->")), true);
  assert.equal(endpoints.find((item) => item.path === "/work")!.route_order < endpoints.find((item) => item.path === "/work/{id}")!.route_order, true);
  assert.equal(endpoints.some((item) => item.path === "/fake"), false);
  const pipeline = result.facts.find((fact) => fact.kind === "reactive_pipeline" && (fact.value as { symbol_name?: string }).symbol_name === "publish");
  assert.deepEqual((pipeline?.value as { operators?: string[] }).operators, ["flatMap", "thenReturn"]);
  assert.equal(result.facts.some((fact) => fact.kind === "reactive_pipeline" && (fact.value as { operators?: string[] }).operators?.includes("when")), true);
});

test("la estructura física conserva recursos, pruebas, módulos Gradle y Lombok sin falsos escalares", async () => {
  const reader = new MemorySnapshotReader("java-structure", {
    "settings.gradle": "include ':domain', ':infrastructure'",
    "infrastructure/build.gradle": "dependencies { implementation project(':domain') }",
    "infrastructure/src/main/java/com/acme/infraestructure/mapper/UserMapperInfra.java": "package com.acme; @RequiredArgsConstructor class UserMapperInfra implements UserMapper { private final UserRepository repository; private final String label; }",
    "infrastructure/src/main/resources/application.yaml": "spring: {}",
    "domain/src/test/java/com/acme/UserTest.java": "class UserTest {}"
  });
  const plugin = createSourceArchitecturePlugin();
  const result = await plugin.extract(reader, (await plugin.detect(await buildInventory(reader)))[0]!, { max_file_bytes: 100_000, grammar_root });
  assert.equal(result.facts.filter((fact) => fact.kind === "repository_file").length, 5);
  const mapper = result.facts.find((fact) => fact.kind === "source_module" && (fact.value as { path?: string }).path?.endsWith("UserMapperInfra.java"));
  assert.equal((mapper?.value as { layer?: string; role?: string }).layer, "infrastructure");
  assert.equal((mapper?.value as { role?: string }).role, "mapper");
  assert.equal(result.facts.some((fact) => fact.kind === "build_module_dependency" && (fact.value as { target_module?: string }).target_module === "domain"), true);
  assert.equal(result.facts.some((fact) => fact.kind === "dependency_injection" && (fact.value as { dependency_type?: string }).dependency_type === "UserRepository"), true);
  assert.equal(result.facts.some((fact) => fact.kind === "dependency_injection" && (fact.value as { dependency_type?: string }).dependency_type === "String"), false);
  assert.equal(result.facts.some((fact) => fact.kind === "type_relation" && (fact.value as { target_type?: string }).target_type === "UserMapper"), true);
});
