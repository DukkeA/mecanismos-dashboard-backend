# Backend architecture

Esta base mantiene un **monolito modular de NestJS**: cada feature vive en su carpeta, los controladores quedan delgados, los servicios concentran reglas de negocio y Prisma entra por un `PrismaModule` explícito.

La intención es acercarse a Clean/Hexagonal Architecture sin sobrediseñar: HTTP queda en controllers/DTOs, los casos de uso viven en services, la persistencia se encapsula en repositories y la infraestructura compartida queda separada del dominio del feature.

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
| Observabilidad | Todo flujo operacionalmente relevante debe seguir patrones de logging útiles y seguros. Sin secretos, tokens, cookies ni payloads sensibles completos. |
| E2E | `npm run test:e2e` prepara y usa únicamente `DATABASE_URL_TEST`. |
| Smoke | Si se mantiene una prueba Prisma-free, debe estar claramente separada y nombrada como smoke. |

## Estructura de un feature

- `src/<feature>/<feature>.module.ts`: composición NestJS del feature.
- `src/<feature>/*.controller.ts`: entrada HTTP, validación, autorización y delegación.
- `src/<feature>/dto/*`: contratos HTTP del feature.
- `src/<feature>/*.service.ts`: reglas de negocio, casos de uso y orquestación.
- `src/<feature>/persistence/*.repository.ts`: adaptadores de persistencia; traducen Prisma al lenguaje del dominio.
- `src/<feature>/*.spec.ts`: tests del comportamiento del feature.

`src/common/*` queda reservado para transforms, helpers y utilidades compartidas por varios features. Si algo solo lo usa un feature, se queda en ese feature.

## Prisma ownership

- `src/prisma/prisma.module.ts` registra y exporta `PrismaService`.
- Los módulos consumidores **importan** `PrismaModule`.
- Los tokens de repositorio se conservan con `useExisting: PrismaService`.
- `AppModule` importa `PrismaModule`, pero no vuelve a declarar `PrismaService`.

## Observabilidad y logging

- El bootstrap registra request/response metadata suficiente para diagnosticar: `requestId`, método, ruta sanitizada, status y duración.
- Los errores HTTP deben loguear contexto útil sin filtrar secretos ni datos sensibles.
- Si un feature agrega flujos críticos, validaciones complejas, integraciones externas o estados difíciles de diagnosticar, debe reutilizar o extender los patrones compartidos en `src/common/logging/`.
- No uses `console.log` suelto en código de aplicación; preferí `Logger`/middleware/filtros compartidos.

## Test taxonomy

| Nivel | Comando | Propósito |
|---|---|---|
| Unit | `npm run test` | Servicios, repositorios, transforms, bootstrap y reglas de módulo. |
| E2E | `npm run test:e2e` | HTTP real + módulos reales + Prisma real sobre `DATABASE_URL_TEST`. |
| Manual | Postman | Exploración guiada y regresión asistida. |

## DATABASE_URL_TEST safety

- No existe fallback silencioso a `DATABASE_URL`.
- Si `DATABASE_URL_TEST` falta, coincide con la DB de desarrollo o no parece una base de test, la preparación e2e FALLA.
- La preparación e2e resetea migraciones y vuelve a sembrar solo la base de test.

## Checklist de revisión

- [ ] Ningún feature importa helpers privados de otro feature.
- [ ] Ningún módulo feature vuelve a proveer `PrismaService`.
- [ ] Los flujos relevantes tienen observabilidad suficiente para diagnosticar fallos en dev/e2e/producción.
- [ ] `npm run test:e2e` depende de `DATABASE_URL_TEST` y no de la DB de desarrollo.
- [ ] El flujo principal sigue `Controller -> Service -> Repository -> Prisma`.
