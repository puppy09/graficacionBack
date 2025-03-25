const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');

const executeCommand = (command, cwd) => {
    return new Promise((resolve, reject) => {
        exec(command, {cwd}, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec ejecutando: ${command}\n${stderr}`);
                reject(error);
            } else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
};

const createProject = async (nombreProyecto, graphModel, credenciales) => {
    const desktopPath = path.join(require('os').homedir(), 'Desktop');
    const projectFolderPath = path.join(desktopPath, nombreProyecto);
    const frontendPath = path.join(projectFolderPath, `${nombreProyecto}-frontend`);
    const backendPath = path.join(projectFolderPath, `${nombreProyecto}-backend`);
    const modelsPath = path.join(backendPath, 'models');
    const routesPath = path.join(backendPath, 'routes');
    // Extraer credenciales del JSON
    const { bddHost, bddUser, bddPass } = credenciales;

    // Crear carpeta del proyecto
    if (fs.existsSync(projectFolderPath)) {
        console.log('seguimos con lo demas');
        processGraphModel(graphModel, modelsPath, routesPath);

    }else{
        fs.mkdirSync(projectFolderPath, {recursive: true});
        console.log(`Carpeta del proyecto creada en ${projectFolderPath}`);
    
        // Crear proyecto frontend
        //console.log('Creando proyecto frontend en angular...');
        //await executeCommand(`npx -y @angular/cli new ${nombreProyecto}-frontend --defaults`, projectFolderPath);
    
        // Crear proyecto backend
        console.log('Creando proyecto backend en express...');
        await executeCommand(`npx express-generator ${nombreProyecto}-backend --no-view`, projectFolderPath);
        console.log('instalando las dependencias del backend...');
        await executeCommand('npm install', backendPath);
        //Instalar sequelize
        console.log('instalando sequelize...');
        await executeCommand('npm install sequelize', backendPath);
        //Instalar sqlite3
        console.log('instalando sqlite3...');
        await executeCommand('npm install sqlite3', backendPath);
        //Instalar dotenv
        console.log('instalando dotenv...');
        await executeCommand('npm install dotenv', backendPath);


        // Crear la carpeta models en el backend
        fs.mkdirSync(modelsPath, { recursive: true });
        console.log(`Carpeta 'models' creada en: ${modelsPath}`);

        //Crear archivo de configuración de la base de datos
        const envContent = `
        BDD_HOST=${bddHost}
        BDD_USER=${bddUser}
        BDD_PASS=${bddPass}
        BDD_NAME=${nombreProyecto}
        `;
        fs.writeFileSync(path.join(backendPath, '.env'), envContent.trim());
        console.log('Archivo de configuración de la base de datos creado');

        // Crear archivo de conexión a la base de datos
        const database= `
        const { Sequelize } = require('sequelize');
        require('dotenv').config();
        const sequelize = new Sequelize(process.env.BDD_NAME, process.env.BDD_USER, process.env.BDD_PASS, {
            host: './db.sqlite3',
            dialect: 'sqlite',
        });
        module.exports = sequelize;
        `; 
        fs.writeFileSync(path.join(backendPath, 'database.js'), database.trim());
        console.log('Archivo de conexión a la base de datos creado');

        // Modificar app.js
        const appPath = path.join(backendPath, 'app.js');
        if (fs.existsSync(appPath)) {
            let appContent = fs.readFileSync(appPath, 'utf8');

            // Agregar las líneas necesarias al inicio del archivo
            const extraCode = `
const dotenv = require('dotenv');
dotenv.config();
const sequelize = require('./database.js');

sequelize.sync({ force: true }).then(() => {
  console.log('Base de datos conectada');
}).catch(error => {
  console.log('Error al conectar a la base de datos: ' + error.message);
});
            `;

            appContent = extraCode + appContent;
            fs.writeFileSync(appPath, appContent);
            console.log('Modificaciones agregadas a app.js');
        }


        console.log('Proyecto creado correctamente');

        processGraphModel(graphModel, modelsPath, routesPath);
    }
};


const processGraphModel = (graphModel, modelsPath, routesPath) => {
    console.log('📌 Procesando nodos...');
    graphModel.nodeDataArray.forEach(node => {
        console.log(`🔹 Generando modelo: ${node.name}`);
        generarArchivoClase(node, modelsPath, routesPath);
    });

    console.log('\n🔗 Procesando enlaces:');
    graphModel.linkDataArray.forEach(link => {
        console.log(`   🔗 Relación: ${link.category || 'sin categoría'} (de ${link.from} a ${link.to})`);
    });
};

const generarArchivoClase = (node, modelsPath, routesPath) => {
    const className = node.name;
    const tableName = className.toLowerCase();
    const filePath = path.join(modelsPath, `${className}.js`);

    let properties = '';
    node.properties.forEach(prop => {
        properties += `    ${prop.name}: {\n`;
        properties += `        type: DataTypes.${mapSequelizeType(prop.type)},\n`;
        properties += `        allowNull: false\n    },\n`;
    });

    const content = `
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database.js');

class ${className} extends Model {}

${className}.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
${properties}
}, {
    sequelize,
    modelName: '${className.toLowerCase()}',
    tableName: '${tableName}',
    timestamps: false
});

module.exports = ${className};
    `;

    fs.writeFileSync(filePath, content.trim());
    console.log(`Archivo de modelo creado: ${filePath}`);

    // agregar ruta al archivo de rutas
    const routesFilePath = path.join(routesPath, 'index.js');
    let routesContent = fs.readFileSync(routesFilePath, 'utf8');
    const addroute = `
    ${node.name} = require('../models/${node.name}');
    `;
    routesContent = addroute + routesContent;
    fs.writeFileSync(routesFilePath, routesContent);
}

// Función para mapear tipos de datos del JSON a Sequelize
const mapSequelizeType = (type) => {
    switch (type.toLowerCase()) {
        case 'int': return 'INTEGER';
        case 'string': return 'STRING';
        case 'boolean': return 'BOOLEAN';
        case 'float': return 'FLOAT';
        case 'date': return 'DATE';
        default: return 'STRING';
    }
};



module.exports = {
    createProject
};