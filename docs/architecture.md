# Backend architecture

Esta base mantiene un **monolito modular de NestJS**: cada feature vive en su módulo, los controladores quedan delgados, los servicios concentran reglas de negocio y Prisma entra por un `PrismaModule` explícito.

## Camino rápido

1. Busque primero el módulo del feature (`src/<feature>/<feature>.module.ts`).
2. Siga el flujo `Controller -> Service -> Repository`.
3. Si algo se reutiliza entre varios features, muévalo a `src/common/`.
4. Para e2e reales use `npm run test:e2e` con `DATABASE_URL_TEST`.

## Decisiones clave

| Tema | Decisión |
|---|---|
| Módulos | Cada feature declara controllers/providers propios y solo exporta lo que otro módulo necesita. |
| `src/common` | Solo contiene utilidades reutilizadas por varios features. Nada de junk drawer. |
| Prisma | `PrismaModule` es explícito, non-global y es el único owner de `PrismaService`. |
| Repositorios | Los servicios hablan con repositorios del dominio, no con Prisma crudo. |
| E2E | `npm run test:e2e` prepara y usa únicamente `DATABASE_URL_TEST`. |
| Smoke | Si se mantiene una prueba Prisma-free, debe estar claramente separada y nombrada como smoke. |

## Module boundary

- `src/<feature>/dto/*`: contratos HTTP del feature.
- `src/<feature>/*.controller.ts`: entrada HTTP, validación y autorización.
- `src/<feature>/*.service.ts`: reglas de negocio y orquestación.
- `src/<feature>/persistence/*.repository.ts`: consultas Prisma traducidas al lenguaje del dominio.
- `src/common/*`: transforms, helpers y utilidades compartidas entre múltiples features.

## Prisma ownership

- `src/prisma/prisma.module.ts` registra y exporta `PrismaService`.
- Los módulos consumidores **importan** `PrismaModule`.
- Los tokens de repositorio se conservan con `useExisting: PrismaService`.
- `AppModule` importa `PrismaModule`, pero no vuelve a declarar `PrismaService`.

## Test taxonomy

| Nivel | Comando | Propósito |
|---|---|---|
| Unit | `npm run test` | Servicios, repositorios, transforms, bootstrap y artefactos. |
| E2E | `npm run test:e2e` | HTTP real + módulos reales + Prisma real sobre `DATABASE_URL_TEST`. |
| Manual | Postman | Exploración guiada y regresión asistida. |

## DATABASE_URL_TEST safety

- No existe fallback silencioso a `DATABASE_URL`.
- Si `DATABASE_URL_TEST` falta, coincide con la DB de desarrollo o no parece una base de test, la preparación e2e FALLA.
- La preparación e2e resetea migraciones y vuelve a sembrar solo la base de test.

## Rollback por work unit

1. **Unit 1**: revertir limpieza de inventario y movimientos hacia `src/common/`.
2. **Unit 2**: revertir `PrismaModule` e imports explícitos en módulos.
3. **Unit 3**: revertir `app.bootstrap.ts`, helpers e2e y documentación asociada.

## Checklist de revisión

- [ ] Ningún feature importa helpers privados de otro feature.
- [ ] Ningún módulo feature vuelve a proveer `PrismaService`.
- [ ] `npm run test:e2e` depende de `DATABASE_URL_TEST` y no de la DB de desarrollo.
- [ ] La documentación de `aprendizaje/` explica módulos, DI, Prisma y testing.
