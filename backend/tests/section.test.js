const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Template = require('../models/templateModel');
const Page = require('../models/pageModel');
const Action = require('../models/actionModel');
const { generateToken } = require('../utils/jwt');
const User = require('../models/userModel'); 
const sequelize = require('../config/sequelize');   

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await sequelize.authenticate();                   
  await sequelize.sync({ force: true });            
});

afterAll(async () => {
  await mongoose.connection.close();
  await sequelize.close();                          
});

describe('Section CRUD API, nested in Page schema', () => {
  let templateId;
  let pageId;
  let user;
  let userId;
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

    userId = user.id;
    token = generateToken(user);

    const template = await Template.create({
      template_name: 'Landing Template',
      version: 1,
      publish_status: 'Draft',
      userId: user.id
    });

    templateId = template._id;

    const page = await Page.create({
      page_name: 'Landing Page',
      template: templateId
    });

    pageId = page._id;
  });

  afterEach(async () => {
    await Template.deleteMany({});
    await Page.deleteMany({});
    await Action.deleteMany({});
    await User.destroy({ where: {} });
  });

  it('POST /api/pages/:pageId/sections creates a section and logs action', async () => {
    const res = await request(app)
      .post(`/api/pages/${pageId}/sections`)
      .set('Authorization', `Bearer ${token}`)
      .send({ section_title: 'Section title' });

    expect(res.statusCode).toBe(201);
    expect(res.body.section_title).toBe('Section title');

    const updatedPage = await Page.findById(pageId);
    expect(updatedPage.sections[0].section_title).toBe('Section title');

    const actionLog = await Action.findOne({ action: 'create_section' });
    expect(actionLog.payload.section_title).toBe('Section title');
  });
});