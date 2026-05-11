# Mecanismos Dashboard — flujos actuales de la app

Este documento resume cómo está funcionando hoy el backend y cómo debería pensarse el uso diario de la app: la orden de trabajo es el centro operativo; clientes, activos, inventario, proveedores, gastos y empleados alimentan trazabilidad y reportes.

> Los diagramas están en Mermaid. GitHub, VS Code y varios visores Markdown los renderizan como gráficas.

## Lectura rápida

| Área                                    | Estado actual             | Notas                                                                            |
| --------------------------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| Clientes / vehículos / componentes      | Implementado              | Base de trazabilidad de activos del cliente.                                     |
| Inventario / proveedores / cotizaciones | Implementado parcialmente | Existe la base, pero falta conectar mejor movimientos de inventario con órdenes. |
| Órdenes de trabajo                      | Implementado              | Incluye estimaciones, costos reales y pagos.                                     |
| Gastos / empleados / centros de costo   | Implementado              | Alimenta reportes operativos.                                                    |
| Reportes operativos                     | Implementado              | Reporting aproximado, no contabilidad formal.                                    |
| Pricing / labor settings               | Implementado              | Singleton backend con defaults para futuras cotizaciones y snapshots históricos. |
| Próxima brecha fuerte                   | Inventario ↔ órdenes      | Falta el puente operativo para consumo/venta de inventario por orden.            |

## 1. Mapa funcional actual

```mermaid
flowchart LR
  Auth["Auth y roles"] --> Admin["Administración / gerencia"]

  Admin --> Customers["Clientes"]
  Customers --> Vehicles["Vehículos"]
  Customers --> Components["Componentes del cliente"]

  Admin --> Suppliers["Proveedores"]
  Suppliers --> Quotes["Cotizaciones proveedor"]
  Admin --> Inventory["Inventario propio"]
  Inventory --> Movements["Movimientos inventario"]

  Admin --> Employees["Empleados"]
  Admin --> Expenses["Gastos"]
  Admin --> CostCenters["Centros de costo"]

  Customers --> WorkOrders["Órdenes de trabajo / venta"]
  Vehicles --> WorkOrders
  Components --> WorkOrders
  Employees --> WorkOrders
  Quotes --> WorkOrders
  Inventory -. "links disponibles" .-> WorkOrders

  WorkOrders --> Estimates["Estimaciones inicial/final"]
  WorkOrders --> ActualCosts["Costos reales"]
  WorkOrders --> Payments["Pagos cliente"]

  WorkOrders --> Reports["Reportes operativos"]
  Expenses --> Reports
  Employees --> Reports
  CostCenters --> Reports
```

## 2. Modelo de dominio v1

```mermaid
erDiagram
  CUSTOMER ||--o{ VEHICLE : owns
  CUSTOMER ||--o{ COMPONENT : owns
  CUSTOMER ||--o{ WORK_ORDER : requests
  VEHICLE ||--o{ COMPONENT : may_have
  VEHICLE ||--o{ WORK_ORDER : contextualizes
  COMPONENT ||--o{ WORK_ORDER : repaired_or_sold_for

  EMPLOYEE ||--o{ WORK_ORDER : assigned_to
  COST_CENTER ||--o{ EMPLOYEE : classifies
  COST_CENTER ||--o{ EXPENSE : classifies

  WORK_ORDER ||--o| WORKSHOP_DETAILS : has
  WORK_ORDER ||--o{ WORK_ORDER_ESTIMATE : has
  WORK_ORDER_ESTIMATE ||--o{ ESTIMATE_LINE : contains
  WORK_ORDER ||--o{ ACTUAL_COST : records
  WORK_ORDER ||--o{ PAYMENT : receives

  SUPPLIER ||--o{ SUPPLIER_QUOTE : quotes
  SUPPLIER ||--o{ ACTUAL_COST : provides
  INVENTORY_ITEM ||--o{ INVENTORY_MOVEMENT : moves
  INVENTORY_ITEM ||--o{ SUPPLIER_QUOTE : quoted_for
  INVENTORY_ITEM ||--o{ ESTIMATE_LINE : referenced_by
```

## 3. Flujo operativo principal: orden de trabajo

