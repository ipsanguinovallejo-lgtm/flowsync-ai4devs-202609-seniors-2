## Purpose

Documentar el comportamiento observable hoy del backend en el vertical de cuentas y acceso: registro, inicio de sesión, sesión (tokens) y perfil.

## Requirements

### Requirement: Registro de cuenta
El sistema SHALL permitir crear una cuenta nueva a partir de un email, una contraseña con su confirmación y un nombre completo opcional, y SHALL devolver de inmediato un usuario autenticado.

#### Scenario: Alta con datos válidos
- **WHEN** se envía `POST /api/v1/auth/signup` con `email` no registrado, `password` y `passwordConfirmation` de entre 8 y 32 caracteres iguales entre sí, y `fullName` como string o `null`
- **THEN** la respuesta tiene estado 200 y el cuerpo contiene `data.user` (con `id`, `fullName`, `email`, `createdAt`, `updatedAt`, `initials`, sin la contraseña) y `data.token` con un valor de token utilizable de inmediato para llamadas autenticadas

#### Scenario: Email ya registrado
- **WHEN** se envía `POST /api/v1/auth/signup` con un `email` que ya pertenece a otra cuenta
- **THEN** la respuesta tiene estado 422 y el cuerpo incluye un error sobre el campo `email` indicando que el valor ya existe

#### Scenario: Contraseña y confirmación no coinciden
- **WHEN** se envía `POST /api/v1/auth/signup` con `password` y `passwordConfirmation` de valores distintos
- **THEN** la respuesta tiene estado 422 y el cuerpo incluye un error sobre el campo `passwordConfirmation`

#### Scenario: Contraseña fuera de longitud
- **WHEN** se envía `POST /api/v1/auth/signup` con `password` de menos de 8 o más de 32 caracteres
- **THEN** la respuesta tiene estado 422 y el cuerpo incluye un error de longitud sobre el campo `password`

#### Scenario: Falta un campo obligatorio
- **WHEN** se envía `POST /api/v1/auth/signup` sin `email` o sin `password`/`passwordConfirmation`
- **THEN** la respuesta tiene estado 422 y el cuerpo incluye un error de campo requerido por cada campo ausente

### Requirement: Inicio de sesión
El sistema SHALL autenticar a un usuario existente por email y contraseña y SHALL emitir un nuevo token de acceso en cada inicio de sesión correcto.

#### Scenario: Credenciales correctas
- **WHEN** se envía `POST /api/v1/auth/login` con `email` y `password` que coinciden con una cuenta existente
- **THEN** la respuesta tiene estado 200 y el cuerpo contiene `data.user` y `data.token`, siendo este último un token distinto en cada llamada aunque se repitan las mismas credenciales

#### Scenario: Credenciales incorrectas
- **WHEN** se envía `POST /api/v1/auth/login` con un `email` inexistente o una `password` que no coincide con la cuenta
- **THEN** la respuesta tiene estado 400 y el cuerpo no distingue si el motivo fue el email o la contraseña

#### Scenario: Falta un campo obligatorio en login
- **WHEN** se envía `POST /api/v1/auth/login` sin `email` o sin `password`
- **THEN** la respuesta tiene estado 422 y el cuerpo incluye un error de campo requerido por cada campo ausente

### Requirement: Autenticación por token en rutas protegidas
El sistema SHALL exigir un token de acceso válido en la cabecera `Authorization: Bearer` para servir las rutas de cuenta protegidas, y SHALL aceptar dicho token sin límite de tiempo hasta que sea revocado explícitamente.

#### Scenario: Petición protegida sin token
- **WHEN** se llama a `GET /api/v1/account/profile` o a `POST /api/v1/account/logout` sin cabecera `Authorization`
- **THEN** la respuesta tiene estado 401

#### Scenario: Petición protegida con token inválido o revocado
- **WHEN** se llama a `GET /api/v1/account/profile` o a `POST /api/v1/account/logout` con un token que no existe o ya fue revocado
- **THEN** la respuesta tiene estado 401

