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

**Modelo:** Sonnet 5
**Herramienta:** Claude Code

```
Vamos a escribir una spec viva de lo que este sistema hace HOY en el vertical de cuentas y acceso: registro, inicio de sesión, sesión y perfil, en sus dos capas. Backend: rutas, controladores, modelo de usuario, validadores y middlewares. Frontend: pantallas de acceso, estado de sesión y protección de rutas. Nada fuera de ese vertical, aunque encuentres otras partes.

Todavía no escribas la spec. Léelo y devuélveme: (1) un inventario de comportamientos observables agrupados por capacidad, con una línea cada uno; (2) los puntos donde leyendo el código no puedes decidir si algo es intencional. No modifiques código, no ejecutes openspec y no inicialices nada.
```

**Qué salió:** 
(1) Inventario de comportamientos observables por capacidad
Registro (signup)

POST /api/v1/auth/signup crea un usuario con fullName (nullable), email único, password/passwordConfirmation (8–32 chars, deben coincidir) — validators/user.ts, new_account_controller.ts
Contraseña se hashea vía withAuthFinder al guardar el modelo (no se ve el hash en texto plano en ninguna respuesta) — user.ts
Tras crear el usuario se emite inmediatamente un access token (opaco) y se devuelve { user, token } — no hay paso de confirmación de email — new_account_controller.ts
El token creado no tiene expiración configurada (no se pasa expiresIn a accessTokens.create) — sesiones de API indefinidas
Frontend: RegisterPage valida coincidencia de contraseñas en cliente antes de llamar al backend, pero la validación real es la del backend — register-page.tsx
Frontend: campo fullName viaja siempre como null si está vacío tras trim(), nunca como string vacío
Inicio de sesión (login)

POST /api/v1/auth/login valida email + password (sin reglas de longitud en login, solo en signup) y usa User.verifyCredentials — access_tokens_controller.ts
Credenciales inválidas → excepción E_INVALID_CREDENTIALS, mapeada en frontend a HTTP 400 → mensaje genérico "El email o la contraseña no son correctos" — lib/api.ts
Login exitoso emite un nuevo access token cada vez (multi-sesión: no invalida tokens previos)
Sesión / tokens

Autenticación vía guard api (Bearer token opaco, DbAccessTokensProvider), guard web (sesión) está configurado en config/auth.ts pero no se usa en ninguna ruta
silent_auth_middleware corre globalmente en todas las rutas (ctx.auth.check()), permitiendo que auth.getUserOrFail() funcione en rutas protegidas sin duplicar la comprobación
force_json_response_middleware fuerza Accept: application/json en toda petición, incluso si el cliente pidió otra cosa
POST /api/v1/account/logout revoca solo el token actual (user.currentAccessToken) — otros tokens/dispositivos de la misma cuenta siguen vivos
Frontend: token se guarda en localStorage bajo flowsync.token, no en cookie — vulnerable a XSS por diseño (sin httpOnly)
Frontend: al arrancar, si hay token guardado, se llama a GET /account/profile para revalidar; en 401 se limpia la sesión; en cualquier otro error (red, 500) el token se descarta del estado en memoria pero no se borra de localStorage — auth-provider.tsx:60-70
Frontend: logout() limpia la sesión local siempre, incluso si la llamada al backend falla (.catch(() => undefined))
Perfil

GET /api/v1/account/profile requiere auth, devuelve id, fullName, email, createdAt, updatedAt, initials vía UserTransformer — nunca expone password — user_transformer.ts
initials es una propiedad computada del modelo: iniciales de nombre+apellido si fullName tiene dos palabras, si no, primeras 2 letras del email
Frontend ProfilePage no muestra updatedAt, solo createdAt ("Miembro desde")
Protección de rutas / navegación (frontend)

ProtectedRoute y PublicOnlyRoute son espejo uno del otro, ambos bloquean en estado loading con un FullScreenLoader
Ruta catch-all (*) redirige siempre a /profile, incluso para anónimos — el bounce a /login ocurre un trender después vía ProtectedRoute, no en la propia ruta catch-all
Único guard de auth expuesto es middleware.auth() sin especificar guards, por lo que usa el guard api por defecto de config/auth.ts
CORS / transporte

