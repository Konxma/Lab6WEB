const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { configureApp } = require('../dist/configure-app');
const { TrimPipe } = require('../dist/common/pipes/trim.pipe');

test('TrimPipe: вкладені об’єкти, масиви та збереження типів', () => {
  const source = { title: '  Coat  ', nested: { tags: ['  blue ', { material: ' cotton ' }] }, count: 2, flag: false, empty: null };
  const result = new TrimPipe().transform(source, { type: 'body' });
  assert.deepEqual(result, { title: 'Coat', nested: { tags: ['blue', { material: 'cotton' }] }, count: 2, flag: false, empty: null });
  assert.equal(source.title, '  Coat  ');
  assert.equal(new TrimPipe().transform('  M ', { type: 'param' }), 'M');
  assert.equal(new TrimPipe().transform(undefined, { type: 'query' }), undefined);
  const query = Object.assign(Object.create(null), { search: '  Basic  ' });
  assert.deepEqual(new TrimPipe().transform(query, { type: 'query' }), { search: 'Basic' });
});

test('Лабораторна №6: реальний HTTP-конвеєр та регресія модулів №5', async (t) => {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}`;
  const results = [];
  t.after(async () => {
    await app.close();
    const folder = path.join(__dirname, '..', 'evidence');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'api-results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  });
  async function request(method, route, body, raw = false) {
    const response = await fetch(base + route, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    const result = { method, path: route, requestBody: body, status: response.status, headers: Object.fromEntries(response.headers), body: data };
    results.push(result);
    if (response.ok) assert.match(result.headers['x-response-time'], /^\d+\.\d{2}ms$/);
    return result;
  }
  function error(result, status) {
    assert.equal(result.status, status);
    assert.equal(result.body.success, false);
    assert.equal(result.body.statusCode, status);
    assert.equal(result.body.path, result.path);
    assert.equal(result.body.method, result.method);
    assert.ok(Number.isFinite(Date.parse(result.body.timestamp)));
    assert.ok(Array.isArray(result.body.message));
    assert.equal(typeof result.body.error, 'string');
    assert.deepEqual(Object.keys(result.body).sort(), ['success', 'statusCode', 'timestamp', 'path', 'method', 'error', 'message'].sort());
  }
  const valid = { title: '  Футболка Basic  ', price: 799.99, size: 'M', material: '  Бавовна  ', color: '  Синій  ' };
  let created;

  await t.test('1. Валідний POST: 201, trim та X-Response-Time', async () => {
    const result = await request('POST', '/clothes', valid);
    assert.equal(result.status, 201);
    created = result.body;
    assert.equal(created.title, 'Футболка Basic');
    assert.equal(created.material, 'Бавовна');
    assert.equal(created.color, 'Синій');
    assert.equal(created.price, 799.99);
    assert.equal(created.slug, 'futbolka-basic');
  });

  await t.test('2. Заборонені поля: whitelist + forbidNonWhitelisted', async () => {
    const result = await request('POST', '/clothes', { ...valid, hackerField: 'malicious' });
    error(result, 400);
    assert.ok(result.body.message.includes('property hackerField should not exist'));
  });

  await t.test('3. Рядок замість числової ціни: уніфікована помилка', async () => {
    const result = await request('POST', '/clothes', { ...valid, price: '799.99' });
    error(result, 400);
    assert.ok(result.body.message.some((message) => message.includes('price')));
    assert.equal(result.body.error, 'Bad Request');
  });

  await t.test('4. GET ?limit=5: реальне число та п’ять товарів', async () => {
    for (let i = 0; i < 4; i++) assert.equal((await request('POST', '/clothes', { ...valid, title: `Товар ${i}` })).status, 201);
    const result = await request('GET', '/clothes?limit=5');
    assert.equal(result.status, 200);
    assert.equal(result.body.length, 5);
    assert.equal(result.headers['x-limit-type'], 'number');
    assert.equal(result.headers['x-applied-limit'], '5');
    for (const query of ['limit=0', 'limit=-1', 'limit=1.5', 'limit=nope', 'limit=', 'limit=2&limit=3', 'hackerField=1']) {
      error(await request('GET', `/clothes?${query}`), 400);
    }
    const filtered = await request('GET', '/clothes?search=%20Basic%20&limit=1');
    assert.equal(filtered.body.length, 1);
    assert.equal(filtered.body[0].id, created.id);
  });

  await t.test('5. Межі варіанта 3: ціна, розмір, матеріал, колір і назва', async () => {
    for (const body of [
      { ...valid, price: 0 }, { ...valid, price: -1 }, { ...valid, price: 12.345 },
      { ...valid, price: null }, { ...valid, price: true },
      { ...valid, size: 'XXL' }, { ...valid, size: 'm' }, { ...valid, size: 42 },
      { ...valid, title: '   ' }, { ...valid, material: '   ' }, { ...valid, color: false },
      {}, [], null,
    ]) error(await request('POST', '/clothes', body), 400);
    for (const field of ['title', 'price', 'size', 'material', 'color']) {
      const body = { ...valid };
      delete body[field];
      error(await request('POST', '/clothes', body), 400);
    }
    for (const size of ['XS', 'S', 'M', 'L', 'XL']) {
      assert.equal((await request('POST', '/clothes', { ...valid, size })).status, 201);
    }
  });

  await t.test('6. PATCH: часткове оновлення, валідація та новий slug', async () => {
    const result = await request('PATCH', `/clothes/${created.id}`, { title: '  Худі Basic  ', size: 'XL' });
    assert.equal(result.status, 200);
    assert.equal(result.body.slug, 'khudi-basic');
    assert.equal(result.body.price, created.price);
    assert.equal(result.body.size, 'XL');
    for (const body of [{ price: 0 }, { price: '100' }, { size: 'XXL' }, { material: '  ' }, { color: 5 }, { hackerField: true }]) {
      error(await request('PATCH', `/clothes/${created.id}`, body), 400);
    }
    assert.equal((await request('PATCH', `/clothes/${created.id}`, {})).status, 200);
    const optional = await request('PATCH', `/clothes/${created.id}`, { price: null, title: null });
    assert.equal(optional.body.price, created.price);
    assert.equal(optional.body.title, 'Худі Basic');
  });

  await t.test('7. Єдиний формат 404 для сервісу та невідомого маршруту', async () => {
    error(await request('GET', '/clothes/999999'), 404);
    error(await request('GET', '/missing?limit=5'), 404);
  });

  await t.test('8. Замовлення та request scope з лабораторної №5', async () => {
    const first = await request('GET', '/clothes');
    const second = await request('GET', '/clothes');
    assert.notEqual(first.headers['x-request-id'], second.headers['x-request-id']);
    assert.equal(first.headers['x-request-trace-match'], 'true');
    assert.equal(first.headers['x-api-version'], '1.0');
    assert.equal(first.headers['x-service-status'], 'operational');
    const order = await request('POST', '/orders', { productId: created.id, quantity: 2, customerEmail: ' student@example.com ' });
    assert.equal(order.status, 201);
    assert.equal(order.body.customerEmail, 'student@example.com');
    assert.equal(order.body.subtotal, 1599.98);
    assert.equal(order.body.taxAmount, 320);
    assert.equal(order.body.total, 1919.98);
    assert.equal(order.body.productSlug, 'khudi-basic');
    assert.equal(order.headers['x-request-trace-match'], 'true');
    assert.equal((await request('GET', '/orders')).body.length, 1);
    error(await request('POST', '/orders', { productId: '999999', quantity: 1, customerEmail: 'student@example.com' }), 404);
    error(await request('POST', '/orders', { productId: created.id, quantity: 0, customerEmail: 'bad' }), 400);
  });

  await t.test('9. DELETE: 204, заголовок часу та подальший 404', async () => {
    const result = await request('DELETE', `/clothes/${created.id}`);
    assert.equal(result.status, 204);
    assert.equal(result.body, '');
    error(await request('GET', `/clothes/${created.id}`), 404);
  });

  await t.test('10. Кореневий маршрут та синтаксично неправильний JSON', async () => {
    assert.equal((await request('GET', '/')).body, 'Hello World!');
    error(await request('POST', '/clothes', '{"title":', true), 400);
  });
});
