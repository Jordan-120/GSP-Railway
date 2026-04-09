const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); // My Express app
//const app = require('../server'); // My Express app
const Template = require('../models/templateModel');
const Action = require('../models/actionModel');
const User = require('../models/userModel'); // Sequelize model
const { generateToken } = require('../utils/jwt');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI); // use .env.test
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Template CRUD API', () => {
  let templateId;
  let user;
  let userId;
  let token;

  beforeEach(async () => {
    // Create SQL user (Sequelize)
    user = await User.create({
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      profile_type: 'Registered',
      password_hash: 'password123',
      password_salt: 'salt',
      is_verified: true 
    });

    userId = user.id;

    token = generateToken(user); // Implement this function to create JWT token for the user

    // Create MongoDB template (Mongoose)
    const template = await Template.create({
      template_name : 'Template',
      version : 1,
      publish_status : 'Draft',
      userId: user.id

    });
    templateId = template._id.toString();
  });

  afterEach(async () => {
    await Template.deleteMany({});
    await Action.deleteMany({});
    await User.destroy({ where: {} }); // clean SQL users
  });

  it('POST /api/templates creates a template and logs action', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        template_name: 'New Template',
        version: 1,
        publish_status: 'Draft',
        userId: user.id
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.template_name).toBe('New Template');

    const actionLog = await Action.findOne({ action: 'create_template' });
    expect(actionLog).not.toBeNull();
    expect(actionLog.payload.template_name).toBe('New Template');
  });

    it('POST /api/templates fails to create a template', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${token}`)
      .send({
        template_name: 'New Template',
        version: 1,
        publish_status: 'NotEnum'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/templates returns all templates', async () => {
    const res = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });


  it('GET /api/templates/:id returns a template', async () => {
    const res = await request(app)
      .get(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(templateId.toString());
  });

  it('PUT /api/templates/:id updates a template and logs action', async () => {
    const res = await request(app)
      .put(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 2 });
    expect(res.statusCode).toBe(200);

    const updated = await Template.findById(templateId);
    expect(updated).not.toBeNull();

    const actionLog = await Action.findOne({ action: 'update_template' });
    expect(actionLog).not.toBeNull();
  });

  it('PUT /api/users/:id fails to update a template, template not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/templates/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ template_name: 'Updated' });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Template not found");
  });

  it('PUT /api/templates/:id fails to update a template, invalid format', async () => {
    const res = await request(app)
      .put(`/api/templates/not-a-valid-id`)
      .set('Authorization', `Bearer ${token}`)
      .send({ template_name: 'Updated' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid template ID format");
  });

  it('DELETE /api/templates/:id deletes a template and logs action', async () => {
    const res = await request(app)
      .delete(`/api/templates/${templateId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('You must keep at least one template.');

    const actionLog = await Action.findOne({ action: 'delete_template' });
    expect(actionLog).toBeNull();
  });

  it('DELETE /api/templates/:id fails to delete a template', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/templates/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Template not found");
  });
});