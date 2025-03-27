const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database.js');

class Versiones extends Model{}
Versiones.init({
    id_version: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_proyecto:{
        type:DataTypes.INTEGER,
        allowNull: false
    },
    id_Tipodiagrama:{
        type:DataTypes.INTEGER,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    version:{
        type: DataTypes.STRING,
        allowNull: false
    },
    json:{
        type: DataTypes.JSON,
        allowNull: false
    }
    
},{
    sequelize,
    modelName: 'versiones',
    tableName: 'versiones',
    timestamps: false
});

module.exports = Versiones;