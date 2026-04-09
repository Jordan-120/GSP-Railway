const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); 
const User = require('../models/userModel');
const Action = require('../models/actionModel');
const sequelize = require('../config/sequelize'); 

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI); 
  await sequelize.sync({ force: true });

});

afterAll(async () => {
  await mongoose.connection.close();
  await sequelize.close();

});

describe('User CRUD API', () => {
  let userId;

  beforeEach(async () => {
    const user = await User.create({
      first_name: 'German',
      last_name: 'Tester',
      email: 'test@example.com',
      profile_type: 'Registered',
      password_hash: 'hash', 
      password_salt: 'salt' 
    });
    userId = user.id;
  });

  afterEach(async () => {
    await User.destroy({where: {}});  //clears all users in MySQL
    await Action.deleteMany({});  // clears all actions in Mongo

  });

  it('POST /api/users creates a user and logs action', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        first_name: 'New',
        last_name: 'User',
        email: 'new@example.com',
        profile_type: 'Guest',
        password_hash: 'hash', 
        password_salt: 'salt' 
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.email).toBe('new@example.com');

    const actionLog = await Action.findOne({ action: 'create_user' });
    expect(actionLog).not.toBeNull();
    expect(actionLog.payload.email).toBe('new@example.com');
  });

    it('POST /api/users fails to create a user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        first_name: 'Incomplete',
        last_name: 'Data',
        //email: 'new@example.com',
        profile_type: 'Guest',
        password_hash: 'hash', 
        password_salt: 'salt' 
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/users returns all users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/users/:id returns a user', async () => {
    const res = await request(app).get(`/api/users/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(userId);
  });

  it('PUT /api/users/:id updates a user and logs action', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .send({ first_name: 'Updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.first_name).toBe('Updated');

    const actionLog = await Action.findOne({ action: 'update_user' });
    expect(actionLog.payload.updatedUserId.toString()).toBe(userId.toString());
  });

  it('PUT /api/users/:id fails to update a user, user not found', async () => {

    const res = await request(app)
      .put(`/api/users/-1`)
      .send({ first_name: 'Updated' });
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  it('PUT /api/users/:id fails to update a user, invalid format', async () => {
    const res = await request(app)
      .put(`/api/users/not-a-valid-id`)
      .send({ first_name: 'Updated' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Error updating user");
  });

  it('DELETE /api/users/:id deletes a user and logs action', async () => {
    const res = await request(app).delete(`/api/users/${userId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('User deleted successfully');

    const actionLog = await Action.findOne({ action: 'delete_user' });
    expect(actionLog.payload.deletedUserId.toString()).toBe(userId.toString());
  });

  it('DELETE /api/users/:id fails to delete a user', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/users/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("User not found");
  });
});