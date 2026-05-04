Estoy construyendo una app interna para Mecanismos Técnicos, un negocio familiar de reparación, venta y gestión de componentes mecánicos/automotrices.

## Contexto de la empresa

La app será usada principalmente por administración/gerencia familiar. Los mecánicos y vendedores existen como entidades de negocio, pero no necesariamente como usuarios del sistema en la primera versión.

La empresa necesita controlar:
- clientes
- vehículos de clientes
- componentes que llegan a reparación
- órdenes de trabajo de taller
- ventas directas de repuestos/componentes
- proveedores
- inventario propio
- cotizaciones de proveedores
- estimaciones al cliente
- costos reales
- pagos de clientes
- gastos operativos
- empleados
- productividad/rentabilidad por mecánico
- centros de costo simples

## Principios del producto

La app debe ser práctica y poco restrictiva. No queremos obligar a llenar demasiados campos porque eso frena la adopción. Pero sí necesitamos mantener trazabilidad histórica suficiente para saber:
- qué cliente trajo qué vehículo o componente
- qué trabajo se hizo
- qué se estimó inicialmente
- qué se terminó cobrando
- qué costos reales hubo
- qué pagos se recibieron
- qué proveedor cotizó o vendió algo
- qué inventario entró/salió
- qué gastos afectaron la rentabilidad

Preferimos simplicidad operativa sobre modelado perfecto.

## Entidades principales

### Cliente

Un cliente puede ser persona natural o empresa. Puede tener:
- nombre
- teléfono
- tipo de documento
- número de documento
- email
- notas

Debe poder asociarse con vehículos, componentes y órdenes de trabajo.

### Vehículo

Un vehículo pertenece a un cliente. Puede tener:
- marca
- referencia/modelo
- placa
- notas

Un vehículo puede tener componentes asociados y órdenes de trabajo.

### Componente

Un componente representa una unidad física del cliente que llega al taller o se relaciona con una reparación. Ejemplos:
- bomba
- caja
- inyector
- turbo
- otro componente mecánico

Puede estar asociado a:
- cliente
- vehículo opcional
- marca
- referencia
- identificador/serial interno
- notas

Importante: componente del cliente NO es lo mismo que inventario propio.

### Inventario

El inventario representa mercancía propia de la empresa. Puede incluir:
- repuestos nuevos
- repuestos usados
- componentes propios
- componentes remanufacturados

Debe permitir controlar:
- nombre
- tipo
- condición: nuevo, usado, remanufacturado
- marca
- referencia
- stock mínimo
- precio sugerido/default
- movimientos de entrada y salida

Los movimientos de inventario deben poder relacionarse con proveedores y órdenes de trabajo cuando aplique.

### Proveedor

Proveedor de repuestos, servicios externos o componentes. Debe registrar:
- nombre
- teléfono
- email
- notas

Debe poder asociarse con:
- cotizaciones históricas
- compras
- costos reales de órdenes
- movimientos de inventario

### Historial de cotizaciones de proveedor

Necesitamos guardar cuánto cotizó un proveedor por un ítem, incluso si luego cambia el precio.

Campos conceptuales:
- proveedor
- ítem de inventario opcional
- orden de trabajo opcional
- costo cotizado
- fecha de cotización
- notas

### Servicio / proceso reusable

La empresa realiza servicios como:
- diagnóstico
- reparación
- calibración
- instalación

Deben ser reutilizables. En frontend eventualmente se quiere poder crear servicios inline desde un combobox si no existen.

### Orden de trabajo

La orden de trabajo es el centro operativo.

Hay dos tipos principales:
- venta directa
- trabajo de taller

Debe tener:
- tipo
- estado operativo
- estado de pago
- cliente
- vehículo opcional
- componente opcional
- empleado asignado opcional
- resumen
- notas
- fecha estimada de entrega
- fecha estimada de cobro
- fecha de finalización
- link externo opcional a archivos/documentos

Estados operativos:
- en progreso
- pausada
- completada
- cancelada

