Estimación previa (a ojo, antes de abrir nada): creo que 3 de 3 scenarios están cubiertos.

Scenarios en el requisito: 3 · Cubiertos: ___

## Scenarios

1. Responsable identificable: una tarea con responsable "Ada Lovelace" trae en assignee nombre e iniciales. NO Cubierto

2. La tarea no filtra datos de cuenta: el assignee de cualquier tarea, suelta o en la lista, no incluye email ni datos de acceso. NO Cubierto

3. Responsable sin nombre: el nombre llega nulo y las iniciales siguen llegando. NO Cubierto

## Respuestas

1. Antes de mirar: 2 de 3. Al terminar: 0 de 3.
2. Responsable sin nombre: no supe si faltaba un test o la regla, porque las iniciales sin nombre salen del email según auth, pero tasks dice que la interfaz no debe recurrir al email y no dice nada de cómo se calculan en assignee.
3. Para el scenario del email tuve que elegir un today cualquiera (2026-10-05) para la tarea suelta y comprobar solo que el email y "password" no aparecen, sin fijar la lista de claves de assignee, porque la spec no dice si id está permitido.