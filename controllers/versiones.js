const Versiones = require("../models/versiones");

const crearVersion = async(req,res)=>{
    try{
        const {proyecto, diagrama, version, contenido} = req.body;
        const nuevaVersion = await Versiones.create({id_proyecto: proyecto, id_diagrama: diagrama, version: version, json:contenido})
        return res.status(200).json(nuevaVersion);
    }catch(error){
        console.log(error);
        return res.status(500).json({message:' Error creando proyecto'});
    }
}

const updatedVersion = async(req,res)=>{
    try{
        const {proyecto, diagrama} = req.params;
        const proyectoInt = parseInt(proyecto);
        const diagramaInt = parseInt(diagrama);
        const {contenido} = req.body;
        console.log(contenido, proyectoInt, diagramaInt);
        const versionUpda = await Versiones.findOne({
            where:{
                id_proyecto: proyectoInt,
                id_diagrama: diagramaInt,
                isActive: 1
            }
        });
        console.log("Proyecto", versionUpda);
        versionUpda.json = contenido;
        versionUpda.save();
        return res.status(200).json(versionUpda);

    }catch(error){
        console.log(error);
        return res.status(500).json({message:' Error creando proyecto'});
    }
}

const getVersion = async(req,res)=>{
    try{
        const {proyecto, diagrama} = req.params;

        const proyectoParsed = parseInt(proyecto);
        const diagramaParsed = parseInt(diagrama);
        const versiones = await Versiones.findAll({
            where:{
                id_proyecto: proyectoParsed,
                id_diagrama: diagramaParsed
            }
        });
        return res.status(200).json(versiones);
    }catch(error){
        console.log(error);
        return res.status(500).json({message:' Error creando proyecto'});
    }
}
module.exports = {crearVersion, updatedVersion, getVersion}