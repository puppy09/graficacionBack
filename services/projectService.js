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

const createProject = async (nombreProyecto, graphModel) => {
    const desktopPath = path.join(require('os').homedir(), 'Desktop');
    const projectFolderPath = path.join(desktopPath, nombreProyecto);
    const frontendPath = path.join(projectFolderPath, `${nombreProyecto}-frontend`);
    const backendPath = path.join(projectFolderPath, `${nombreProyecto}-backend`);

    // Crear carpeta del proyecto
    if (fs.existsSync(projectFolderPath)) {
        console.log('seguimos con lo demas');
        processGraphModel(graphModel);

    }else{
        fs.mkdirSync(projectFolderPath, {recursive: true});
        console.log(`Carpeta del proyecto creada en ${projectFolderPath}`);
    
        // Crear proyecto frontend
        console.log('Creando proyecto frontend en angular...');
        await executeCommand(`npx -y @angular/cli new ${nombreProyecto}-frontend --defaults`, projectFolderPath);
    
        // Crear proyecto backend
        console.log('Creando proyecto backend en express...');
        await executeCommand(`npx express-generator ${nombreProyecto}-backend --no-view`, projectFolderPath);
    
        console.log('instalando las dependencias del backend...');
        await executeCommand('npm install', backendPath);
    
        console.log('Proyecto creado correctamente');
    }
};


const processGraphModel = (graphModel) => {
    console.log('📌 Procesando nodos:');
    graphModel.nodeDataArray.forEach(node => {
        console.log(`🔹 Clase: ${node.name}`);
        console.log('   📜 Propiedades:');
        node.properties.forEach(prop => console.log(`   - ${prop.name}: ${prop.type}`));
        console.log('   🔧 Métodos:');
        node.methods.forEach(method => console.log(`   - ${method.name}(): ${method.type}`));
    });

    console.log('\n🔗 Procesando enlaces:');
    graphModel.linkDataArray.forEach(link => {
        console.log(`   🔗 Relación: ${link.category || 'sin categoría'} (de ${link.from} a ${link.to})`);
    });
};

module.exports = {
    createProject
};