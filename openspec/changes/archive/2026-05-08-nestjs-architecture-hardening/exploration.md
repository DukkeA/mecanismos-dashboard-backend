## Exploration: nestjs-architecture-hardening

### Current State
The backend already follows a recognizable NestJS modular-monolith shape: each business slice has its own module, controllers are mostly thin, request DTOs use `class-validator`, Swagger annotations are present, and Prisma access is usually hidden behind feature repositories with domain-named methods. Reviewer-facing docs and artifact tests also exist for the implemented slices.

The main hardening problem is ORGANIZATION DRIFT, not missing architecture from zero. The biggest concrete smells are: ambiguous inventory structure with three empty subfolders, duplicated/common DTO transforms scattered under feature folders, repeated e2e bootstrap setup with production drift, repeated PrismaService providers per module, and response/repository contracts that still leak Prisma records and ad-hoc shapes.

### Affected Areas
- `src/inventory/` — contains empty `inventory-items/`, `inventory-movements/`, and `inventory/` folders while active files stay at module root.
- `src/inventory/inventory.module.ts` — imports `ProcurementModule`, exports `InventoryService`, and re-provides `PrismaService` locally.
- `src/suppliers/suppliers.module.ts` — imports `ProcurementModule` and re-provides `PrismaService` locally.
- `src/procurement/procurement.module.ts` — exports `ProcurementService` for other controllers to call directly.
- `src/*/dto/*.ts` — DTO validation is broadly good, but string/boolean transforms are duplicated or imported from unrelated feature folders.
- `src/customers/dto/customer-string.transforms.ts` and `src/suppliers/dto/supplier-string.transforms.ts` — near-duplicate cross-cutting transforms living inside feature modules.
- `src/*/*.service.ts` — paginated `{ data, meta }` responses are repeated ad hoc; services often return repository/Prisma records directly.
- `src/*/persistence/*.repository.ts` — repositories hide Prisma reasonably well, but exported record types are still Prisma-backed and bubble upward.
- `src/main.ts` — production global app setup is the canonical source for cookie parser + `ValidationPipe`.
- `test/**/*.e2e-spec.ts` — most specs manually recreate production setup; `test/inventory/inventory-items.e2e-spec.ts` and `test/app.e2e-spec.ts` currently drift from `main.ts` bootstrap.
- `docs/**` and `src/*.artifacts.spec.ts` — reviewer docs exist and are tested, but architecture/testing conventions are not centralized yet.

### Approaches
1. **Targeted architecture hardening** — Clean the current modular monolith without changing business behavior or route ownership broadly.
   - Pros: Highest learning value, low rewrite risk, preserves current feature momentum, fits the stated goal.
   - Cons: Some deeper smells (response serialization strategy, richer domain boundaries) will remain intentionally deferred.
   - Effort: Medium

2. **Broader module/domain rewrite** — Split inventory/procurement into deeper submodules, introduce formal response DTOs everywhere, and redesign cross-module boundaries in one pass.
   - Pros: Cleaner end-state on paper.
   - Cons: High churn, higher regression risk, likely exceeds review budget, turns hardening into a rewrite.
   - Effort: High

### Recommendation
Choose **Targeted architecture hardening**.

Recommended scope for proposal:
- Remove the ambiguous empty inventory folders and establish one explicit folder convention.
- Move reusable transforms/parsers into `src/common/` and stop importing cross-cutting DTO helpers from `customers/` or `suppliers/`.
- Centralize production app bootstrap reused by e2e tests so the same global pipes/cookie parser are installed consistently.
- Introduce a shared Prisma provider/module pattern so feature modules stop declaring their own `PrismaService` instances.
- Standardize light internal contracts for pagination/serialization where safe, while documenting bigger response-DTO work as follow-up.
- Keep current routes and business rules stable unless a specific spec later says otherwise.

### Risks
- Moving bootstrap/setup code can break lightweight e2e overrides if the helper is not designed for mocked Prisma/auth seams.
- Centralizing Prisma provisioning changes DI wiring across every feature module and needs careful test updates.
- The inventory cleanup is mechanically easy ONLY if the team agrees to stay flat; turning it into nested submodules is a separate design choice.
- Full response DTO adoption across all modules can accidentally become a contract rewrite if not tightly scoped.

### Ready for Proposal
Yes — with a narrow change statement: harden NestJS structure, shared cross-cutting helpers, Prisma DI wiring, and e2e parity WITHOUT rewriting feature behavior or redesigning the full domain model.