```mermaid
sequenceDiagram
  actor Admin as Administración
  participant Customer as Cliente / Activo
  participant WO as Work Orders
  participant Estimate as Estimaciones
  participant Cost as Costos reales
  participant Payment as Pagos
  participant Report as Reporting

  Admin->>Customer: Registra cliente, vehículo o componente
  Admin->>WO: Crea orden SALE o WORKSHOP
  alt Trabajo de taller
    Admin->>WO: Agrega problema reportado y diagnóstico
  end
  Admin->>Estimate: Lee pricing/labor settings vigentes
  Admin->>Estimate: Carga estimación inicial con defaults snapshot
  Admin->>Estimate: Reemplaza estimación final cuando aplica
  Admin->>Cost: Registra compras, servicios, mano de obra u otros costos
  Admin->>Payment: Registra pagos parciales o totales
  Payment->>WO: Actualiza estado de pago operativo
  Report->>WO: Lee estado, payable, costos y pagos
  Report->>Admin: Muestra utilidad aproximada y pendientes
```

## 4. Flujo de inventario y proveedores

El backend ya tiene inventario, proveedores, cotizaciones y movimientos. La brecha actual es convertir eso en un flujo operativo más fuerte dentro de la orden.

```mermaid
flowchart TD
  Supplier["Proveedor"] --> Quote["Cotización proveedor"]
  Supplier --> Purchase["Compra / servicio externo"]
  Quote --> EstimateLine["Línea de estimación"]
  Quote --> ActualCost["Costo real"]

  InventoryItem["Ítem inventario"] --> Movement["Movimiento entrada/salida"]
  Movement -. "relación de schema" .-> WorkOrder["Orden de trabajo"]
  InventoryItem --> EstimateLine
  InventoryItem --> ActualCost

  WorkOrder --> Reporting["Rentabilidad / trazabilidad"]
  ActualCost --> Reporting
  EstimateLine --> Reporting

  Gap["Próximo gap: exponer movimiento de inventario ligado a orden"]:::gap
  Movement -.-> Gap

  classDef gap fill:#fff3cd,stroke:#b08900,color:#3b2f00;
```

## 5. Cómo se alimentan los reportes

```mermaid
flowchart LR
  WO["WorkOrder"] --> Summary["Summary report"]
  WO --> Profitability["Work-order profitability"]
  WO --> Mechanics["Mechanic productivity"]
  WO --> Receivables["Pending payments"]

  Estimates["Initial / Final estimates"] --> Payable["Payable total\nFINAL > INITIAL > null"]
  Payable --> Summary
  Payable --> Profitability
  Payable --> Receivables

  Costs["Actual costs"] --> Profitability
  Costs --> Summary
  Payments["Payments"] --> Receivables
  Payments --> Summary
  Payments --> Profitability
  Expenses["Expenses"] --> ExpenseBreakdown["Expenses breakdown"]
  Employees["Assigned employees"] --> Mechanics

  Summary --> Dashboard["Vista operativa"]
  Receivables --> Dashboard
  Profitability --> Dashboard
  Mechanics --> Dashboard
  ExpenseBreakdown --> Dashboard
```

## 6. Uso diario imaginado

```mermaid
journey
  title Día operativo ideal en Mecanismos Técnicos
  section Recepción
    Buscar o crear cliente: 5: Administración
    Asociar vehículo o componente: 4: Administración
    Crear orden de venta o taller: 5: Administración
  section Cotización
    Consultar inventario/proveedor: 4: Administración
    Armar estimación inicial: 5: Administración
    Compartir precio con cliente: 4: Administración
  section Ejecución
    Registrar diagnóstico y avance: 4: Administración
    Registrar costos reales: 5: Administración
    Ajustar estimación final: 4: Administración
  section Cobro y control
    Registrar pagos parciales: 5: Administración
    Revisar pendientes y utilidad aproximada: 5: Gerencia
    Revisar productividad por mecánico: 4: Gerencia
```

## 7. Brechas recomendadas antes de nuevos módulos grandes

| Prioridad | Brecha                         | Por qué importa                                                                           |
| --------: | ------------------------------ | ----------------------------------------------------------------------------------------- |
|         1 | Inventario ligado a órdenes    | Cierra trazabilidad de salidas/consumos/ventas y mejora utilidad real.                    |
|         2 | Historial/auditoría de settings | Ya existe singleton actual, pero falta versionado explícito si negocio lo pide. |
|         3 | Nómina simple                  | V1 sólo pide proyección por salario base; conviene después de estabilizar reporting.      |
|         4 | Toolchain Jest/ESM             | VM Modules warning no bloquea, pero es deuda de herramientas.                             |

## Checklist de interpretación

- Los reportes son **operativos y aproximados**, no contabilidad formal.
- Cuando una orden no tiene estimación inicial/final, el payable es `null`, no `0`.
- La productividad de mecánicos usa órdenes asignadas; no descuenta salario, bonos ni overhead.
- No se deben borrar entidades con historia importante; se prefiere preservar trazabilidad.
