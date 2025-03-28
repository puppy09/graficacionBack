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
    const controllersPath = path.join(backendPath, 'controllers');
    const middlewaresPath = path.join(backendPath, 'middlewares');
    const routesPath = path.join(backendPath, 'routes');
    // Extraer credenciales del JSON
    const { bddHost, bddUser, bddPass } = credenciales;

    // Crear carpeta del proyecto
    if (fs.existsSync(projectFolderPath)) {
        console.log('seguimos con lo demas');
        processGraphModel(graphModel, modelsPath, routesPath, controllersPath, middlewaresPath);

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
        //instalar express-session
        console.log('instalando express-session...');
        await executeCommand('npm install express-session', backendPath);


        // Crear la carpeta models en el backend
        fs.mkdirSync(modelsPath, { recursive: true });
        console.log(`Carpeta 'models' creada en: ${modelsPath}`);

        // Crear la carpeta controllers en el backend
        fs.mkdirSync(controllersPath, { recursive: true });
        console.log(`Carpeta 'controllers' creada en: ${controllersPath}`);

        // Crear la carpeta middlewares en el backend
        fs.mkdirSync(middlewaresPath, { recursive: true });
        console.log(`Carpeta 'middlewares' creada en: ${middlewaresPath}`);

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
         // Código a insertar después de "var app = express();"
    const sessionConfig = `
    const session = require('express-session');
    app.use(session({
        secret: process.env.SECRET || 'default_secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, httpOnly: false, sameSite: 'lax', maxAge: 60000000 },
    }));
        `;
         // Buscar la declaración de "var app = express();"
    const appDeclaration = "var app = express();";
    const insertIndex = appContent.indexOf(appDeclaration) + appDeclaration.length;

    // Insertar la configuración de sesión justo después de la declaración de "app"
    appContent = appContent.slice(0, insertIndex) + sessionConfig + appContent.slice(insertIndex);

    fs.writeFileSync(appPath, appContent);
    console.log('express-session agregado correctamente a app.js');
        }



        console.log('Proyecto creado correctamente');

        processGraphModel(graphModel, modelsPath, routesPath, controllersPath, middlewaresPath);
    }
};


const processGraphModel = (graphModel, modelsPath, routesPath, controllersPath, middlewaresPath) => {
    console.log(' Procesando nodos...');
    console.log('Generando archivos de login:');
    
    const clasesRelacionadas = [];
    const relacionesPorClase = {}; // Mapa para almacenar las relaciones por clase

    graphModel.nodeDataArray.forEach(node => {
        console.log(`🔹 Generando modelo: ${node.name}`);
        clasesRelacionadas.push({ key: node.key, name: node.name });
        console.log(clasesRelacionadas);
        generarArchivoClase(node, modelsPath, routesPath, controllersPath);
    });

    graphModel.linkDataArray.forEach(link => {
        console.log(`    Relación: ${link.category || 'sin categoría'} (de ${link.from} a ${link.to})`);
        if (link.category === 'agregacion' || link.category === 'composicion') {
            if (!relacionesPorClase[link.from]) {
                relacionesPorClase[link.from] = []; // Inicializar si no existe
            }
            const toClass = clasesRelacionadas.find(clase => clase.key === link.to);
            if (toClass) {
                relacionesPorClase[link.from].push(toClass.name); // Agregar la clase relacionada
            }
        }
    });
    
    // Llamar a las funciones de relación con el mapa de relaciones
    graphModel.linkDataArray.forEach(link => {
        if (link.category === 'agregacion') {
            agregarRelacionAgregacion(
                modelsPath,
                routesPath,
                controllersPath,
                middlewaresPath,
                link,
                clasesRelacionadas,
                relacionesPorClase[link.from] || [] // Pasar un array vacío si no hay relaciones
            );
        } else if (link.category === 'composicion') {
            agregarRelacionComposicion(
                modelsPath,
                routesPath,
                controllersPath,
                middlewaresPath,
                link,
                clasesRelacionadas,
                relacionesPorClase[link.from] || [] // Pasar un array vacío si no hay relaciones
            
            );
        }
    });

    generarArchivosLogin(modelsPath, routesPath, controllersPath, middlewaresPath);
};

