const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database.js');

class Diagrama extends Model{}
Diagrama.init({
    id_diagrama:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    nombre:{
        type: DataTypes.STRING,
        allowNull: false
    }
    
},{
    sequelize,
    modelName: 'diagrama',
    tableName: 'diagrama',
    timestamps: false
});

module.exports = Diagrama;