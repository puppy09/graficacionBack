const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database.js');

class Proyectos extends Model{}
Proyectos.init({
    id_proyecto:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre:{
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion:{
        type: DataTypes.STRING,
        allowNull: false
    }
},{
    sequelize,
    modelName: 'proyectos',
    tableName: 'proyectos',
    timestamps: false
});

module.exports = Proyectos;