const generarArchivoClase = (node, modelsPath, routesPath, controllersPath) => {
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
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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


    //Generar controlladores
    const controllerContent = `
    const { where } = require('sequelize');
    const ${node.name}Model = require('../models/${node.name}');
    module.exports.getAll${node.name} = async (req, res) => {
        try {
            const ${node.name.toLowerCase()} = await ${node.name}Model.findAll();
            return res.json(${node.name.toLowerCase()});
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
        }
    module.exports.get${node.name}Activos = async (req, res) => {
        try {
            const ${node.name.toLowerCase()} = await ${node.name}Model.findAll({
            where: {isActive: true
            }
            });
            return res.json(${node.name.toLowerCase()});
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
        }
    module.exports.get${node.name}ById = async (req, res) => {
        try {
            const ${node.name.toLowerCase()} = await ${node.name}Model.findByPk(
            req.params.id
            );
            return res.json(${node.name.toLowerCase()});
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
        }
    module.exports.post${node.name} = async (req, res) => {
            try {
                const ${node.name.toLowerCase()} = await ${node.name}Model.create(req.body);
                return res.json(${node.name.toLowerCase()});
            } catch (error) {
                return res.status(400).json({ error: error.message });
            }
        }
    module.exports.put${node.name} = async (req, res) => {
            try {
                await ${node.name}Model.update(req.body, {
                where: { id: req.params.id }
                });
                return res.json({ success: 'Se ha modificado correctamente' });
            } catch (error) {
                return res.status(400).json({ error: error.message });
            }
        }
    module.exports.delete${node.name} = async (req, res) => {
            try {
                await ${node.name}Model.update({ isActive: false }, {
                where: { id: req.params.id }
                });
                return res.json({ success: 'Se ha eliminado correctamente' });
            } catch (error) {
                return res.status(400).json({ error: error.message });
            }
        }
    `;
    const controllerFilePath = path.join(controllersPath, `${node.name.toLowerCase()}Controller.js`);
    fs.writeFileSync(controllerFilePath, controllerContent.trim());
    console.log(`Archivo de controlador creado: ${controllerFilePath}`);


    routesFilePath = path.join(routesPath, 'index.js');
    let routesContent = fs.readFileSync(routesFilePath, 'utf8');
    const addroute = `
    const ${node.name.toLowerCase()}Controller = require('../controllers/${node.name.toLowerCase()}Controller');
    router.get('/${node.name.toLowerCase()}',verification.verifyToken, ${node.name.toLowerCase()}Controller.getAll${node.name});
    router.get('/${node.name.toLowerCase()}/activos',verification.verifyToken, ${node.name.toLowerCase()}Controller.get${node.name}Activos);
    router.get('/${node.name.toLowerCase()}/:id',verification.verifyToken, ${node.name.toLowerCase()}Controller.get${node.name}ById);
    router.post('/${node.name.toLowerCase()}',verification.verifyToken, ${node.name.toLowerCase()}Controller.post${node.name});
    router.put('/${node.name.toLowerCase()}/:id',verification.verifyToken, ${node.name.toLowerCase()}Controller.put${node.name});
    router.delete('/${node.name.toLowerCase()}/:id',verification.verifyToken, ${node.name.toLowerCase()}Controller.delete${node.name});
    `;
    // Encuentra dónde se declara "router"
    const routerDeclaration = "var router = express.Router();";
    const insertIndex = routesContent.indexOf(routerDeclaration) + routerDeclaration.length;

    // Inserta las nuevas rutas justo después de la declaración de "router"
    routesContent = routesContent.slice(0, insertIndex) + addroute + routesContent.slice(insertIndex);

    fs.writeFileSync(routesFilePath, routesContent);
}

