const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database.js');

class Versiones extends Model{}
Versiones.init({
    id_version: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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

/*Versiones.associate = function(models) {
    // A Versiones belongs to a Proyect
    Versiones.belongsTo(models.Proyectos, {
        foreignKey: 'id_proyecto',
        as: 'proyecto' // Alias to use when fetching associated data
    });

    // A Versiones belongs to a Diagramas
   /* Versiones.belongsTo(models.diagrama, {
        foreignKey: 'id_diagrama',
        as: 'diagrama' // Alias to use when fetching associated data
    });
}*/
module.exports = Versiones;