#### Scenario: Petición protegida con token válido
- **WHEN** se llama a `GET /api/v1/account/profile` con un token emitido por un signup o login previos, sin importar cuánto tiempo haya pasado desde su emisión
- **THEN** la respuesta tiene estado 200 y devuelve los datos del usuario dueño del token

### Requirement: Cierre de sesión
El sistema SHALL revocar únicamente el token con el que se autenticó la petición de cierre de sesión, dejando intactos el resto de tokens que la misma cuenta tenga activos.

#### Scenario: Logout con el token actual
- **WHEN** se envía `POST /api/v1/account/logout` autenticado con un token válido
- **THEN** la respuesta tiene estado 200 con un mensaje de confirmación, y una petición posterior a `GET /api/v1/account/profile` con ese mismo token devuelve 401

#### Scenario: Logout no afecta a otros tokens de la misma cuenta
- **WHEN** una cuenta tiene dos tokens activos (por ejemplo, de dos inicios de sesión distintos) y se envía `POST /api/v1/account/logout` autenticado con uno de ellos
- **THEN** el otro token sigue siendo válido para `GET /api/v1/account/profile` después de esa llamada

### Requirement: Consulta de perfil
El sistema SHALL exponer los datos del usuario autenticado sin incluir en ningún momento la contraseña, ni en texto plano ni en forma de hash.

#### Scenario: Perfil de un usuario con nombre completo de dos palabras
- **WHEN** se llama a `GET /api/v1/account/profile` con un token válido cuyo usuario tiene `fullName` con al menos dos palabras (p. ej. "Ada Lovelace")
- **THEN** la respuesta tiene estado 200 y `data.initials` contiene la inicial de la primera y la última palabra en mayúsculas (p. ej. "AL")

#### Scenario: Perfil de un usuario sin nombre completo
- **WHEN** se llama a `GET /api/v1/account/profile` con un token válido cuyo usuario tiene `fullName` a `null`
- **THEN** la respuesta tiene estado 200 y `data.initials` contiene las dos primeras letras de la parte local del email en mayúsculas

#### Scenario: Campos expuestos del perfil
- **WHEN** se llama a `GET /api/v1/account/profile` con un token válido
- **THEN** la respuesta tiene estado 200 y `data` contiene exactamente `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`, sin ningún campo relacionado con la contraseña

### Requirement: Envoltorio y formato de toda respuesta
El sistema SHALL envolver toda respuesta de éxito del vertical de cuentas y acceso en un objeto con clave `data`, y SHALL responder siempre en formato JSON con independencia de la cabecera `Accept` recibida.

#### Scenario: Respuesta de éxito envuelta
- **WHEN** se completa con éxito cualquiera de `POST /api/v1/auth/signup`, `POST /api/v1/auth/login` o `GET /api/v1/account/profile`
- **THEN** el cuerpo de la respuesta es un objeto JSON cuya única clave de primer nivel con el contenido útil es `data`

#### Scenario: Petición que no pide JSON
- **WHEN** se envía cualquier petición al vertical de cuentas y acceso con una cabecera `Accept` distinta de `application/json` (o sin esa cabecera)
- **THEN** la respuesta se sirve igualmente en formato JSON

### Requirement: Origen cruzado del acceso a la API
El sistema SHALL permitir peticiones desde cualquier origen con credenciales incluidas mientras se ejecuta en modo de desarrollo, y SHALL no declarar ningún origen permitido por defecto fuera de ese modo.

#### Scenario: Preflight en modo desarrollo
- **WHEN** se envía una petición CORS de origen cruzado (con credenciales) contra cualquier ruta de `/api/v1` mientras el servidor corre en modo de desarrollo
- **THEN** la respuesta permite el origen solicitante y permite el envío de credenciales

#### Scenario: Origen cruzado fuera de modo desarrollo
- **WHEN** se envía una petición CORS de origen cruzado contra cualquier ruta de `/api/v1` mientras el servidor no corre en modo de desarrollo y no se ha configurado una lista de orígenes permitidos
- **THEN** la respuesta no autoriza ningún origen

### Requirement: Pantalla de registro
El sistema SHALL ofrecer una pantalla de registro con campos de nombre completo (opcional), email, contraseña y confirmación de contraseña, y SHALL impedir el envío cuando la contraseña y su confirmación no coinciden, sin necesidad de consultar al servidor.