const generarArchivosLogin = (modelsPath, routesPath, controllerPath, middlewaresPath) =>{
    const filePath = path.join(modelsPath, `userModel.js`);

    //Creacion del modelo del usuario para el login
    const content = `
    const { Model, DataTypes } = require('sequelize');
    const sequelize = require('../database.js');

    class User extends Model {}
    User.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'user',
        tableName: 'user',
        timestamps: false
    });

    module.exports = User;
    `;
    fs.writeFileSync(filePath, content.trim());
    console.log(`Archivo de modelo creado: ${filePath}`);

    loginControllerContent = `
    const userModel = require('../models/userModel');
    module.exports.login = async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await userModel.findOne({ where: { email, password, isActive: true} });
            if (user) {
            req.session.token = user;
                return res.status(200).json(user);
            } else {
                return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
            }
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    module.exports.logout = async (req, res) => {
        try {
            req.session.destroy();
            return res.json({ success: 'Sesión cerrada' });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    `;
    const loginControllerFilePath = path.join(controllerPath, `loginController.js`);
    fs.writeFileSync(loginControllerFilePath, loginControllerContent.trim());
    console.log(`Archivo de controlador creado: ${loginControllerFilePath}`);
    

    //Creacion del controlador del usuario para el login
    const controllerContent = `
    const userModel = require('../models/userModel');
    module.exports.getAllUsers = async (req, res) => {
        try {
            const users = await userModel.findAll();
            return res.json(users);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    module.exports.getUsersActivos = async (req, res) => {
        try {
            const users = await userModel.findAll({
                where: {isActive: true
                }
            });
            return res.json(users);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    module.exports.getUserById = async (req, res) => {
        try {
            const user = await userModel.findByPk(
                req.params.id
            );
            return res.json(user);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    module.exports.postUser = async (req, res) => {
        try {
            const user = await userModel.create(req.body);
            return res.json(user);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    module.exports.putUser = async (req, res) => {
        try {
            await userModel.update(req.body, {
                where: { id: req.params.id }
            });
            return res.json({ success: 'Se ha modificado correctamente' });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    module.exports.deleteUser = async (req, res) => {
        try {
            await userModel.update({ isActive: false }, {
                where: { id: req.params.id }
            });
            return res.json({ success: 'Se ha eliminado correctamente' });
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    module.exports.changePassword = async (req, res) => {
        try {
            const user = await userModel.update(
            { password: req.body.password },
            { where: { id: req.params.id } }
            );
            return res.json(user);
        }
        catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }`;
    const controllerFilePath = path.join(controllerPath, `userController.js`);
    fs.writeFileSync(controllerFilePath, controllerContent.trim());
    console.log(`Archivo de controlador creado: ${controllerFilePath}`);

    //Creacion de las rutas del usuario para el login
    routesFilePath = path.join(routesPath, 'index.js');
    let routesContent = fs.readFileSync(routesFilePath, 'utf8');
    const addroute = `
    const userController = require('../controllers/userController');
    const loginController = require('../controllers/loginController');
    const verification = require('../middlewares/verification');
    router.get('/getInfo', verification.getInfo);
    router.get('/users',verification.verifyToken, userController.getAllUsers);
    router.get('/users/activos',verification.verifyToken, userController.getUsersActivos);
    router.get('/users/:id',verification.verifyToken, userController.getUserById);
    router.post('/users', userController.postUser);
    router.put('/users/:id',verification.verifyToken, userController.putUser);
    router.delete('/users/:id',verification.verifyToken, userController.deleteUser);
    router.put('/users/changePassword/:id',verification.verifyToken, userController.changePassword);
    router.post('/login', loginController.login);
    router.get('/logout', loginController.logout);
    `;
    // Encuentra dónde se declara "router"
    const routerDeclaration = "var router = express.Router();";
    const insertIndex = routesContent.indexOf(routerDeclaration) + routerDeclaration.length;

    // Inserta las nuevas rutas justo después de la declaración de "router"
    routesContent = routesContent.slice(0, insertIndex) + addroute + routesContent.slice(insertIndex);

    fs.writeFileSync(routesFilePath, routesContent);

    const middlewareContent = `
    module.exports.getInfo = async (req, res, next) => {
        try {
            const token = req.session.token;
            if (token) {
                return res.json({ ...token, logged: true});
            }
                return res.json({ error: 'No autorizado', logged: false });
            } catch (error) {
                return res.status(400).json({ error: error.message });
            }
        };

    module.exports.verifyToken = async (req, res, next) => {
        if (req.session.token) {
            return next();
        }
        else {
            return res.status(401).json({ error: 'Debes iniciar sesion' });
        }
    }
    
    `;
    const middlewareFilePath = path.join(middlewaresPath, `verification.js`);
    fs.writeFileSync(middlewareFilePath, middlewareContent.trim());
    console.log(`Archivo de middleware creado: ${middlewareFilePath}`);


}

