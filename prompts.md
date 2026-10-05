# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

## Prompt 1

**Modelo:** Opus Sonnet 5.5 Medium
**Herramienta:** Claude Code

```
Lee SOLO el requisito "Lo que cada tarea muestra de su responsable" en
openspec/specs/tasks/spec.md y los tests de backend/tests/ (tasks/ puede no tener ninguno; revisa también auth/).
Genera una tabla con una fila por scenario y cuatro columnas:
(1) el scenario en una línea, (2) nombre EXACTO del test que lo cubre
(archivo + título del test), (3) Cubierto / No cubierto / No lo sé,
(4) si es "No lo sé", qué te faltó para decidirlo.
Para marcar "Cubierto" abre el test y cita la línea del assert que comprueba
el THEN del scenario. Si el nombre coincide pero el assert comprueba otra
cosa o solo una parte, márcalo "No lo sé" y explica la diferencia.
No trabajes otros requisitos de la capability. No edites ningún archivo.
```

**Qué salió:** 
Requisito "Lo que cada tarea muestra de su responsable" (openspec/specs/tasks/spec.md:97). No hay ningún test en backend/tests/ que obtenga una tarea (no existe tasks/). Los cuatro ficheros de auth/ comprueban la cuenta de usuario, no el assignee de una tarea.

#	Scenario	Test que lo cubre (archivo + título)	Estado	Qué faltó para decidir
1	Responsable identificable: una tarea con responsable "Ada Lovelace" trae en assignee nombre e iniciales.	Ninguno por nombre. Lo más cercano: backend/tests/functional/auth/initials.spec.ts, «un nombre de dos palabras da la inicial de cada una».	No lo sé	El assert de la línea 33 (assert.equal(response.body().data.user.initials, esperadas)) comprueba data.user.initials en la respuesta de POST /auth/login. El THEN pide assignee con nombre e iniciales dentro de una tarea. El test usa el mismo nombre "Ada Lovelace" y 'AL', pero no pasa por tareas ni por assignee. Faltaría un test que cree una tarea con responsable y consulte /tasks.
2	La tarea no filtra datos de cuenta: el assignee de cualquier tarea, suelta o en la lista, no incluye email ni datos de acceso.	Ninguno.	No cubierto	Ningún test de auth/ ni otro mira un assignee. session.spec.ts:31 hace lo contrario: comprueba que el perfil propio sí incluye email.
3	Responsable sin nombre: el nombre llega nulo y las iniciales siguen llegando.	Ninguno por nombre. Lo más cercano: initials.spec.ts, «sin nombre, las iniciales salen del email», y signup.spec.ts, «una cuenta puede quedarse sin nombre».	No lo sé	Cada test cubre una mitad en la respuesta de login o signup, no en el assignee de una tarea. initials.spec.ts:33 comprueba las iniciales ('AE') en data.user.initials. signup.spec.ts:52 comprueba isNull(data.user.fullName). Ninguno ejerce el THEN sobre la tarea, y además esas iniciales salen del email, que es justo lo que este requisito quiere que la interfaz evite. Faltaría un test con una tarea cuyo responsable no tiene nombre.
Resumen: ningún scenario está cubierto con certeza. El 2 no tiene ningún test. Los 1 y 3 tienen tests de nombre parecido en auth/, pero sobre otro payload, así que los dejo en "No lo sé" según tu criterio. No he editado ningún archivo.

## Prompt 2

**Modelo:** Opus Sonnet 5.5 Medium
**Herramienta:** Claude Code

```
Para cada scenario marcado "No cubierto" en docs/verificacion/ipsv.md,
escribe UN test en backend/tests/functional/tasks/, siguiendo exactamente el
estilo de backend/tests/functional/auth/. Un test por scenario, nombrado con
el scenario. No modifiques nada fuera de backend/tests/. No ejecutes nada
todavía. Si el scenario no determina un valor (límites, vacíos, formatos),
dime qué valor elegiste y por qué.
```

**Qué salió:** 
Escribí un único fichero, assignee.spec.ts, con tres tests, uno por scenario, nombrados con el scenario. No ejecuté nada ni toqué nada fuera de backend/tests/.

Las tres filas de docs/verificacion/ipsv.md estaban en "NO Cubierto", así que hay un test para cada una. Las demás decisiones, para que las revises:

Valores que elegí porque el scenario no los fija

Día de referencia (today): 2026-01-15. GET /tasks/:id lo exige y devuelve 422 sin él. Nada de este requisito depende de qué día sea. Lo puse como constante fija, no DateTime.now(), para que el test no dependa del reloj.
Iniciales de la cuenta sin nombre: grace@example.com da 'GR'. Las derivo de la regla actual de User.initials (las dos primeras letras de la parte local del email). El scenario solo dice "siguen llegando", pero un isString sería demasiado laxo. Si esa regla cambia, el test dice cuál es el valor esperado.
Alcance: cada test comprueba la tarea suelta (GET /tasks/:id) y esa misma tarea dentro de GET /tasks. El scenario 2 lo nombra explícitamente. Los scenarios 1 y 3 dicen solo "se obtiene una tarea", y comprobar ambas vistas cuesta poco.
Qué cuenta como "datos de cuenta" en el scenario 2: email, password, createdAt y updatedAt no deben aparecer como claves. Además, el valor ada@example.com no debe aparecer en ninguna parte del JSON. El spec dice "ningún otro dato de acceso" sin concretar. Esta lista es mi lectura y puedes ampliarla o recortarla.
Quién observa: una cuenta distinta del responsable (observador@example.com), porque el scenario habla de la tarea de otra persona y la lista es la misma para todos.
Qué espero que falle
El scenario 2 debería fallar tal como está el código, y es un hallazgo real, no un defecto del test. task_transformer.ts usa UserTransformer para el assignee, y ese transformer incluye email, createdAt y updatedAt. Así que la lista y la creación de tareas filtran el email. El detalle (TaskDetailTransformer) sí usa el transformer recortado. Los scenarios 1 y 3 deberían pasar en ambas vistas. No arreglé el transformer porque pediste tocar solo backend/tests/.



## Prompt 3

**Modelo:** Opus Sonnet 5.5 Medium
**Herramienta:** Claude Code

```

```

**Qué salió:** 


## Prompt 4

**Modelo:** Opus Sonnet 5.5 Medium
**Herramienta:** Claude Code

```

```

**Qué salió:** 


## Prompt 5

**Modelo:** Opus Sonnet 5.5 Medium
**Herramienta:** Claude Code

```

```

**Qué salió:** 


## Prompt 6

**Modelo:** Opus Sonnet 5.5 Medium
**Herramienta:** Claude Code

```

```

**Qué salió:** 

