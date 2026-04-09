const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const bcrypt = require('bcryptjs');

const User = sequelize.define(
  'User',
  {
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    update_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    profile_type: {
      type: DataTypes.ENUM('Admin', 'Registered', 'Guest', 'Banned'),
      defaultValue: 'Guest',
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    password_salt: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    security_update_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    permissions_override: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    last_template_id: {
      type: DataTypes.STRING(24),
      allowNull: true,
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    verification_token_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_password_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  },
  {
    tableName: 'users',
    timestamps: false,
    hooks: {
      beforeCreate: async (user) => {
        const salt = await bcrypt.genSalt(10);
        user.password_salt = salt;
        user.password_hash = await bcrypt.hash(user.password_hash, salt);
        user.security_update_time = new Date();
        user.update_time = new Date();
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash')) {
          const salt = await bcrypt.genSalt(10);
          user.password_salt = salt;
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
          user.security_update_time = new Date();
        }
        user.update_time = new Date();
      },
    },
  }
);

User.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password_hash);
};

module.exports = User;