En desarrollo, CORS permite cualquier origen (app.inDev ? true : []) con credentials: true — en producción la allowlist está vacía por defecto (bloquea todo cross-origin hasta configurar)
(2) Puntos donde el código no basta para decidir intención
Tokens de API sin expiración — User.accessTokens.create(user) no pasa expiresIn. ¿Es una decisión deliberada para el contexto de curso/práctica, o un olvido antes de producción? No hay comentario ni config que lo explique.
Guard web configurado pero sin usar — está completo en config/auth.ts (con useRememberMeTokens: false explícito) pero ninguna ruta lo referencia. ¿Vestigio, preparación para algo futuro (SSR, admin panel), o boilerplate del scaffold de Adonis sin limpiar?
Logout que revoca solo el token actual — ¿multi-sesión es un requisito intencional (varios dispositivos coexistiendo) o simplemente no se ha pensado un "cerrar sesión en todos los dispositivos"?
Fallo no-401 en rehidratación deja el token en localStorage pero el estado en memoria pasa a anonymous — el comentario en el código explica el porqué ("un corte de red pasajero no debería cerrar sesión"), pero el efecto observable es un estado inconsistente entre localStorage (con token) y UI (mostrando login). ¿Se espera que un F5 posterior repare esto automáticamente (sí, porque relee localStorage), o es un estado zombi tolerado a propósito?
Ruta catch-all * → siempre /profile — para un usuario anónimo esto fuerza un doble redirect (* → /profile → ProtectedRoute → /login) en vez de decidir el destino según status directamente. ¿Es simplicidad deliberada o descuido?
loginValidator no aplica minLength/maxLength a password (a diferencia de signupValidator) — ¿intencional (no se quiere rechazar en login a usuarios cuya contraseña ya no cumple reglas nuevas) o inconsistencia no notada?
Mapeo de errores por código HTTP en el frontend es frágil por diseño: 400 se interpreta siempre como "credenciales inválidas" sin mirar el cuerpo — cualquier otro 400 futuro del backend (de cualquier endpoint) heredaría ese mensaje. ¿Contrato aceptado conscientemente o punto ciego?
fullName nullable sin mínimo de longitud ni sanitización — un fullName de un solo carácter o con espacios raros es válido; initials con nombre de una sola palabra cae al .slice(0,2) del "first" token, no del email. ¿Comportamiento de fallback aceptado o no contemplado como caso?
CORS credentials: true combinado con origin: true en dev — funcionalmente abre credenciales a cualquier origen en local. Aceptable en un entorno de práctica, pero no hay indicación de si ese patrón se pretende llevar a producción tal cual o si hay un plan de allowlist pendiente.
Ningún archivo fue modificado; no se ejecutó openspec ni se inicializó nada.

## Prompt 2

**Modelo:** Sonnet 5
**Herramienta:** Claude Code

```
Escribe en docs/spec-viva/ipsv.md la spec del BACKEND del vertical de cuentas y acceso, tal como se comporta hoy. Formato obligatorio: un `## Purpose` de una o dos frases; después `## Requirements`, y colgando `### Requirement:` con el sistema SHALL hacer algo; bajo cada requisito, al menos un `#### Scenario:` con dos viñetas `- **WHEN**` y `- **THEN**` (sin GIVEN: la precondición va dentro del WHEN). Castellano, salvo las mayúsculas de la RFC.