const agregarRelacionAgregacion = (modelsPath, routesPath, controllersPath, middlewaresPath, link, clasesRelacionadas, relatedClasses) => {
    // Encontrar el nombre de la clase correspondiente al "from" y "to"
    const fromClass = clasesRelacionadas.find(clase => clase.key === link.from);
    const toClass = clasesRelacionadas.find(clase => clase.key === link.to);

    if (fromClass && toClass) {
        const fromClassName = fromClass.name;
        const toClassName = toClass.name;
        const filePath = path.join(modelsPath, `${fromClassName}.js`);

        let hasManyRelation = `${fromClassName}.hasMany(${toClassName.toLowerCase()}, { foreignKey: '${fromClassName}id', onDelete: 'SET NULL' });`;
        let belongsToRelation = `${toClassName.toLowerCase()}.belongsTo(${fromClassName}, { foreignKey: '${fromClassName}id' });`;

        const content = `
        const ${toClassName.toLowerCase()} = require('../models/${toClassName}');
        ${hasManyRelation}
        ${belongsToRelation}
        `;
        
        let modelContent = fs.readFileSync(filePath, 'utf8');
        const insertIndex = modelContent.indexOf('});') + 2; // Después de la última llave que cierra el modelo
        modelContent = modelContent.slice(0, insertIndex) + content + modelContent.slice(insertIndex);
        fs.writeFileSync(filePath, modelContent);
        console.log('Relación de composición agregada correctamente al modelo');

        //controlador
        const controllerFilePath = path.join(controllersPath, `${fromClassName.toLowerCase()}Controller.js`);
        let controllerContent = fs.readFileSync(controllerFilePath, 'utf8');
        //Verificar si ya existe el endpoint con las relaciones
        if(controllerContent.includes('module.exports.get'+fromClassName+'ById'+'WithRelations')){
            
        }else{
           // Generar el array de includes correctamente
           const includeArray = relatedClasses.map(className => `${className}Model`).join(', ');

           const addControllers = `
           ${relatedClasses.map(className => `const ${className}Model = require('../models/${className}');`).join('\n')}

           module.exports.get${fromClassName}ByIdWithRelations = async (req, res) => {
               try {
                   const ${fromClassName.toLowerCase()} = await ${fromClassName}Model.findByPk(
                       req.params.id,
                       { include: [${includeArray}] }
                   );
                   return res.json(${fromClassName.toLowerCase()});
               } catch (error) {
                   return res.status(400).json({ error: error.message });
               }
           }
           module.exports.get${fromClassName}WithRelations = async (req, res) => {
               try {
                   const ${fromClassName.toLowerCase()} = await ${fromClassName}Model.findAll({ include: [${includeArray}] });
                   return res.json(${fromClassName.toLowerCase()});
               } catch (error) {
                   return res.status(400).json({ error: error.message });
               }
           }
           module.exports.get${fromClassName}ActivosWithRelations = async (req, res) => {
               try {
                   const ${fromClassName.toLowerCase()} = await ${fromClassName}Model.findAll({
                       where: { isActive: true },
                       include: [${includeArray}]
                   });
                   return res.json(${fromClassName.toLowerCase()});
               } catch (error) {
                   return res.status(400).json({ error: error.message });
               }
           }
           `;

           controllerContent += addControllers;
           fs.writeFileSync(controllerFilePath, controllerContent, 'utf8');
           console.log(`Endpoints añadidos para ${fromClassName}.`);
            //agregar rutas
            routesFilePath = path.join(routesPath, 'index.js');
            let routesContent = fs.readFileSync(routesFilePath, 'utf8');
    const addroute = `
    router.get('/${fromClassName.toLowerCase()}WithRelations',verification.verifyToken, ${fromClassName.toLowerCase()}Controller.get${fromClassName}WithRelations);
    router.get('/${fromClassName.toLowerCase()}WithRelations/activos',verification.verifyToken, ${fromClassName.toLowerCase()}Controller.get${fromClassName}ActivosWithRelations);
    router.get('/${fromClassName.toLowerCase()}WithRelations/:id',verification.verifyToken, ${fromClassName.toLowerCase()}Controller.get${fromClassName}ByIdWithRelations);
    `;
        // Encuentra dónde se declara "router"
        const routerDeclaration = "/* GET home page. */";
        const insertIndex = routesContent.indexOf(routerDeclaration) - 1;

        // Inserta las nuevas rutas justo después de la declaración de "router"
        routesContent = routesContent.slice(0, insertIndex) + addroute + routesContent.slice(insertIndex);

        fs.writeFileSync(routesFilePath, routesContent);
            console.log(`Endpoints añadidos para ${fromClassName}.`);
            
        }

    } else {
        console.log(`Error: No se pudo encontrar la clase para ${link.from} o ${link.to}`);
    }
};

