import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`, tanto en la tarea suelta como en la lista.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const HOY = '2026-01-15'

  async function sesion(client: any, email = 'observador@example.com') {
    await User.create({ fullName: 'Observador', email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  async function tareaDe(fullName: string | null, email = 'ada@example.com') {
    const responsable = await User.create({ fullName, email, password: 'secreto123' })

    return Task.create({ title: 'Escribir el motor', status: 'pending', assigneeId: responsable.id })
  }

  test('responsable identificable: el assignee trae el nombre y las iniciales', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const tarea = await tareaDe('Ada Lovelace')

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .header('Authorization', `Bearer ${token}`)
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    suelta.assertStatus(200)
    lista.assertStatus(200)

    const enLista = lista.body().data.find((t: { id: number }) => t.id === tarea.id)

    for (const assignee of [suelta.body().data.assignee, enLista.assignee]) {
      assert.equal(assignee.fullName, 'Ada Lovelace')
      assert.equal(assignee.initials, 'AL')
    }
  })

  test('la tarea no filtra datos de cuenta: el assignee no incluye el email', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const tarea = await tareaDe('Ada Lovelace')

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .header('Authorization', `Bearer ${token}`)
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    suelta.assertStatus(200)
    lista.assertStatus(200)

    const enLista = lista.body().data.find((t: { id: number }) => t.id === tarea.id)

    for (const assignee of [suelta.body().data.assignee, enLista.assignee]) {
      assert.notProperty(assignee, 'email')
      assert.notProperty(assignee, 'password')
      assert.notProperty(assignee, 'createdAt')
      assert.notProperty(assignee, 'updatedAt')
    }

    // Ni el valor del email aparece en ninguna parte de lo que se devuelve.
    assert.notInclude(JSON.stringify(suelta.body()), 'ada@example.com')
    assert.notInclude(JSON.stringify(lista.body()), 'ada@example.com')
  })

  test('responsable sin nombre: el nombre llega nulo y las iniciales siguen llegando', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const tarea = await tareaDe(null, 'grace@example.com')

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: HOY })
      .header('Authorization', `Bearer ${token}`)
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    suelta.assertStatus(200)
    lista.assertStatus(200)

    const enLista = lista.body().data.find((t: { id: number }) => t.id === tarea.id)

    for (const assignee of [suelta.body().data.assignee, enLista.assignee]) {
      assert.isNull(assignee.fullName)
      assert.equal(assignee.initials, 'GR')
      assert.notProperty(assignee, 'email')
    }
  })
})