Estado de pago:
- pendiente
- parcial
- pagado

El estado operativo y el estado de pago deben ser independientes.

### Detalles específicos de taller

Para órdenes de taller puede haber:
- problema reportado por cliente
- si requiere diagnóstico
- resumen de diagnóstico

### Estimaciones

Cada orden puede tener estimaciones. Para la v1 sólo necesitamos:
- estimación inicial
- estimación final

No queremos manejar muchas versiones intermedias. Los cambios intermedios pueden quedar en notas.

Una estimación debe poder incluir:
- horas estimadas de mano de obra
- costo horario snapshot
- costo base
- porcentaje de contingencia
- monto de contingencia
- costo total
- precio total
- precio mínimo recomendado
- precio recomendado
- precio alto recomendado
- notas
- líneas de estimación

Las líneas pueden ser:
- repuesto/componente
- servicio
- mano de obra
- otro

### Costos reales

Una orden debe poder registrar costos reales:
- compra directa
- servicio tercerizado
- mano de obra
- otro

Cada costo puede tener:
- descripción
- monto
- proveedor opcional
- ítem de inventario opcional
- método de pago
- fecha
- notas

### Pagos

Una orden puede tener varios pagos:
- monto
- método de pago
- fecha
- notas

Esto permite pagos parciales.

### Empleados

Empleados de negocio, no necesariamente usuarios de login.

Tipos:
- mecánico
- ventas
- administración

Campos:
- nombre
- tipo
- teléfono
- salario base mensual
- centro de costo
- activo/inactivo

### Bonos

Los bonos son manuales y esporádicos. No deben entrar en la proyección mensual de nómina, sólo impactar el real cuando se registran.

### Nómina

Para v1, la proyección mensual considera sólo salario base. No hace falta modelar horas reales por empleado.

### Productividad mecánico

La productividad del mecánico se medirá por rentabilidad de los trabajos asignados, no por horas reales.

La pregunta importante es:
- cuánto ingreso/costo/utilidad generaron las órdenes asignadas a cada mecánico

### Gastos

La empresa necesita registrar gastos como:
- arriendo
- servicios públicos
- almuerzos
- otros

Cada gasto puede tener:
- nombre
- categoría
- monto
- centro de costo
- fecha esperada
- fecha pagada
- método de pago
- notas

### Centros de costo

Para v1 usar centros simples:
- GENERAL
- BODEGA
- OFICINA

Sirven para clasificar gastos y eventualmente reportar rentabilidad/costos por área.

## Reglas importantes

- No borrar entidades que tengan historia importante.
- Si un cliente tiene vehículos, componentes u órdenes, no debe eliminarse sin proteger trazabilidad.
- Si un vehículo tiene componentes u órdenes, tampoco debe eliminarse libremente.
- Si un componente tiene órdenes asociadas, debe conservarse.
- La app debe permitir datos opcionales para facilitar uso real.
- La prioridad es trazabilidad práctica, no burocracia.
- El dominio debe permitir reportes futuros de rentabilidad, pagos pendientes, gastos, inventario y productividad.

## Objetivo de la primera versión

Crear una herramienta interna que permita administrar la operación diaria:

1. Registrar clientes, vehículos y componentes.
2. Crear órdenes de venta o taller.
3. Estimar costos/precios.
4. Registrar costos reales.
5. Registrar pagos.
6. Controlar inventario básico.
7. Registrar gastos.
8. Ver estado financiero operativo: trabajos pendientes, pagos pendientes, gastos, utilidad aproximada.
9. Medir rentabilidad por mecánico de manera simple.

Antes de escribir código, usa este contexto para proponer el modelo de dominio, flujos principales y límites de la primera versión.

## IMPORTANTE: Ya creé un schema.prisma inicial basado en este contexto. Antes de proponer cambios, revisa el schema para entender cómo modelé las entidades y relaciones. El objetivo es iterar sobre ese modelo, no crear uno completamente nuevo.