Reglas duras: (1) nada de secciones ADDED, MODIFIED ni REMOVED; (2) solo comportamiento observable desde fuera: URL, método, cuerpo, estado y mensaje de respuesta; ni un nombre de clase, de archivo ni de ruta de código; (3) no toques código. Describe lo que hace, no lo que debería hacer: si algo parece un bug, escríbelo como ocurre y menciónalo aparte en el chat, sin corregirlo.
```

**Qué salió:** 
He escrito docs/spec-viva/ipsv.md con 8 requisitos del backend (registro, login, autenticación por token, logout, perfil, envoltorio de respuesta, CORS).

Tres puntos que documenté "tal como ocurren", sin corregir, porque huelen a bug o decisión no explicitada en el código:

Tokens sin expiración: un token emitido en signup/login sigue siendo válido indefinidamente hasta que se revoca a mano vía logout — no hay caducidad por tiempo.
Logout de un solo token: cerrar sesión solo revoca el token con el que se autenticó esa llamada; si la misma cuenta tiene varios tokens activos (varios logins), el resto queda vivo.
Login sin distinguir el motivo del fallo: un 400 en login no dice si fue el email o la contraseña — el mensaje genérico es indistinguible entre "usuario no existe" y "contraseña incorrecta".
Ningún archivo de código fue tocado.


## Prompt 3

**Modelo:** Sonnet 5
**Herramienta:** Claude Code

```
Añade al mismo archivo, en el mismo formato y bajo el mismo `## Requirements`, los requisitos del FRONTEND del vertical de cuentas y acceso: pantallas de registro, inicio de sesión y perfil, estado de sesión y protección de rutas. Observable en pantalla es lo que una persona ve y puede hacer: textos, avisos, redirecciones, qué pasa al recargar, con el servidor caído o con una sesión rechazada. Mismas reglas duras que antes, sin nombres de componente, hook o archivo. No repitas lo que ya dice la parte de backend: solo lo que ocurre en la interfaz.
```

**Qué salió:** 
Añadidos 6 requisitos de frontend a docs/spec-viva/ipsv.md: pantalla de registro, pantalla de inicio de sesión, pantalla de perfil, persistencia/restauración de sesión al recargar, y protección de pantallas por estado de sesión.

Un comportamiento documentado "tal como ocurre" que vale la pena señalar: en el escenario de "ruta desconocida", una persona sin sesión que navega a una URL cualquiera no ve error 404 — primero es enviada a la pantalla de perfil, y solo entonces la protección de esa pantalla la redirige a inicio de sesión. Es un doble salto invisible para quien lo mira desde fuera, no un único redirect directo.


## Prompt 4

**Modelo:** Sonnet 5
**Herramienta:** Claude Code

```
Revisa docs/spec-viva/ipsv.md contra estas reglas y lista los incumplimientos con su línea, sin corregir nada: (1) aparece ADDED, MODIFIED o REMOVED; (2) aparece un nombre de archivo, clase, función o ruta de código; (3) hay requisitos que no son de cuentas y acceso; (4) algún Scenario carece de WHEN o de THEN; (5) hay un GIVEN. Al final dime cuántos requisitos hay.
```

**Qué salió:** 
Revisión completa del archivo (202 líneas, 11 requisitos... verifico exacto abajo). Resultado por regla:

(1) ADDED/MODIFIED/REMOVED — sin incumplimientos. No aparece ninguna de esas palabras.

(2) Nombre de archivo, clase, función o ruta de código — sin incumplimientos claros de identificadores internos (no hay nombres de clase/función/archivo). Zona gris a valorar: las rutas HTTP (POST /api/v1/auth/signup, etc., líneas 11, 15, 19, 23, 27, 34, 38, 42, 49, 53, 57, 64, 68, 75, 79, 83, 90, 94, 101, 105) y los nombres de campo JSON (email, password, data.user, data.token, data.initials, etc.) son endpoints y forma del cuerpo — comportamiento observable desde fuera, no rutas de código fuente ni símbolos internos. No los cuento como incumplimiento, pero los marco por si tu criterio es más estricto.

(3) Requisitos ajenos a cuentas y acceso — sin incumplimientos. Los 11 requisitos son registro, login, autenticación por token, logout, perfil, envoltorio de respuesta, CORS (backend) y pantallas de registro/login/perfil, persistencia de sesión, protección de rutas (frontend) — todos dentro del vertical.

(4) Scenario sin WHEN o sin THEN — sin incumplimientos. Los 27 escenarios tienen ambas viñetas.

(5) GIVEN presente — sin incumplimientos. No aparece la palabra GIVEN en ningún escenario.

Total de requisitos: 11 (7 de backend, líneas 7–106; 4 de frontend, líneas 108–201).

No he corregido nada en el archivo.

## Prompt 5

**Modelo:** Sonnet 5
**Herramienta:** Claude Code

```
De la spec docs/spec-viva/ipsv.md, hazme una tabla con una fila por requisito y tres columnas: el requisito (título corto), dónde tengo que mirar en el código para contrastarlo (archivo y función) y cómo comprobarlo ejecutando el sistema (petición concreta o pasos en pantalla). No marques ninguno como comprobado: eso lo hago yo. No modifiques la spec ni el código.
```

**Qué salió:** 
Requisito	Dónde mirar en el código	Cómo comprobarlo ejecutando el sistema
Registro de cuenta	backend/app/controllers/new_account_controller.ts (store), backend/app/validators/user.ts (signupValidator)	POST http://localhost:3333/api/v1/auth/signup con body {fullName, email, password, passwordConfirmation} variando: datos válidos, email repetido, contraseñas distintas, password de 4 u 40 caracteres, campos ausentes; mirar código de estado y cuerpo en cada caso
Inicio de sesión	backend/app/controllers/access_tokens_controller.ts (store), backend/app/validators/user.ts (loginValidator)	POST http://localhost:3333/api/v1/auth/login con credenciales correctas dos veces seguidas (comparar que el token cambia), con email/password incorrectos, y sin uno de los dos campos
Autenticación por token en rutas protegidas	backend/app/middleware/auth_middleware.ts (handle), backend/app/middleware/silent_auth_middleware.ts (handle), backend/config/auth.ts (guard api)	GET http://localhost:3333/api/v1/account/profile y POST .../account/logout sin cabecera Authorization, con un token inventado, y con un token real obtenido de login/signup
Cierre de sesión	backend/app/controllers/access_tokens_controller.ts (destroy)	Hacer login dos veces para la misma cuenta (dos tokens), llamar POST /api/v1/account/logout con el primer token, luego GET /api/v1/account/profile con ese mismo token (esperar 401) y con el segundo token (esperar 200)
Consulta de perfil	backend/app/controllers/profile_controller.ts (show), backend/app/transformers/user_transformer.ts (toObject), backend/app/models/user.ts (getter initials)	GET /api/v1/account/profile con un usuario de fullName de dos palabras, con otro de fullName nulo, y revisar que el JSON solo trae id, fullName, email, createdAt, updatedAt, initials
Envoltorio y formato de toda respuesta	backend/providers/api_provider.ts (inyección de serialize), backend/app/middleware/force_json_response_middleware.ts (handle)	Repetir cualquier llamada de signup/login/perfil y comprobar que el cuerpo viene como { data: ... }; repetir una llamada enviando cabecera Accept: text/html y comprobar que igualmente responde JSON
Origen cruzado del acceso a la API	backend/config/cors.ts	Con el backend en modo dev (npm run dev), hacer una petición fetch desde otro origen (por ejemplo la consola del navegador en una pestaña de otro dominio) contra /api/v1/auth/login con credentials: 'include' y mirar las cabeceras Access-Control-Allow-Origin/Allow-Credentials de la respuesta
Pantalla de registro	frontend/src/pages/register-page.tsx, frontend/src/auth/use-auth-form.ts (submit)	En http://localhost:5173/register: escribir contraseñas distintas y enviar (sin red); enviar datos válidos y observar el botón y la redirección a /profile; forzar un email ya registrado y ver el aviso bajo el campo email
Pantalla de inicio de sesión	frontend/src/pages/login-page.tsx, frontend/src/auth/auth-provider.tsx (sessionError)	En /login: enviar credenciales incorrectas y ver el aviso general; llegar a /login por expulsión de una sesión inválida (ver escenario de recarga) y comprobar el aviso de sesión perdida antes de tocar el formulario
Pantalla de perfil	frontend/src/pages/profile-page.tsx	Con sesión iniciada, ir a /profile y verificar nombre, email, iniciales y fecha; pulsar "Cerrar sesión" y ver el cambio de texto del botón y el aterrizaje en /login
Persistencia y restauración de la sesión al recargar	frontend/src/auth/auth-provider.tsx (efecto de rehidratación, useEffect)	Con sesión iniciada, recargar la página (F5) y comprobar la pantalla de carga breve seguida del perfil; borrar/corromper el token en localStorage (flowsync.token) y recargar; parar el backend y recargar con un token guardado válido
Protección de pantallas según el estado de sesión	frontend/src/routes/protected-route.tsx, frontend/src/routes/public-only-route.tsx, frontend/src/routes/app-routes.tsx	Sin sesión, navegar directo a /profile (debe ir a /login); con sesión, navegar a /login o /register (debe ir a /profile); navegar a una ruta inexistente como /foo con y sin sesión
No he modificado la spec ni el código.

## Prompt 6

**Modelo:** Sonnet 5
**Herramienta:** Claude Code

```
Cuenta los `### Requirement:` de docs/spec-viva/ipsv.md y dame solo el número.
```

**Qué salió:** 
11
## Prompt 7

**Modelo:** Sonnet 5
**Herramienta:** Claude Code

```
Mientras escribías la spec has generalizado reglas del tipo "siempre" o "todas las respuestas". Para cada una que el código o la pantalla no cumpla en todas partes, dame una línea: qué regla parecía general, dónde se rompe y cómo se ve desde fuera (petición y respuesta, o pantalla). Solo lo que hayas visto en el código o ejecutado; si no está comprobado, dilo. No propongas arreglos.
```

**Qué salió:** 
Repasando lo que escribí contra el código que efectivamente leí (no he ejecutado nada del sistema en este turno):

Regla generalizada: "El sistema SHALL envolver toda respuesta de éxito del vertical de cuentas y acceso en un objeto con clave data" (Requirement "Envoltorio y formato de toda respuesta", línea 87).
Dónde se rompe: backend/app/controllers/access_tokens_controller.ts, método destroy (logout), líneas 25-27 — hace return { message: 'Logged out successfully' } directamente, sin pasar por serialize() como sí hacen store de ese mismo controlador y los demás controladores.
Cómo se ve desde fuera: POST /api/v1/account/logout con un token válido responde 200 con cuerpo {"message":"Logged out successfully"} — sin envolver en data, a diferencia de signup, login y profile, que responden {"data": {...}}.
Nota: en el propio Scenario "Respuesta de éxito envuelta" (línea 89-91) ya excluí logout del WHEN sin decir por qué; ahí quedó camuflada la excepción en vez de declarada.
No he visto (ni ejecutado) ninguna otra ruptura de una regla "siempre"/"toda" de las que escribí — el resto de generalizaciones (formato JSON forzado siempre, token sin expiración, logout que solo revoca el token actual, etc.) las contrasté solo leyendo el código que las implementa directamente y no encontré una excepción en ese mismo código; no las he comprobado ejecutando peticiones reales, así que no puedo garantizar que se cumplan en todos los casos, solo que el código que vi no las contradice.



## Prompt 8

**Modelo:** Sonnet 5
**Herramienta:** Claude Code

```
De lo que has visto en este vertical, sepárame lo que es un bug claro de lo que podría ser el contrato o un bug según a quién se pregunte. Para lo segundo, por cada caso escribe: qué hace hoy el sistema, la lectura A (es intencional) y la lectura B (es un error) en una frase cada una, y por qué leyendo el código no se puede decidir. Incluye también lo que solo se vería al cabo del tiempo o en otro entorno. Si algo lo puedes decidir con el código, no lo pongas aquí.
```

**Qué salió:** 
Bug claro (decidible leyendo el código)
Respuesta de logout sin envolver. Todos los controladores de este vertical devuelven sus respuestas de éxito pasadas por serialize() (que las envuelve en { data: ... }) — signup, login y profile lo hacen así — pero destroy (logout) en access_tokens_controller.ts devuelve { message: 'Logged out successfully' } directamente, sin pasar por serialize(). Es el único punto del vertical que rompe su propio patrón interno sin ninguna razón visible en el código (ni comentario, ni caso especial): comparar ese método con sus tres hermanos basta para verlo como una inconsistencia, no como una decisión.

Contrato o bug según a quién se pregunte
Tokens de API sin expiración.

Qué hace hoy: un token emitido en signup o login sigue siendo válido indefinidamente hasta que se revoca a mano.
Lectura A: es aceptable para un proyecto de práctica donde la vida útil del token no importa.
Lectura B: falta una política de expiración que cualquier sistema real necesitaría antes de producción.
Por qué no se decide con el código: no hay comentario, configuración ni test que indique si la ausencia de expiresIn es una omisión temporal o un límite consciente del alcance del ejercicio. Solo se notaría con el tiempo: un token de hace meses seguiría funcionando igual que uno recién creado.
Guard web (sesión) configurado pero sin usar.

Qué hace hoy: config/auth.ts define un guard web completo, con useRememberMeTokens: false explícito, pero ninguna ruta lo referencia.
Lectura A: es preparación consciente para una futura ruta que use sesión (por ejemplo, un panel server-rendered).
Lectura B: es boilerplate del scaffold de AdonisJS que nadie ha limpiado.
Por qué no se decide con el código: ambas hipótesis producen el mismo archivo hoy. Solo se distinguiría si aparece una ruta nueva que lo use, o si se audita el histórico de commits para ver si fue tocado deliberadamente.
Logout que revoca solo el token actual.

Qué hace hoy: cerrar sesión no afecta a otros tokens activos de la misma cuenta (otros dispositivos o pestañas con login independiente).
Lectura A: es multi-sesión intencional, coherente con no invalidar todo por cerrar sesión en un sitio.
Lectura B: falta un "cerrar sesión en todos los dispositivos" que se dio por sentado sin implementar.
Por qué no se decide con el código: la lógica es simétrica y limpia en ambos casos; nada indica cuál de las dos era la intención original. Solo se manifiesta si alguien usa la cuenta desde dos sitios a la vez, algo que no aparece en un flujo de prueba normal de una sola sesión.
Estado inconsistente tras un fallo de red al rehidratar la sesión.

Qué hace hoy: si al recargar la página el backend no responde (o responde con algo distinto de 401), el frontend borra el token del estado en memoria pero no lo borra de localStorage.
Lectura A: es intencional — el comentario en el propio código dice que un corte de red pasajero no debería cerrar la sesión guardada, y una recarga posterior con el backend disponible la recupera.
Lectura B: es un estado a medias no contemplado — el usuario ve login mientras localStorage sigue teniendo un token "vivo" del que la interfaz no vuelve a intentar la revalidación por sí sola sin una recarga manual.
Por qué no se decide con el código: el comentario explica la decisión de no borrar el token, pero no dice si el efecto colateral (UI y storage desincronizados hasta la próxima recarga) es un resultado aceptado o algo que se pasó por alto. Solo se vería con una red inestable real, no en un entorno de desarrollo local donde el backend rara vez falla a mitad de sesión.
Ruta desconocida provoca doble redirección para un usuario anónimo.

Qué hace hoy: cualquier URL no reconocida redirige primero a /profile, y solo entonces la protección de esa pantalla rebota a /login.
Lectura A: es simplicidad deliberada — un único destino por defecto y dejar que la protección de rutas resuelva el resto.
Lectura B: es un descuido — debería decidir el destino final según el estado de sesión en un solo salto.
Por qué no se decide con el código: el resultado final visible es el mismo (login o perfil, según corresponda); la diferencia es solo el número de saltos intermedios, algo que no deja rastro de intención en el código.
loginValidator sin límites de longitud en la contraseña (a diferencia de signupValidator).

Qué hace hoy: el login acepta una contraseña de cualquier longitud, mientras que el registro exige entre 8 y 32 caracteres.
Lectura A: es intencional, para no bloquear a usuarios cuya contraseña ya no cumpliría una regla añadida después.
Lectura B: es una inconsistencia entre los dos validadores que comparten builders de campo pero no se sincronizaron.
Por qué no se decide con el código: no hay comentario que justifique la asimetría. Solo se notaría en otro entorno o con el tiempo: si algún día se endurecen las reglas de password(), las cuentas antiguas con contraseñas fuera del nuevo rango seguirían pudiendo iniciar sesión sin que nada en el código actual lo señale como previsto.
Todo error 400 en el frontend se traduce como "credenciales incorrectas".

Qué hace hoy: lib/api.ts interpreta cualquier respuesta 400 de cualquier endpoint del vertical como fallo de login, sin mirar el cuerpo.
Lectura A: es un atajo válido porque hoy el único 400 real que puede llegar es el de credenciales inválidas.
Lectura B: es un acoplamiento frágil que dará un mensaje incorrecto en cuanto exista otro 400 en el vertical.
Por qué no se decide con el código: es correcto para el conjunto de endpoints que existen hoy; su carácter de bug latente solo se revela si se añade una ruta nueva o cambia el backend, es decir, en una versión futura del sistema, no en el estado actual.
CORS abierto (origin: true, credentials: true) en modo desarrollo.

Qué hace hoy: en desarrollo se acepta cualquier origen con credenciales; en producción la lista de orígenes permitidos está vacía por defecto.
Lectura A: es una comodidad de desarrollo local sin riesgo, ya limitada correctamente para producción.
Lectura B: es un patrón que alguien podría copiar sin darse cuenta al configurar la lista de producción más adelante.
Por qué no se decide con el código: el comentario en cors.ts explica la intención para hoy, pero nada garantiza qué pasará cuando se configure la allowlist de producción; ese riesgo solo se vería en ese otro entorno, no en el actual.
