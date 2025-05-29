const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');

const executeCommand = (command, cwd) => {
    return new Promise((resolve, reject) => {
        exec(command, {cwd, shell: 'powershell.exe'}, (error, stdout, stderr) => {
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


const createProject = async (nombreProyecto, graphModel, credenciales, paquetesGraph) => {

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
    
    
        // Crear proyecto backend
        console.log('Creando proyecto backend en express...');
        await executeCommand(`npx express-generator ${nombreProyecto}-backend --no-view`, projectFolderPath);
        console.log('instalando las dependencias del backend...');
        await executeCommand('node -v', backendPath);
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
        //instalar cors
        console.log('instalando cors...');
        await executeCommand('npm install cors', backendPath);


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

sequelize.sync({ force: false }).then(() => {
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
const cors = require('cors');
app.use(cors({ credentials: true, origin: true }));
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
        diagramaPaquetesBackend(backendPath, paquetesGraph);
        // Crear proyecto frontend
        console.log('Creando proyecto frontend en angular...');
        await executeCommand(`npx -y @angular/cli new ${nombreProyecto}-frontend --defaults`, projectFolderPath);
        crearArchivosFrontend(frontendPath, graphModel);
        console.log('Proyecto frontend creado correctamente');
        console.log('Todo al cien papi');
        diagramaPaquetesFrontend(frontendPath, paquetesGraph);
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
        // Validar que el nombre del atributo no sea "id" (en cualquier combinación de mayúsculas y minúsculas)
        if (prop.name.toLowerCase() !== 'id') {
            properties += `    ${prop.name}: {\n`;
            properties += `        type: DataTypes.${mapSequelizeType(prop.type)},\n`;
            properties += `        allowNull: false\n    },\n`;
        }
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

const crearArchivosFrontend = async (frontendPath, graphModel) => {
    const srcPath = path.join(frontendPath, 'src');
    const appComponentPath = path.join(srcPath, 'app', 'app.component.html');
    const appConfigPath = path.join(srcPath, 'app', 'app.config.ts');
    const componentsFolderPath = path.join(srcPath, 'app', 'components');
    const servicesFolderPath = path.join(srcPath, 'app', 'services');
    const apiLinkPath = path.join(srcPath, 'app', 'apiLink.ts');

    fs.mkdirSync(componentsFolderPath, { recursive: true });
    fs.mkdirSync(servicesFolderPath, { recursive: true });
    const apiLinkContent = `
    export const apiUrl = 'http://localhost:3000'; 
    `
    fs.writeFileSync(apiLinkPath, apiLinkContent, 'utf8');

    fs.writeFileSync(appConfigPath, '', 'utf8');
    const appConfigContent = `
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';


export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes),provideHttpClient(withFetch(),withInterceptorsFromDi())]
};

    `
    fs.writeFileSync(appConfigPath, appConfigContent, 'utf8');
    
    fs.writeFileSync(appComponentPath, '', 'utf8');
    const appComponentContent = `
    <router-outlet></router-outlet>
    `
    fs.writeFileSync(appComponentPath, appComponentContent, 'utf8');
    const appRoutesPath = path.join(srcPath, 'app', 'app.routes.ts');
    fs.writeFileSync(appRoutesPath, '', 'utf8');
    const appRoutesContent = `
    import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainMenuComponent } from './components/main-menu/main-menu.component';
import { RegisterComponent } from './components/register/register.component';

export const routes: Routes = [
    {
        path: '',
        component: LoginComponent
    },
    {
        path: 'mainMenu',
        component: MainMenuComponent
    },
    {
        path: 'register',
        component: RegisterComponent
    }
];

    `
    fs.writeFileSync(appRoutesPath, appRoutesContent, 'utf8');

    await generarComponentesBase(componentsFolderPath);
    await generarServiciosBase(servicesFolderPath);
    await processGraphModelFrontend(graphModel, componentsFolderPath, servicesFolderPath, appRoutesPath);

    
}

generarComponentesBase = async (componentsFolderPath) => {
    
    await executeCommand('ng g c login', componentsFolderPath);
    await executeCommand('ng g c register', componentsFolderPath);
    await executeCommand('ng g c mainMenu', componentsFolderPath);

    const loginComponentPath = path.join(componentsFolderPath, 'login');
    const mainMenuComponentPath = path.join(componentsFolderPath, 'main-menu');
    const registerComponentPath = path.join(componentsFolderPath, 'register');

    const loginComponentHtmlPath = path.join(loginComponentPath, 'login.component.html');
    const loginComponentTsPath = path.join(loginComponentPath, 'login.component.ts');
    const loginComponentCssPath = path.join(loginComponentPath, 'login.component.css');

    const registerComponentHtmlPath = path.join(registerComponentPath, 'register.component.html');
    const registerComponentTsPath = path.join(registerComponentPath, 'register.component.ts');
    const registerComponentCssPath = path.join(registerComponentPath, 'register.component.css');

    const mainMenuComponentHtmlPath = path.join(mainMenuComponentPath, 'main-menu.component.html');
    const mainMenuComponentTsPath = path.join(mainMenuComponentPath, 'main-menu.component.ts');
    const mainMenuComponentCssPath = path.join(mainMenuComponentPath, 'main-menu.component.css');

    const loginComponentHtmlContent = `
    <div class="login-container">
    <div class="login-box">
        <div class="login-header">
            <p class="welcome-text">Bienvenido a tu proyecto generado</p>
            <div class="register-link">
                <p>No tienes una cuenta? <span class="register-text" (click)="goToRegisterUser()">Regístrate</span></p>
            </div>
        </div>

        <h1 class="login-title">Iniciar sesión</h1>
        
        <form onsubmit="onSubmit()" class="login-form">
            <div class="form-group">
                <label for="email" class="form-label">Ingresa tu email</label>
                <input type="text" id="email" [(ngModel)]="email" name="email" placeholder="email" class="form-input" />
            </div>
            
            <div class="form-group">
                <label for="password" class="form-label">Ingresa tu contraseña</label>
                <input type="password" id="password" [(ngModel)]="password" name="password" placeholder="Contraseña" class="form-input" />
            </div>
            
            <button type="submit" class="submit-button" (click)="onSubmit()">Iniciar Sesión</button>
        </form>
    </div>
</div>
    `
    fs.writeFileSync(loginComponentHtmlPath, loginComponentHtmlContent, 'utf8');
    const loginComponentTsContent = `
    import { Component } from '@angular/core';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule,FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private userService: UserService, private router: Router ){}
  ngOnInit(): void {
    
  }
  onSubmit(){
    const loginData = {
      email: this.email,
      password: this.password
    };
    this.userService.login(loginData).subscribe(
      (response) => {
        console.log('Login successful', response);
        // Navigate to the desired route after successful login
        this.router.navigate(['/mainMenu']);
      },
      (error) => {
        alert('Error en el login, revisa tus credenciales');
        console.error('Login error', error);
        // Handle login error here (e.g., show an error message)
      }
    );
  }

  goToRegisterUser(){
    this.router.navigate(['/register']);
  }

}
    `
    fs.writeFileSync(loginComponentTsPath, loginComponentTsContent, 'utf8');
    const loginComponentCssContent = `
    .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f3f4f6;
    height: 100vh;
}

/* Login box styles */
.login-box {
    background-color: #ffffff;
    width: 100%;
    max-width: 400px;
    padding: 20px;
    border-radius: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Header styles */
.login-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.welcome-text {
    font-size: 18px;
    font-family: 'Arial', sans-serif;
    color: #000000;
}

.register-link {
    text-align: right;
    font-size: 12px;
    color: #6b7280;
}

.register-text {
    color: #8644b3;
    cursor: pointer;
    font-weight: bold;
}

/* Title styles */
.login-title {
    font-size: 28px;
    font-weight: bold;
    margin: 20px 0;
    color: #000000;
    font-family: 'Arial', sans-serif;
}

/* Form styles */
.login-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-label {
    font-size: 14px;
    font-family: 'Arial', sans-serif;
    color: #4b5563;
    margin-bottom: 5px;
}

.form-input {
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    color: #374151;
    outline: none;
}

.form-input:focus {
    border-color: #14b8a6;
    box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.5);
}

/* Button styles */
.submit-button {
    padding: 10px;
    background-color: #9ad6ce;
    color: #ffffff;
    font-size: 16px;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.submit-button:hover {
    background-color: #14b8a6;
}

.submit-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.5);
}
    `
    fs.writeFileSync(loginComponentCssPath, loginComponentCssContent, 'utf8');

//Va lo del register
    const registerComponentHtmlContent = `
    <div class="login-container">
    <div class="login-box">
        <div class="login-header">
            <p class="welcome-text">Bienvenido a tu proyecto generado</p>
            <div class="register-link">
                <p>Ya tienes una cuenta? <span class="register-text" (click)="goToLogin()">Inicia sesión</span></p>
            </div>
        </div>

        <h1 class="login-title">Registrar usuario</h1>
        
        <form onsubmit="onSubmit()" class="login-form">
            <div class="form-group">
                <label for="email" class="form-label">Ingresa tu email</label>
                <input type="text" id="email" [(ngModel)]="email" name="email" placeholder="email" class="form-input" />
            </div>
            
            <div class="form-group">
                <label for="password" class="form-label">Ingresa tu contraseña</label>
                <input type="password" id="password" [(ngModel)]="password" name="password" placeholder="Contraseña" class="form-input" />
            </div>
            
            <button type="submit" class="submit-button" (click)="onSubmit()">Iniciar Sesión</button>
        </form>
    </div>
</div>
    `
    fs.writeFileSync(registerComponentHtmlPath, registerComponentHtmlContent, 'utf8');
    const registerComponentTsContent = `
    import { Component } from '@angular/core';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule,FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  email = '';
  password = '';

  constructor(private userService: UserService, private router: Router ){}
  ngOnInit(): void {
    
  }
  onSubmit(){
    const loginData = {
      email: this.email,
      password: this.password
    };
    this.userService.register(loginData).subscribe(
      (response) => {
        console.log('Login successful', response);
        // Navigate to the desired route after successful login
        this.router.navigate(['/']);
      },
      (error) => {
        alert('Error en el login, revisa tus credenciales');
        console.error('Login error', error);
        // Handle login error here (e.g., show an error message)
      }
    );
  }

  goToLogin(){
    this.router.navigate(['/']);
  }
}
    `
    fs.writeFileSync(registerComponentTsPath, registerComponentTsContent, 'utf8');
    const registerComponentCssContent = `
    .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f3f4f6;
    height: 100vh;
}

/* Login box styles */
.login-box {
    background-color: #ffffff;
    width: 100%;
    max-width: 400px;
    padding: 20px;
    border-radius: 20px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Header styles */
.login-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.welcome-text {
    font-size: 18px;
    font-family: 'Arial', sans-serif;
    color: #000000;
}

.register-link {
    text-align: right;
    font-size: 12px;
    color: #6b7280;
}

.register-text {
    color: #8644b3;
    cursor: pointer;
    font-weight: bold;
}

/* Title styles */
.login-title {
    font-size: 28px;
    font-weight: bold;
    margin: 20px 0;
    color: #000000;
    font-family: 'Arial', sans-serif;
}

/* Form styles */
.login-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-label {
    font-size: 14px;
    font-family: 'Arial', sans-serif;
    color: #4b5563;
    margin-bottom: 5px;
}

.form-input {
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    color: #374151;
    outline: none;
}

.form-input:focus {
    border-color: #14b8a6;
    box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.5);
}

/* Button styles */
.submit-button {
    padding: 10px;
    background-color: #9ad6ce;
    color: #ffffff;
    font-size: 16px;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.submit-button:hover {
    background-color: #14b8a6;
}

.submit-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.5);
}
    `
    fs.writeFileSync(registerComponentCssPath, registerComponentCssContent, 'utf8');

    //Main menu component
    const mainMenuComponentHtmlContent = `
    <div class="main-content">
    <div class="text-container">
        <p class="parrafo">Seleccione una clase para acceder al CRUD</p>
        <div class="grid">
            @if (proyectos && proyectos.length > 0) {
                @for (proyecto of proyectosPaginados(); track $index) {
                    <a class="card" (click)="Ingresar(proyecto.nombre)">
                        <h5 class="card-title">{{proyecto.nombre}}</h5>
                    </a>
                }
            } @else {
                <p class="no-proyectos">No hay proyectos disponibles.</p>
            }
        </div>

        @if (proyectos && totalPages > 1) {
            <div class="pagination">
                <button class="page-btn" [disabled]="paginaActual === 1" (click)="cambiarPagina(paginaActual - 1)">Previous</button>
                @for (pagina of generarPaginas(); track $index) {
                    <button 
                        class="page-number" 
                        [ngClass]="{'active': paginaActual === pagina}" 
                        (click)="cambiarPagina(pagina)">
                        {{pagina}}
                    </button>
                }
                <button class="page-btn" [disabled]="paginaActual === totalPages" (click)="cambiarPagina(paginaActual + 1)">Next</button>
            </div>
        }
    </div>
</div>
    `
    fs.writeFileSync(mainMenuComponentHtmlPath, mainMenuComponentHtmlContent, 'utf8');
    const mainMenuComponentTsContent = `
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.css'
})
export class MainMenuComponent {
  proyectos: any[]=[
  
  ]

  nombre:any;
  itemsPorPagina = 6; // Número de proyectos por página
  paginaActual = 1;   // Página actual
  descripcion:any;
  constructor(private router: Router){}
  Ingresar(nombre: string){
    this.nombre=nombre.toLocaleLowerCase();
    this.router.navigate(['/' + this.nombre]);
    console.log(this.nombre);
  }
  proyectosPaginados(): any[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.proyectos.slice(inicio, fin);
  }

  get totalPages(): number {
    return Math.ceil(this.proyectos.length / this.itemsPorPagina);
  }
  // Cambia la página actual
  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages) {
      this.paginaActual = pagina;
    }
  }

  // Genera un array con los números de página
  generarPaginas(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
    `
    fs.writeFileSync(mainMenuComponentTsPath, mainMenuComponentTsContent, 'utf8');
    const mainMenuComponentCssContent = `
    body {
    font-family: 'Lexend Deca', sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f9fafb;
    color: #111827;
}

.main-content {
    padding: 2rem;
}

.text-container {
    max-width: 1200px;
    margin: 0 auto;

}

.titulo {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 1rem;
}

.subtitulo {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 2rem;
}

.parrafo {
    color: #4b5563;
    margin-bottom: 1.5rem;
}

.btn {
    padding: 0.5rem 1rem;
    background-color: #2563eb;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.btn:hover {
    background-color: #1e40af;
}

.grid {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    grid-template-rows: repeat(2,1fr);
    gap: 1rem;
    margin-top: 1rem;
    
}

.card {
    background-color: #124fb2;
    border: 1px solid #e5e7eb;
    color: #ffff;
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: background-color 0.3s ease;
    
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    cursor: pointer;
}

.card:hover {
    background-color: #0e2e61;
    transform: translateY(-5px);
}

.card-title {
    font-size: 1.25rem;
    font-weight: bold;
}

.card-description {
    margin-left: 1rem;
    color: #374151;
    flex-grow: 1;
}

.btn-ingresar {
    align-self: flex-start;
    margin-left: 1rem;
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background-color: #2563eb;
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.btn-ingresar:hover {
    background-color: #1e40af;
}

.no-proyectos {
    color: #6b7280;
}

.pagination {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
    gap: 0.5rem;
}

.page-btn,
.page-number {
    padding: 0.5rem 1rem;
    background-color: #e5e7eb;
    color: #374151;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-number.active {
    background-color: #3b82f6;
    color: white;
}
    `
    fs.writeFileSync(mainMenuComponentCssPath, mainMenuComponentCssContent, 'utf8');
    console.log('Componentes generados correctamente');
}

generarServiciosBase = async (servicesFolderPath) => {
    await executeCommand('ng g s user', servicesFolderPath);
    const userServicePath = path.join(servicesFolderPath, 'user.service.ts');
    const userServiceContent = `
    import { inject, Injectable } from '@angular/core';
    import { apiUrl } from '../apiLink';
    import { HttpClient } from '@angular/common/http';
    import { Observable } from 'rxjs';

    @Injectable({
      providedIn: 'root'
    })
    export class UserService {
      private apiUrl = apiUrl; // Aquí no interpolamos
      private http = inject(HttpClient);
      constructor() { }
      login(data: any): Observable<any> {
        return this.http.post<any>(\`\${this.apiUrl}/login\`, data, {withCredentials: true});
      }
      register(data: any): Observable<any> {
        return this.http.post<any>(\`\${this.apiUrl}/users\`, data, {withCredentials: true});
      }
    }
    `;
    fs.writeFileSync(userServicePath, userServiceContent.trim(), 'utf8');
    console.log('Servicios generados correctamente');
};

processGraphModelFrontend = async (graphModel, componentsFolderPath, servicesFolderPath, appRoutesPath) => {
    console.log('Procesando el modelo de grafo para el frontend...');

    const clasesRelacionadas = [];
    const relacionesPorClase = {}; // Mapa para almacenar las relaciones por clase
    graphModel.nodeDataArray.forEach(node => {
        clasesRelacionadas.push({ key: node.key, name: node.name });
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

        } else if (link.category === 'composicion') {
            
        }});

    graphModel.nodeDataArray.forEach(async node => {
        console.log(`🔹 Generando modelo: ${node.name}`);
        clasesRelacionadas.push({ key: node.key, name: node.name });
        console.log(clasesRelacionadas);
        await generarComponentesClases(node, componentsFolderPath, appRoutesPath, relacionesPorClase, clasesRelacionadas);
        await generarServiciosClases(node, servicesFolderPath, relacionesPorClase);
    });


    const mainMenuComponentPath = path.join(componentsFolderPath, 'main-menu');
    const mainMenuComponentTsPath = path.join(mainMenuComponentPath, 'main-menu.component.ts');

// Leer el archivo actual
let mainMenuContent = fs.readFileSync(mainMenuComponentTsPath, 'utf8');

// Generar contenido de proyectos
const proyectosEntries = graphModel.nodeDataArray.map(node => {
  return `  { nombre: '${node.name}' }`;
}).join(',\n');

// Crear nuevo array
const nuevosProyectos = `proyectos: any[] = [\n${proyectosEntries}\n];`;

// Reemplazar la definición anterior del array
mainMenuContent = mainMenuContent.replace(/proyectos:\s*any\[\]\s*=\s*\[[\s\S]*?\]/, nuevosProyectos);


// Escribir el nuevo contenido
fs.writeFileSync(mainMenuComponentTsPath, mainMenuContent, 'utf8');
};

generarComponentesClases = async (node, componentsFolderPath, appRoutesPath, relacionesPorClase, clasesRelacionadas) => {
    await executeCommand(`ng g c ${node.name}`, componentsFolderPath);
    const componentPath = path.join(componentsFolderPath, node.name);
    fs.mkdirSync(componentPath, { recursive: true });
    const componentHtmlPath = path.join(componentPath, `${node.name}.component.html`);
    const componentTsPath = path.join(componentPath, `${node.name}.component.ts`);
    const componentCssPath = path.join(componentPath, `${node.name}.component.css`);
    const classProperties = node.properties || [];
    const atributosJson = JSON.stringify(classProperties, null, 2);

    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    const className = capitalize(node.name) + 'Component';
    const serviceName = capitalize(node.name) + 'Service';
    

    Object.keys(relacionesPorClase).forEach((fromKey) => {
        if (relacionesPorClase[fromKey].includes(node.name)) {
            // Buscar el nombre de la clase correspondiente a la clave (fromKey)
            const fromClass = clasesRelacionadas.find((clase) => clase.key === parseInt(fromKey));
            if (fromClass) {
                const fromClassName = fromClass.name; // Obtener el nombre de la clase
                classProperties.push({
                    name: `${fromClassName}id`,
                    type: 'number',
                    visibility: '+',
                });
            }
        }
    });

    // Generar la cadena de atributos en el formato esperado
    const atributosString = generarAtributosString(classProperties);


    //Agregar a la ruta
    const  importComponent = `
    import { ${className} } from './components/${node.name.toLowerCase()}/${node.name.toLowerCase()}.component';
    `
    let routesContent = fs.readFileSync(appRoutesPath, 'utf8');
    routesContent = importComponent + '\n' + routesContent;

    const addRoute = `
    ,{
        path: '${node.name.toLowerCase()}',
        component: ${className}
    }
    `
    const insertIndex = routesContent.indexOf('];') - 1; //
    routesContent = routesContent.slice(0, insertIndex) + addRoute + routesContent.slice(insertIndex);
    fs.writeFileSync(appRoutesPath, routesContent, 'utf8');

    const componentHtmlContent = `
    <body>
    <header>
      <nav class="navbar">
        <div class="navbar-left">
          <select id="combo-box" (change)="onOptionChange($event)">
            <option value="opcion1">GET ALL</option>
            <option value="opcion2">GET ACTIVOS</option>
            <option value="opcion3">GET BY ID</option>
            <option value="opcion4">POST</option>
            <option value="opcion5">PUT</option>
            <option value="opcion6">DELETE</option>
            @if (relacion==true) {

                <option value="opcion7">GET WITH RELATIONS</option>
                <option value="opcion8">GET ACTIVE WITH RELATIONS</option>
                <option value="opcion9">GET WITH RELATIONS BY ID</option>

            }
            
          </select>
        </div>
        <div class="navbar-right">
          <button class="cancel-button" (click)="regresar()">Cancelar</button>
          <button class="accept-button" (click)="enviarPeticion()">Aceptar</button>
        </div>
      </nav>
    </header>

    <div>
        @if(selectedOption == "opcion1"){
            <h1>Selecciona el boton de aceptar</h1>
            <div class="mascota-list">
                @if(data.length > 0){
                    <table>
                        <thead>
                            <tr>
                                <th *ngFor="let key of getKeys()">{{key}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let item of data">
                                <td *ngFor="let key of getKeys()">{{item[key]}}</td>
                            </tr>
                        </tbody>
                    </table>
                }
            </div>
        }@else if (selectedOption == "opcion2") {
            <h1>Selecciona el boton de aceptar</h1>
            <div class="mascota-list">
                @if(data.length > 0){
                    <table>
                        <thead>
                            <tr>
                                <th *ngFor="let key of getKeys()">{{key}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let item of data">
                                <td *ngFor="let key of getKeys()">{{item[key]}}</td>
                            </tr>
                        </tbody>
                    </table>
                }
            </div>
        }@else if (selectedOption == "opcion3") {
            <h1>Ingresa el id de {{componenteName}} y selecciona el boton de aceptar</h1>
            <input type="number" [(ngModel)]="inputId" placeholder="Buscar por ID" class="input">
            <div class="mascota-list">
                <p *ngIf="mensajeError">{{ mensajeError }}</p>
                @if(data.length > 0){
                    <table>
                        <thead>
                            <tr>
                                <th *ngFor="let key of getKeys()">{{key}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let item of data">
                                <td *ngFor="let key of getKeys()">{{item[key]}}</td>
                            </tr>
                        </tbody>
                    </table>
                }
            </div>
        }@else if (selectedOption == "opcion7") {
            <h1>Selecciona el boton de aceptar</h1>
            <div class="mascota-list">
                @if(data.length > 0){
                    <table>
                        <thead>
                            <tr>
                                <th *ngFor="let key of getKeys()">{{key}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let item of data">
                                <td *ngFor="let key of getKeys()">
                                    <ng-container *ngIf="isArray(item[key]); else normalCell">
                                      <div *ngIf="item[key].length === 0">-</div>
                                      <ul *ngIf="item[key].length > 0">
                                        <li *ngFor="let subItem of item[key]">
                                          {{ subItem | json }}
                                        </li>
                                      </ul>
                                    </ng-container>
                                    <ng-template #normalCell>
                                      {{ item[key] }}
                                    </ng-template>
                                  </td>
                            </tr>
                        </tbody>
                    </table>
                }
            </div>
        }@else if (selectedOption == "opcion8") {
            <h1>Selecciona el boton de aceptar</h1>
            <div class="mascota-list">
                @if(data.length > 0){
                    <table>
                        <thead>
                            <tr>
                                <th *ngFor="let key of getKeys()">{{key}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let item of data">
                                <td *ngFor="let key of getKeys()">
                                    <ng-container *ngIf="isArray(item[key]); else normalCell">
                                      <div *ngIf="item[key].length === 0">-</div>
                                      <ul *ngIf="item[key].length > 0">
                                        <li *ngFor="let subItem of item[key]">
                                          {{ subItem | json }}
                                        </li>
                                      </ul>
                                    </ng-container>
                                    <ng-template #normalCell>
                                      {{ item[key] }}
                                    </ng-template>
                                  </td>
                            </tr>
                        </tbody>
                    </table>
                }
            </div>
        }@else if (selectedOption == "opcion9") {
            <h1>Ingresa el id de {{componenteName}} y selecciona el boton de aceptar</h1>
            <input type="number" [(ngModel)]="inputId" placeholder="Buscar por ID" class="input">
            <div class="mascota-list">
                <p *ngIf="mensajeError">{{ mensajeError }}</p>
                @if(data.length > 0){
                    <table>
                        <thead>
                            <tr>
                                <th *ngFor="let key of getKeys()">{{key}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let item of data">
                                <td *ngFor="let key of getKeys()">
                                    <ng-container *ngIf="isArray(item[key]); else normalCell">
                                      <div *ngIf="item[key].length === 0">-</div>
                                      <ul *ngIf="item[key].length > 0">
                                        <li *ngFor="let subItem of item[key]">
                                          {{ subItem | json }}
                                        </li>
                                      </ul>
                                    </ng-container>
                                    <ng-template #normalCell>
                                      {{ item[key] }}
                                    </ng-template>
                                  </td>
                            </tr>
                        </tbody>
                    </table>
                }
            </div>
        }@else if (selectedOption == "opcion4") {
            <h1>Llena los datos de {{componenteName}} y selecciona el boton de aceptar</h1>
            <form  #formulario="ngForm">
                <div *ngFor="let atributo of atributos" class="mb-4">
                  <label [for]="atributo.name" class="block font-semibold">
                    {{ atributo.name }} (tipo: {{ atributo.type }})
                  </label>
                  <input
                    [id]="atributo.name"
                    [name]="atributo.name"
                    [type]="atributo.type === 'number' ? 'number' : 'text'"
                    [(ngModel)]="formData[atributo.name]"
                    class="input2"
                    required
                  />
                </div>
              </form>
        }@else if (selectedOption == "opcion5") {
           <h1>Ingresa el id de {{componenteName}} y selecciona el boton de buscarId, modifica lo necesario y selecciona el boton de Aceptar</h1>
            <input type="number" [(ngModel)]="inputId" placeholder="Buscar por ID" class="input">
            <button (click)="buscarId()" class="btnID">Buscar ID</button>
            <form  #formulario="ngForm">
                <div *ngFor="let atributo of atributos" class="mb-4">
                  <label [for]="atributo.name" class="block font-semibold">
                    {{ atributo.name }} (tipo: {{ atributo.type }})
                  </label>
                  <input
                    [id]="atributo.name"
                    [name]="atributo.name"
                    [type]="atributo.type === 'number' ? 'number' : 'text'"
                    [(ngModel)]="formData[atributo.name]"
                    class="input2"
                    required
                  />
                </div>
              </form>
              <p *ngIf="mensajeError">{{ mensajeError }}</p>
        }@else if (selectedOption == "opcion6") {
            <h1>Ingresa el id de {{componenteName}} y selecciona el boton de aceptar</h1>
            <input type="number" [(ngModel)]="inputId" placeholder="Buscar por ID" class="input">
        }
    </div>
  </body>
    `
    fs.writeFileSync(componentHtmlPath, componentHtmlContent, 'utf8');

    let componentTsContent = `
    import { Component } from '@angular/core';
import { ${serviceName} } from '../../services/${node.name.toLowerCase()}.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-${node.name.toLowerCase()}',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './${node.name.toLowerCase()}.component.html',
  styleUrl: './${node.name.toLowerCase()}.component.css'
})
export class ${className} {
  relacion = false;
  selectedOption = 'opcion1'; // Valor inicial
  data: any[] = [];
  componenteName = '${node.name}';
  inputId: number |null = null;
  mensajeError: string |null = null;
  mostrarIsActive: boolean = true; // por defecto sí se muestra
atributos: { name: string; type: string; visibility: string }[] = [
        ${atributosString}
      ];
      formData: { [key: string]: any } = {}; // Aquí se guarda lo que se escribe
  // Cambiar si existe la relación
  constructor(private ${node.name.toLowerCase()}Service: ${serviceName}, private router: Router){}

  onOptionChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedOption = selectElement.value;
    this.data = []; // Limpiar los datos al cambiar la opción
    this.inputId = null; // Limpiar el inputId al cambiar la opción
    this.mensajeError = ''; // Limpiar el mensaje de error al cambiar la opción
    this.formData = {};
  }

  enviarPeticion(){
    if(this.selectedOption === 'opcion1') {
      this.${node.name.toLowerCase()}Service.getAll().subscribe((response) => {
        console.log(response);
        this.data = response;
        this.mostrarIsActive = true;
      });
    } else if(this.selectedOption === 'opcion2') {
      this.${node.name.toLowerCase()}Service.getActivos().subscribe((response) => {
        console.log(response);
        this.data = response;
        this.mostrarIsActive = false;
      });
    } else if(this.selectedOption === 'opcion3') {
      if(this.inputId !== null) {
        this.${node.name.toLowerCase()}Service.getById(this.inputId).subscribe((response) => {
          console.log(response);
          if (response == null) {
            this.data = []; // Limpiar los datos si no se encuentra la mascota
            this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
          }else {
          this.data = [response]; // Asegúrate de que la respuesta sea un objeto y no un array
          this.mensajeError = null; // Limpiar el mensaje de error si se encuentra la mascota
          this.mostrarIsActive = true;
          }
        }, (error: any) => {
          this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
          console.error('Error:', error);
        }
      );
      }
    } else if(this.selectedOption === 'opcion4') {
     this.mapFormDataToTypes();
      this.${node.name.toLowerCase()}Service.post(this.formData).subscribe((response) => {
        console.log(response);
        this.data = [response]; // Asegúrate de que la respuesta sea un objeto y no un array
        this.mensajeError = null; // Limpiar el mensaje de error si se encuentra la mascota
        alert('${node.name.toLowerCase()} creada correctamente'); // Mensaje de éxito
        this.formData = {}; // Limpiar el formulario después de crear la mascota
      }, (error: any) => {
        this.mensajeError = 'Error al crear la ${node.name.toLowerCase()}.';
        console.error('Error:', error);
      });
    } else if(this.selectedOption === 'opcion5') {
     this.mapFormDataToTypes();
      if(this.inputId === null) {
        this.mensajeError = 'Por favor, ingrese un ID válido.';
        return;
      }
      this.${node.name.toLowerCase()}Service.put(this.inputId, this.formData).subscribe((response) => {
        console.log(response);
        if (response == null) {
          this.data = []; // Limpiar los datos si no se encuentra la mascota
          this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
        }else {
        this.data = [response]; // Asegúrate de que la respuesta sea un objeto y no un array
        this.mensajeError = null; // Limpiar el mensaje de error si se encuentra la mascota
        alert('${node.name.toLowerCase()} actualizada correctamente'); // Mensaje de éxito
        this.inputId = null; // Limpiar el inputId después de actualizar la mascota
        }
      }, (error: any) => {
        this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
        console.error('Error:', error);
      });
    } else if(this.selectedOption === 'opcion6') {
      if(this.inputId !== null) {
        this.${node.name.toLowerCase()}Service.delete(this.inputId).subscribe((response) => {
          console.log(response);
          if (response == null) {
            this.data = []; // Limpiar los datos si no se encuentra la mascota
            this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
          }else {
          this.data = [response]; // Asegúrate de que la respuesta sea un objeto y no un array
          this.mensajeError = null; // Limpiar el mensaje de error si se encuentra la mascota
          alert('${node.name.toLowerCase()} eliminada correctamente'); // Mensaje de éxito
          this.inputId = null; // Limpiar el inputId después de eliminar la mascota
          }
        }, (error: any) => {
          this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
          console.error('Error:', error);
        });
      }
    } 
    // Meter aquí relaciones si existen
  }
  getKeys(): string[] {
    if (this.data.length === 0) return [];
  return Object.keys(this.data[0]).filter(key => {
    if (!this.mostrarIsActive && key === 'isActive') return false;
    return true;
  });
  }
  buscarId() {
    if (this.inputId !== null) {
      this.${node.name.toLowerCase()}Service.getById(this.inputId).subscribe((response) => {
        console.log(response);
        if (response == null) {
          this.data = []; // Limpiar los datos si no se encuentra la ${node.name.toLowerCase()}
          this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
        }else {
        this.data = [response]; // Asegúrate de que la respuesta sea un objeto y no un array
        this.mensajeError = null; // Limpiar el mensaje de error si se encuentra la mascota
        this.formData = {...response}
        }
      }, (error: any) => {
        this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
        console.error('Error:', error);
      });
    }
  }
  isArray(value: any): boolean {
    return Array.isArray(value);
  }
regresar(){
    this.router.navigate(['/mainMenu']);
  }
    private mapFormDataToTypes(): void {
    this.atributos.forEach((atributo) => {
      const value = this.formData[atributo.name];
      if (value !== undefined && value !== null) {
        if (atributo.type === 'number') {
          this.formData[atributo.name] = Number(value); // Convertir a número
        } else if (atributo.type === 'string') {
          this.formData[atributo.name] = String(value); // Asegurarse de que sea string
        }
        // Puedes agregar más tipos si es necesario
      }
    });
  }
}

    `


    if (relacionesPorClase[node.key] && relacionesPorClase[node.key].length > 0) {
        const relacionesBlock = `
        else if(this.selectedOption === 'opcion7') {
      this.${node.name.toLowerCase()}Service.getWithRelations().subscribe((response) => {
        console.log(response);
        this.data = response;
        this.mostrarIsActive = true;
      });
    } else if(this.selectedOption === 'opcion8') {
      this.${node.name.toLowerCase()}Service.getActivosWithRelations().subscribe((response) => {
        console.log(response);
        this.data = response;
        this.mostrarIsActive = false;
      });
    } else if(this.selectedOption === 'opcion9') {
      if(this.inputId !== null) {
        this.${node.name.toLowerCase()}Service.getByIdWithRelations(this.inputId).subscribe((response) => {
          console.log(response);
          if (response == null) {
            this.data = []; // Limpiar los datos si no se encuentra la mascota
            this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
          }else {
          this.data = [response]; // Asegúrate de que la respuesta sea un objeto y no un array
          this.mensajeError = null; // Limpiar el mensaje de error si se encuentra la mascota
          this.mostrarIsActive = true;
          }
        }, (error: any) => {
          this.mensajeError = 'No se encontró la ${node.name.toLowerCase()} con el ID proporcionado.';
          console.error('Error:', error);
        });
}}
        `
        componentTsContent = componentTsContent.replace('// Meter aquí relaciones si existen' , relacionesBlock);
        const opcionesBlock = `
        relacion = true;
        `
        componentTsContent = componentTsContent.replace('relacion = false;', opcionesBlock);

        
    }
    

fs.writeFileSync(componentTsPath, componentTsContent, 'utf8');


    const componentCssContent = `
    * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  margin: 0;
}

header {
  width: 100vw; 
  background-color: #2563eb;
  box-shadow: 20px 2px 30px rgba(0, 0, 0, 0.1);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  width: 100%;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}
.navbar-left select {
  padding: 8px;
  font-size: 16px;
}

.navbar-right {
  display: flex;
  align-items: center;
}

#combo-box {
  border-radius: 10px;
  cursor: pointer;
}

.cancel-button,
.accept-button {
  padding: 10px 20px;
  margin-left: 10px;
  font-size: 16px;
  cursor: pointer;
  border: none;
  background-color: #ffffff;
  color: rgb(0, 0, 0);
  border-radius: 10px;
  transition: background-color 0.3s;
}

.cancel-button:hover,
.accept-button:hover {
  background-color: #bebebe;
}

.input {

margin: 20px 27px;
width: 100%;
max-width: 220px;
height: 45px;
padding: 12px;
border-radius: 12px;
border: 1.5px solid lightgrey;
outline: none;
transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
box-shadow: 0px 0px 20px -18px;
}

.input:hover {
border: 2px solid lightgrey;
box-shadow: 0px 0px 20px -17px;
}

.input:active {
transform: scale(0.95);
}

.input:focus {
border: 2px solid grey;
}


.input-group {
  margin-bottom: 20px;
  display: none; /* Todos ocultos al inicio */
}

.input-group label {
  display: block;
  margin-top: 10px;
  font-weight: bold;
}

.input-group input {
  width: 100%;
  padding: 8px;
  margin-top: 5px;
  box-sizing: border-box;
}

.mascota-list {
  width: 95%;
  margin: 30px auto;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
  background-color: white;
  border-radius: 10px;
  overflow: hidden;
}

thead {
  background-color: #2563eb;
  color: white;
}

thead th {
  padding: 15px;
  text-align: left;
  font-weight: bold;
  font-size: 16px;
}

tbody td {
  padding: 12px 15px;
  border-bottom: 1px solid #ddd;
}

tbody tr:hover {
  background-color: #f1f5f9;
}

p {
  color: red;
  font-weight: bold;
  text-align: center;
  margin-top: 20px;
  font-family: Arial, Helvetica, sans-serif;
}

h1 {
  margin: 20px 27px;
  font-family: Arial, Helvetica, sans-serif;
}

.btnID{

  margin: 20px 27px;
width: 100%;
max-width: 100px;
height: 45px;
padding: 12px;
border-radius: 12px;
border: 1.5px solid lightgrey;
outline: none;
transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
box-shadow: 0px 0px 20px -18px;
cursor: pointer;

}

.btnID:hover {
  border: 2px solid rgb(146, 146, 146);
  box-shadow: 0px 0px 20px -17px;
}

.input2 {

width: 100%;
max-width: 150px;
height: 25px;
padding: 12px;
border-radius: 8px;
border: 1.5px solid lightgrey;
outline: none;
transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
box-shadow: 0px 0px 20px -18px;

}

.lbl {
  font-family: Arial, Helvetica, sans-serif;
  margin: 20px 27px;

}
    `
    fs.writeFileSync(componentCssPath, componentCssContent, 'utf8');
    console.log(`Componente generado correctamente: ${componentPath}`);

}

const generarAtributosString = (classProperties) => {
    return classProperties
        .map(
            (prop) =>
                `{
      name: '${prop.name}',
      type: '${prop.type}',
      visibility: '${prop.visibility}'
    }`
        )
        .join(',\n');
};

generarServiciosClases = async (node, servicesFolderPath, relacionesPorClase) => {
    await executeCommand(`ng g s ${node.name}`, servicesFolderPath);
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    const serviceName = capitalize(node.name) + 'Service';
    const servicePath = path.join(servicesFolderPath, `${node.name}.service.ts`);
    let serviceContent = `
    import { inject, Injectable } from '@angular/core';
    import { apiUrl } from '../apiLink';
    import { HttpClient } from '@angular/common/http';
    import { Observable } from 'rxjs';

    @Injectable({
      providedIn: 'root'
    })
    export class ${serviceName} {
      private apiUrl = apiUrl + '/${node.name.toLowerCase()}';
      private http = inject(HttpClient);

      constructor() {}

      getAll(): Observable<any> {
        return this.http.get(this.apiUrl,{withCredentials: true});
      }

      getActivos(): Observable<any> {
        return this.http.get(this.apiUrl + '/activos', {withCredentials: true});
      }

      getById(id: number): Observable<any> {
        return this.http.get(this.apiUrl + '/' + id, {withCredentials: true});
      }

      post(data: any): Observable<any> {
        return this.http.post(this.apiUrl, data, {withCredentials: true});
      }

      put(id: number, data: any): Observable<any> {
        return this.http.put(this.apiUrl + '/' + id, data, {withCredentials: true});
      }

      delete(id: number): Observable<any> {
        return this.http.delete(this.apiUrl + '/' + id, {withCredentials: true});
      }
    }
    `;

    //  Agregar endpoints si hay relaciones
    if (relacionesPorClase[node.key] && relacionesPorClase[node.key].length > 0) {
        const urlBase = `'/${node.name.toLowerCase()}WithRelations'`;
        const withRelationsMethods = `
      
      getWithRelations(): Observable<any> {
        return this.http.get(apiUrl + ${urlBase}, {withCredentials: true});
      }

      getActivosWithRelations(): Observable<any> {
        return this.http.get(apiUrl + ${urlBase} + '/activos', {withCredentials: true});
      }

      getByIdWithRelations(id: number): Observable<any> {
        return this.http.get(apiUrl + ${urlBase} + '/' + id, {withCredentials: true});
      }
        `;
     // Insertar antes del último cierre de la clase
    const closingIndex = serviceContent.lastIndexOf('}');
    serviceContent = serviceContent.slice(0, closingIndex) + withRelationsMethods + '\n' + serviceContent.slice(closingIndex);
    }
    console.log(relacionesPorClase[node.key]);



    fs.writeFileSync(servicePath, serviceContent.trim(), 'utf8');
    console.log(`Servicio generado correctamente: ${servicePath}`);
};

//Diagrama de paquetes

const diagramaPaquetesBackend = (backendPath, paquetesGraph) => {
    const nodes = paquetesGraph.nodeDataArray;

    // Mapa para acceder rápido por key
    const nodeMap = new Map();
    nodes.forEach(node => nodeMap.set(node.key, node));

    // Mapa que guarda los hijos de cada grupo
    const childrenMap = new Map();
    nodes.forEach(node => {
        const parent = node.group;
        if (parent !== undefined) {
            if (!childrenMap.has(parent)) {
                childrenMap.set(parent, []);
            }
            childrenMap.get(parent).push(node);
        }
    });

    // Función recursiva para crear estructura
    const crearEstructura = (key, currentPath) => {
        const node = nodeMap.get(key);
        const nombreCarpeta = `${node.text}_${key}`; // Para evitar duplicados con mismo texto
        const newPath = path.join(currentPath, nombreCarpeta);

        // Solo crea carpeta si es un grupo
        if (node.isGroup) {
            if (!fs.existsSync(newPath)) {
                fs.mkdirSync(newPath);
            }

            const hijos = childrenMap.get(key) || [];
            hijos.forEach(hijo => {
                crearEstructura(hijo.key, newPath);
            });
        }else {
            const archivoPath = path.join(currentPath, `${node.text}_${key}.txt`);
            fs.writeFileSync(archivoPath, `Contenido de ${node.text}`);
        }
    };

    // Comenzar desde los nodos raíz (sin group)
    nodes.forEach(node => {
        if (node.group === undefined) {
            crearEstructura(node.key, backendPath);
        }
    });
};

const diagramaPaquetesFrontend = (frontendPath, paquetesGraph) => {
    srcPath = path.join(frontendPath, 'src');
    appPath = path.join(srcPath, 'app');
    const nodes = paquetesGraph.nodeDataArray;

    // Mapa para acceder rápido por key
    const nodeMap = new Map();
    nodes.forEach(node => nodeMap.set(node.key, node));

    // Mapa que guarda los hijos de cada grupo
    const childrenMap = new Map();
    nodes.forEach(node => {
        const parent = node.group;
        if (parent !== undefined) {
            if (!childrenMap.has(parent)) {
                childrenMap.set(parent, []);
            }
            childrenMap.get(parent).push(node);
        }
    });

    // Función recursiva para crear estructura
    const crearEstructura = (key, currentPath) => {
        const node = nodeMap.get(key);
        const nombreCarpeta = `${node.text}_${key}`; // Para evitar duplicados con mismo texto
        const newPath = path.join(currentPath, nombreCarpeta);

        // Solo crea carpeta si es un grupo
        if (node.isGroup) {
            if (!fs.existsSync(newPath)) {
                fs.mkdirSync(newPath);
            }

            const hijos = childrenMap.get(key) || [];
            hijos.forEach(hijo => {
                crearEstructura(hijo.key, newPath);
            });
        }else {
            const archivoPath = path.join(currentPath, `${node.text}_${key}.txt`);
            fs.writeFileSync(archivoPath, `Contenido de ${node.text}`);
        }
    };

    // Comenzar desde los nodos raíz (sin group)
    nodes.forEach(node => {
        if (node.group === undefined) {
            crearEstructura(node.key, appPath);
        }
    });
};

module.exports = {
    createProject
};