const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database.js');
const Proyectos = require('../models/proyectos.js');
const Diagrama = require('../models/diagramas.js');
class Versiones extends Model{}
Versiones.init({
    id_version: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_proyecto:{
        type:DataTypes.INTEGER,
        allowNull: false,
        references:{
            model: 'proyectos',
            keys: 'id_proyecto'
        }
    },
    diagrama:{
        type:DataTypes.INTEGER,
        allowNull: false,
        references:{
            model: 'diagrama',
            keys: 'id_diagrama'
        }
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

Versiones.associate = function(models) {
    // A Versiones belongs to a Proyectos
    Versiones.belongsTo(models.Proyectos, {
        foreignKey: 'id_proyecto',
        as: 'proyecto' // Alias to use when fetching associated data
    });

    // A Versiones belongs to a Diagramas
   /* Versiones.belongsTo(models.diagrama, {
        foreignKey: 'id_diagrama',
        as: 'diagrama' // Alias to use when fetching associated data
    });*/
};
module.exports = Versiones;