#### Scenario: Contraseñas que no coinciden antes de enviar
- **WHEN** en la pantalla de registro se escribe una contraseña y una confirmación con valores distintos y se intenta enviar el formulario
- **THEN** se muestra bajo el campo de confirmación el aviso de que las contraseñas no coinciden, y no se produce ninguna llamada de red

#### Scenario: Registro correcto
- **WHEN** se completa la pantalla de registro con datos válidos y se envía
- **THEN** el botón de envío queda deshabilitado y cambia su texto a un estado de "creando cuenta" mientras dura el envío, y al terminar con éxito la persona queda viendo la pantalla de perfil

#### Scenario: El servidor rechaza el registro con errores de campo
- **WHEN** se envía el formulario de registro y el servidor responde con un error asociado a uno de los campos visibles en pantalla (nombre, email, contraseña o confirmación)
- **THEN** el aviso correspondiente aparece bajo ese campo en español y no se muestra un aviso general en la parte superior del formulario

#### Scenario: El servidor rechaza el registro con un error no asociado a un campo visible
- **WHEN** se envía el formulario de registro y el servidor responde con un error que no corresponde a ninguno de los campos mostrados en pantalla
- **THEN** se muestra un aviso general en la parte superior del formulario con el mensaje en español, y el envío deja de estar deshabilitado para permitir corregir y reintentar

#### Scenario: Navegación hacia inicio de sesión
- **WHEN** en la pantalla de registro se pulsa el enlace para quienes ya tienen cuenta
- **THEN** la persona pasa a ver la pantalla de inicio de sesión

### Requirement: Pantalla de inicio de sesión
El sistema SHALL ofrecer una pantalla de inicio de sesión con campos de email y contraseña, y SHALL mostrar un aviso comprensible cuando el envío falla o cuando la persona llega a la pantalla por haberse perdido una sesión previa.

#### Scenario: Inicio de sesión correcto
- **WHEN** se completa la pantalla de inicio de sesión con datos válidos y se envía
- **THEN** el botón de envío queda deshabilitado y cambia su texto a un estado de "entrando" mientras dura el envío, y al terminar con éxito la persona queda viendo la pantalla de perfil

#### Scenario: Credenciales rechazadas
- **WHEN** se envía el formulario de inicio de sesión y el servidor rechaza el email o la contraseña
- **THEN** se muestra un único aviso general indicando que el email o la contraseña no son correctos, sin señalar un campo concreto, y el formulario vuelve a estar disponible para reintentar

#### Scenario: Llegada a la pantalla tras perder una sesión previa
- **WHEN** la persona es dirigida a la pantalla de inicio de sesión porque una sesión anterior dejó de ser válida
- **THEN** se muestra un aviso explicando el motivo por el que se perdió esa sesión, incluso antes de que la persona intente enviar el formulario

#### Scenario: El aviso de un nuevo intento sustituye al aviso de sesión perdida
- **WHEN** tras ver el aviso de sesión perdida la persona envía el formulario y ese envío también falla
- **THEN** el aviso que queda visible es el del intento actual, no el de la sesión perdida

#### Scenario: Navegación hacia registro
- **WHEN** en la pantalla de inicio de sesión se pulsa el enlace para quienes no tienen cuenta
- **THEN** la persona pasa a ver la pantalla de registro

### Requirement: Pantalla de perfil
El sistema SHALL mostrar en la pantalla de perfil el nombre, el email, la fecha de alta y las iniciales de la persona autenticada, y SHALL ofrecer una acción para cerrar sesión desde esa misma pantalla.

#### Scenario: Datos mostrados en el perfil
- **WHEN** una persona autenticada ve la pantalla de perfil
- **THEN** se muestran su nombre (o un texto indicando que no tiene nombre, si no lo puso al registrarse), su email, sus iniciales y la fecha de alta en formato de fecha larga

#### Scenario: Cierre de sesión desde el perfil
- **WHEN** en la pantalla de perfil se pulsa la acción de cerrar sesión
- **THEN** el botón cambia su texto a un estado de "cerrando sesión" y, sin necesidad de que la persona navegue a mano, termina viendo la pantalla de inicio de sesión

