const request = require('supertest');
const mongoose = require('mongoose');
const sequelize = require('../config/sequelize');
const app = require('../app');
const User = require('../models/userModel');
const Template = require('../models/templateModel');
const Action = require('../models/actionModel');
//const User = require('../models/userModel'); // Sequelize model
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

describe('Action Logging API', () => {
  let userId;
  let templateId;
  let actionId;
  let user;
  let token;

  beforeEach(async () => {
    const user = await User.create({
      first_name: 'German',
      last_name: 'Tester',
      email: 'action@example.com',
      profile_type: 'Registered',
      password_hash: 'hash', 
      password_salt: 'salt',
      is_verified: true 
    });
    userId = user.id;
    token = generateToken(user);

    const template = await Template.create({
      template_name: 'Action Template',
      version: 1,
      publish_status: 'Draft',
      userId: user.id
    });
    templateId = template._id;

    // Seed a test action for GET tests
    const action = await Action.create({
      userId,
      action: 'test_action',
      payload: { foo: 'bar' }
    });
    actionId = action._id;
  });

  afterEach(async () => {
    await User.destroy({ where: {} });
    await Template.deleteMany({});
    await Action.deleteMany({});
    await User.destroy({ where: {} });
  });

  it('logs an action when a user is created', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        first_name: 'New',
        last_name: 'User',
        email: 'newaction@example.com',
        profile_type: 'Guest',
        password_hash: 'hash', 
        password_salt: 'salt' 
      });

    expect(res.statusCode).toBe(201);

    const actionLog = await Action.findOne({ action: 'create_user' });
    expect(actionLog).not.toBeNull();
    expect(actionLog.payload.email).toBe('newaction@example.com');
  });

  it('logs an action when a template is updated', async () => {
    const res = await request(app)
      .put(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 2 });
    expect(res.statusCode).toBe(200);

    const actionLog = await Action.findOne({ action: 'update_template' });
    
    
    expect(actionLog).not.toBeNull();
    expect(actionLog.payload).toHaveProperty('updatedFields');
    expect(actionLog.payload.updatedFields.version).toBe(2);
  });

  it('does not log an action when deleting the last template is forbidden', async () => {
    const res = await request(app)
      .delete(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('You must keep at least one template.');

    const actionLog = await Action.findOne({ action: 'delete_template' });
    expect(actionLog).toBeNull();
  });

  it('GET /api/actions returns all actions', async () => {
    const res = await request(app)
      .get('/api/actions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].action).toBe('test_action');
  });

  it('GET /api/actions/:id returns a specific action', async () => {
    const res = await request(app).get(`/api/actions/${actionId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(actionId.toString());
    expect(res.body.action).toBe('test_action');
  });

  it('GET /api/actions/:id fails with invalid ID format', async () => {
    const res = await request(app)
      .get('/api/actions/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid action ID format');
  });

  it('GET /api/actions/:id fails when action not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/actions/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Action not found');
  });
});