const agregarRelacionComposicion = (modelsPath, routesPath, controllersPath, middlewaresPath, link, clasesRelacionadas, relatedClasses) => {
    // Encontrar el nombre de la clase correspondiente al "from" y "to"
    const fromClass = clasesRelacionadas.find(clase => clase.key === link.from);
    const toClass = clasesRelacionadas.find(clase => clase.key === link.to);

    if (fromClass && toClass) {
        const fromClassName = fromClass.name;
        const toClassName = toClass.name;
        const filePath = path.join(modelsPath, `${fromClassName}.js`);

        let hasManyRelation = `${fromClassName}.hasMany(${toClassName.toLowerCase()}, { foreignKey: '${fromClassName}id', onDelete: 'CASCADE' });`;
        let belongsToRelation = `${toClassName.toLowerCase()}.belongsTo(${fromClassName}, { foreignKey: '${fromClassName}id' });`;

        const content = `
        const ${toClassName.toLowerCase()} = require('../models/${toClassName}');
        ${hasManyRelation}
        ${belongsToRelation}
        `;
        
        let modelContent = fs.readFileSync(filePath, 'utf8');
        const insertIndex = modelContent.indexOf('});') + 2; // Después de la última llave que cierra el modelo
        modelContent = modelContent.slice(0, insertIndex) + content + modelContent.slice(insertIndex);
        fs.writeFileSync(filePath, modelContent);
        console.log('Relación de composición agregada correctamente');

        
        //controlador
        const controllerFilePath = path.join(controllersPath, `${fromClassName.toLowerCase()}Controller.js`);
        let controllerContent = fs.readFileSync(controllerFilePath, 'utf8');
        //Verificar si ya existe el endpoint con las relaciones
        if(controllerContent.includes('module.exports.get'+fromClassName+'ById'+'WithRelations')){
            
        }else{
           // Generar el array de includes correctamente
           const includeArray = relatedClasses.map(className => `${className}Model`).join(', ');

           const addControllers = `
           ${relatedClasses.map(className => `const ${className}Model = require('../models/${className}');`).join('\n')}

           module.exports.get${fromClassName}ByIdWithRelations = async (req, res) => {
               try {
                   const ${fromClassName.toLowerCase()} = await ${fromClassName}Model.findByPk(
                       req.params.id,
                       { include: [${includeArray}] }
                   );
                   return res.json(${fromClassName.toLowerCase()});
               } catch (error) {
                   return res.status(400).json({ error: error.message });
               }
           }
           module.exports.get${fromClassName}WithRelations = async (req, res) => {
               try {
                   const ${fromClassName.toLowerCase()} = await ${fromClassName}Model.findAll({ include: [${includeArray}] });
                   return res.json(${fromClassName.toLowerCase()});
               } catch (error) {
                   return res.status(400).json({ error: error.message });
               }
           }
           module.exports.get${fromClassName}ActivosWithRelations = async (req, res) => {
               try {
                   const ${fromClassName.toLowerCase()} = await ${fromClassName}Model.findAll({
                       where: { isActive: true },
                       include: [${includeArray}]
                   });
                   return res.json(${fromClassName.toLowerCase()});
               } catch (error) {
                   return res.status(400).json({ error: error.message });
               }
           }
           `;

           controllerContent += addControllers;
           fs.writeFileSync(controllerFilePath, controllerContent, 'utf8');
           console.log(`Endpoints añadidos para ${fromClassName}.`);
            //agregar rutas
            routesFilePath = path.join(routesPath, 'index.js');
            let routesContent = fs.readFileSync(routesFilePath, 'utf8');
    const addroute = `
    router.get('/${fromClassName.toLowerCase()}WithRelations',verification.verifyToken, ${fromClassName.toLowerCase()}Controller.get${fromClassName}WithRelations);
    router.get('/${fromClassName.toLowerCase()}WithRelations/activos',verification.verifyToken, ${fromClassName.toLowerCase()}Controller.get${fromClassName}ActivosWithRelations);
    router.get('/${fromClassName.toLowerCase()}WithRelations/:id',verification.verifyToken, ${fromClassName.toLowerCase()}Controller.get${fromClassName}ByIdWithRelations);
    `;
        // Encuentra dónde se declara "router"
        const routerDeclaration = "/* GET home page. */";
        const insertIndex = routesContent.indexOf(routerDeclaration) - 1;

        // Inserta las nuevas rutas justo después de la declaración de "router"
        routesContent = routesContent.slice(0, insertIndex) + addroute + routesContent.slice(insertIndex);

        fs.writeFileSync(routesFilePath, routesContent);
            console.log(`Endpoints añadidos para ${fromClassName}.`);
            
        }

    } else {
        console.log(`Error: No se pudo encontrar la clase para ${link.from} o ${link.to}`);
    }
};


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