const request = require('supertest');
const mongoose = require('mongoose');
const sequelize = require('../config/sequelize');
const app = require('../app');

const Template = require('../models/templateModel');
const Page = require('../models/pageModel');
const Action = require('../models/actionModel');
const User = require('../models/userModel');
const { generateToken } = require('../utils/jwt');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await mongoose.connection.close();
  await sequelize.close();
});

describe('Page API', () => {
  let templateId;
  let user;
  let token;

  beforeEach(async () => {
    user = await User.create({
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      profile_type: 'Registered',
      password_hash: 'password123',
      password_salt: 'salt',
      is_verified: true
    });

    token = generateToken(user);

    const template = await Template.create({
      template_name: 'Base Template',
      version: 1,
      publish_status: 'Draft',
      userId: user.id
    });

    templateId = template._id;
  });

  afterEach(async () => {
    await Template.deleteMany({});
    await Page.deleteMany({});
    await Action.deleteMany({});
    await User.destroy({ where: {} });
  });

  // ---------------------------------------------------------
  // CREATE PAGE
  // ---------------------------------------------------------
  it('POST /api/pages creates a page and logs action', async () => {
    const res = await request(app)
      .post('/api/pages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        page_name: 'Landing Page',
        template: templateId
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.page_name).toBe('Landing Page');
    expect(res.body.template.toString()).toBe(templateId.toString());

    const actionLog = await Action.findOne({ action: 'create_page' });
    expect(actionLog).not.toBeNull();
    expect(actionLog.payload.page_name).toBe('Landing Page');
  });

  it('POST /api/pages fails when template is missing', async () => {
    const res = await request(app)
      .post('/api/pages')
      .set('Authorization', `Bearer ${token}`)
      .send({ page_name: 'Landing Page' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Error creating page');
  });

  // ---------------------------------------------------------
  // GET ALL PAGES
  // ---------------------------------------------------------
  it('GET /api/pages returns all pages', async () => {
    await Page.create({
      page_name: 'Landing Page',
      template: templateId
    });

    const res = await request(app)
      .get('/api/pages')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].page_name).toBe('Landing Page');
  });

  // ---------------------------------------------------------
  // GET PAGE BY ID
  // ---------------------------------------------------------
  it('GET /api/pages/:id returns a page', async () => {
    const page = await Page.create({
      page_name: 'Landing Page',
      template: templateId
    });

    const res = await request(app)
      .get(`/api/pages/${page._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(page._id.toString());
    expect(res.body.page_name).toBe('Landing Page');
  });

  // ---------------------------------------------------------
  // UPDATE PAGE
  // ---------------------------------------------------------
  it('PUT /api/pages/:id updates a page and logs action', async () => {
    const page = await Page.create({
      page_name: 'Landing Page',
      template: templateId
    });

    const res = await request(app)
      .put(`/api/pages/${page._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ page_name: 'Landing Page updated' });

    expect(res.statusCode).toBe(200);
    expect(res.body.page_name).toBe('Landing Page updated');

    const actionLog = await Action.findOne({ action: 'update_page' });
    
    expect(actionLog).not.toBeNull();
    expect(actionLog.pageId.toString()).toBe(page._id.toString());
    expect(actionLog.payload.updateFields.page_name).toBe('Landing Page updated');
  });

  it('PUT /api/pages/:id fails with invalid ID', async () => {
    const res = await request(app)
      .put('/api/pages/invalid-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ page_name: 'Landing Page updated' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Error updating page');
  });

  // ---------------------------------------------------------
  // DELETE PAGE
  // ---------------------------------------------------------
  it('DELETE /api/pages/:id deletes a page and logs action', async () => {
    const page = await Page.create({
      page_name: 'Landing Page',
      template: templateId
    });

    const res = await request(app)
      .delete(`/api/pages/${page._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Page deleted successfully');

    const actionLog = await Action.findOne({ action: 'delete_page' });
    expect(actionLog).not.toBeNull();
    expect(actionLog.pageId.toString()).toBe(page._id.toString());
    expect(actionLog.payload.deletedPageName).toBe('Landing Page');
  });

  it('DELETE /api/pages/:id fails with invalid ID', async () => {
    const res = await request(app)
      .delete('/api/pages/not-valid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Error deleting page');
  });
});