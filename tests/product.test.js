const request = require('supertest');
const app = require('../server');

describe('Product API', () => {
  it('should get all products', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toEqual(200);
  });
});
