const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database.js');

class ProyectosCreados extends Model{}
ProyectosCreados.init({
    id_proyectoCreado:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_proyecto:{
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dia_secuencias:{
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dia_clases:{
        type: DataTypes.INTEGER,
        allowNull: true
    },
    dia_paquetes:{
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dia_cu:{
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dia_componentes:{
        type: DataTypes.INTEGER,
        allowNull: false
    }
},{
    sequelize,
    modelName: 'Proyectos_creados',
    tableName: 'Proyectos_creados',
    timestamps: false
});
module.exports = ProyectosCreados;