### Requirement: Persistencia y restauración de la sesión al recargar
El sistema SHALL recordar la sesión entre recargas de página mientras el servidor siga reconociéndola, y SHALL mostrar una pantalla de carga mientras decide si esa sesión sigue siendo válida.

#### Scenario: Recarga con sesión válida
- **WHEN** se recarga la página teniendo una sesión iniciada previamente
- **THEN** se muestra una pantalla de carga y, al confirmarse la sesión, la persona termina viendo la pantalla que corresponda a su navegación (perfil si no pidió otra cosa) sin tener que volver a iniciar sesión

#### Scenario: Recarga sin haber iniciado sesión nunca
- **WHEN** se recarga o se abre la aplicación sin haber iniciado sesión antes
- **THEN** no se muestra la pantalla de carga de sesión y la persona ve directamente la pantalla de inicio de sesión

#### Scenario: Recarga con sesión que el servidor ya no reconoce
- **WHEN** se recarga la página con una sesión guardada que el servidor rechaza por no ser válida
- **THEN** la persona termina viendo la pantalla de inicio de sesión con un aviso explicando que la sesión ya no es válida

#### Scenario: Recarga con el servidor inalcanzable
- **WHEN** se recarga la página con una sesión guardada y el servidor no responde o responde con un error que no es de sesión inválida
- **THEN** la persona termina viendo la pantalla de inicio de sesión con un aviso de que no se pudo restaurar la sesión, y una recarga posterior con el servidor ya disponible puede volver a intentar restaurar esa misma sesión

### Requirement: Protección de pantallas según el estado de sesión
El sistema SHALL impedir ver la pantalla de perfil a quien no tiene una sesión válida, y SHALL impedir ver las pantallas de registro e inicio de sesión a quien ya tiene una sesión válida.

#### Scenario: Acceso al perfil sin sesión
- **WHEN** se intenta ver la pantalla de perfil sin una sesión válida
- **THEN** la persona es llevada a la pantalla de inicio de sesión en su lugar

#### Scenario: Acceso a registro o inicio de sesión con sesión ya activa
- **WHEN** se intenta ver la pantalla de registro o la de inicio de sesión teniendo ya una sesión válida
- **THEN** la persona es llevada a la pantalla de perfil en su lugar

#### Scenario: Estado de sesión aún sin resolver
- **WHEN** se intenta ver cualquier pantalla protegida o cualquier pantalla exclusiva para quienes no tienen sesión, mientras todavía se está comprobando si la sesión guardada es válida
- **THEN** se muestra una pantalla de carga en lugar de la pantalla pedida o de una redirección, hasta que la comprobación termina

#### Scenario: Ruta desconocida
- **WHEN** se navega a una dirección dentro de la aplicación que no corresponde a ninguna de las pantallas conocidas
- **THEN** la persona termina en la pantalla de perfil si tiene sesión válida, o en la de inicio de sesión si no la tiene, tras pasar por la protección de la pantalla de perfil


1. Cuántos requisitos escribió el agente, y cuántos comprobaste tú abriendo el código.

11 escribio la IA y revise 9

2. Las incoherencias que aparecieron al escribirla.

Regla generalizada: "El sistema SHALL envolver toda respuesta de éxito del vertical de cuentas y acceso en un objeto con clave data" (Requirement "Envoltorio y formato de toda respuesta", línea 87).
Dónde se rompe: backend/app/controllers/access_tokens_controller.ts, método destroy (logout), líneas 25-27 — hace return { message: 'Logged out successfully' } directamente, sin pasar por serialize() como sí hacen store de ese mismo controlador y los demás controladores.
Cómo se ve desde fuera: POST /api/v1/account/logout con un token válido responde 200 con cuerpo {"message":"Logged out successfully"} — sin envolver en data, a diferencia de signup, login y profile, que responden {"data": {...}}.
Nota: en el propio Scenario "Respuesta de éxito envuelta" (línea 89-91) ya excluí logout del WHEN sin decir por qué; ahí quedó camuflada la excepción en vez de declarada.

3. Lo que no supiste decidir si era un bug o el contrato.

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
