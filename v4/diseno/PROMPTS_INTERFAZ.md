# SIMA v4 · Prompts de interfaz gráfica

Estos prompts describen cómo debe verse y moverse cada parte de SIMA. Sirven como especificación para el equipo y como instrucciones para herramientas de diseño o de IA (Figma AI, v0, Claude, Midjourney para conceptos). Están aplicados en el código de `paquetes/ui`, `web`, `terreno` y `plc-sim`.

---

## 0. Dirección visual: «Cordillera de noche»

> Diseña una interfaz de sala de control industrial para una planta manufacturera chilena. Ambiente nocturno andino: fondo azul tinta muy profundo (#0A0F1D) con un relieve topográfico de curvas de nivel apenas visible y dos auroras difusas que se mueven lentamente, una verde glaciar (#2DD4BF) y otra cobre (#E8834F), en homenaje al cobre chileno. Las superficies son paneles de vidrio oscuro con borde fino luminoso y esquinas redondeadas de 16 a 20 px. Los datos son los protagonistas: números grandes en Bricolage Grotesque, etiquetas en Figtree, códigos y lecturas en JetBrains Mono. Los estados usan color con significado: verde operando, ámbar aviso, rosa coral alarma, azul información. Nada de decoración gratuita: cada brillo indica algo vivo.

| Token | Noche (oscuro, por defecto) | Día (claro) | Uso |
|---|---|---|---|
| fondo | #0A0F1D | #EEF2F8 | detrás de todo |
| superficie | #10182A | #FFFFFF | paneles y tarjetas |
| superficie elevada | #162036 | #F7F9FC | menús, diálogos |
| borde | #24314B | #D5DCE8 | separadores |
| texto | #E9EEF6 | #0B1222 | texto principal |
| texto tenue | #8E9AB0 | #5B6577 | etiquetas |
| acento glaciar | #2DD4BF | #0F9F92 | acción principal, foco, en vivo |
| cobre | #E8834F | #C2410C | marca, gráficos secundarios |
| operando | #34D399 | #059669 | estado ok |
| aviso | #FBBF24 | #B45309 | estado de atención |
| alarma | #FF5470 | #E11D48 | falla, peligro, cuenta cerrada |
| información | #60A5FA | #2563EB | datos neutros |

**Movimiento:** una sola coreografía al entrar a cada pantalla (aparición escalonada de 60 ms entre bloques, 450 ms, curva `0.2, 0.7, 0.2, 1`); números que cuentan hasta su valor; gráficos que se dibujan; transición de página con desenfoque y desplazamiento de 8 px; brillo que sigue al cursor sobre las tarjetas; LED que laten solo cuando el equipo opera. Todo se apaga con `prefers-reduced-motion`.

**Espacio:** la información se ve completa. Ancho fluido de pantalla completa (sin columnas angostas centradas), barra lateral plegable a solo íconos, tablas con encabezado fijo que usan la altura disponible, y vistas de trabajo (PLC, planta) que ocupan toda la ventana con paneles redimensionables.

---

## 1. Web de administración

### 1.1 Ingreso
> Pantalla dividida. A la izquierda, panel de vidrio sobre la aurora con el logotipo SIMA en Bricolage Grotesque de 120 px, una línea que describe el sistema y una franja inferior con el pulso de la planta: 15 barras que suben y bajan como un ecualizador según el estado real de cada equipo. A la derecha, formulario sobrio sobre superficie oscura: correo, clave, código del segundo factor solo cuando se pide, botón glaciar con brillo al pasar el cursor. Debajo, las cuentas de demostración como fichas con iniciales, nombre y cargo; al tocar una, entra con una transición de expansión.

### 1.2 Marco general
> Barra lateral de vidrio de 264 px que se pliega a 76 px; grupos con título tenue, ícono y texto; la sección activa tiene una píldora glaciar que se desliza con resorte. Barra superior con buscador de comandos (Ctrl + K) que encuentra pantallas, personas, equipos y PLC; el pulso de la planta como mini barras de colores; campana de notificaciones que recibe en vivo alarmas, órdenes y cierres de cuenta; selector de tema noche/día; avatar con menú (seguridad, salir). El contenido usa todo el ancho.

### 1.3 Inicio por perfil (informe, sección 5)
> El inicio cambia según el perfil. Gerencia: «Resumen empresarial» con cuatro indicadores grandes con mini gráfico (dotación, OEE, cumplimiento del plan, incidentes), gráfico de área animado de producción de 30 días, dona de estados de equipos, lista de decisiones pendientes (aprobaciones de liquidaciones y de cambios PLC) y mapa compacto de la planta. Personas: contratos por vencer como línea de tiempo, cuentas por estado, habilitaciones vencidas, movimientos recientes. Finanzas: costo de remuneraciones por área en barras, cierre del período con su estado de aprobación, parámetros vigentes. Producción: OEE por equipo, órdenes de producción en curso con barra de avance, paradas del día. Calidad: no conformidades abiertas, lotes bloqueados, tasa de defectos. Logística: despachos por estado, OTIF, repuestos bajo el mínimo. Comercial: pedidos (despachos) por cliente y cumplimiento.

### 1.4 Trabajadores y ficha
> Tabla ancha con filtros en una barra de vidrio, avatar con iniciales de color estable por persona, chips de estado y de cuenta, sueldo alineado a la derecha en mono. La ficha abre con una cabecera grande: avatar, nombre en 48 px, cargo, chips, y acciones. Pestañas con píldora deslizante. Datos en cuadrículas de tarjetas; contratos como línea de tiempo vertical con el vigente iluminado.

### 1.5 Desvincular (momento estrella)
> Diálogo en tres pasos. En el último, la tarjeta de la persona muestra un candado que se cierra con un pequeño rebote, la etiqueta «Activa» gira y se vuelve «Cerrada» en coral, y cada efecto aparece con un check verde uno tras otro.

### 1.6 Planta en vivo
> Mapa a pantalla completa con las tres naves y la sala de máquinas como zonas de vidrio. Cada máquina es una ilustración animada (engranajes, cinta, brazo robótico) que solo se mueve si opera; el borde late en coral si tiene alarma. Al pasar el cursor, aparece una tarjeta con sus variables y medidores. A la derecha, las alarmas y órdenes en vivo.

### 1.7 Espacio de trabajo PLC (debe verse completo)
> Vista que ocupa toda la ventana. Arriba, la cabecera del PLC con su estado (LED grande), ciclo, último dato y mandos. En el centro, el rack escalado al ancho disponible, con módulos altos y LED de 16 px legibles; al pasar sobre un canal se resalta su fila de E/S. Debajo, un panel redimensionable con pestañas: tabla de E/S con filtros por equipo y tipo, programa en escalera con zoom y desplazamiento, y mandos. Nada se corta ni requiere hacer zoom del navegador.

### 1.8 Indicadores
> Diez tarjetas con el valor grande, la meta como marca en una barra de progreso y el estado; al pasar el cursor, la explicación de la fórmula. Debajo, el OEE por equipo como barras horizontales apiladas (disponibilidad, rendimiento, calidad).

---

## 2. App de terreno

> Misma identidad «Cordillera de noche», pensada para tablets y teléfonos con guantes: botones de 48 px, texto de 16 a 18 px, contraste alto. Inicio por perfil: operador «Mi trabajo» (orden de producción asignada, registrar piezas buenas y rechazadas con contadores grandes, reportar falla), supervisor «Mi turno» (dotación, habilitaciones del equipo, traspaso), técnico «Mis órdenes» (con bloqueo y etiquetado de 5 pasos), pañol «Pañol y bodega», calidad «Mis inspecciones» (registrar no conformidad), prevención «Seguridad» (incidentes). Barra inferior en el teléfono; barra lateral en tablet y escritorio. Aviso visible de «envíos pendientes» sin señal.

---

## 3. Simulador de PLC

> Software de ingeniería con estética de SCADA moderno. Barra superior con el PLC, la llave RUN/STOP, ciclo y velocidad. A la izquierda, el árbol de la planta (PLC → equipos). En el centro, la pantalla HMI del proceso: cada equipo dibujado como mímico animado (motor que gira, tuberías con flujo que avanza, depósito que se llena, termómetro que sube), con sus valores en mono y botones físicos (marcha verde, paro rojo, seta de emergencia). Encima, el rack del PLC con LED que encienden en tiempo real. Abajo, un panel redimensionable con escalera (corriente en verde), variables con forzado, tendencias y registro. Todo cabe en la ventana; el usuario puede maximizar cualquier panel.
