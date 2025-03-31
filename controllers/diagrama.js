const Diagrama = require("../models/diagramas");

const crearDiagrama = async(req, res)=>{
    try{

        const {diagrama} = req.body;
        
        const newDiagrama = await Diagrama.create({nombre:diagrama});
        return res.status(200).json(newDiagrama);
    }catch(error){
        console.log(error);
        return res.status(500).json({message:' Error creando proyecto'});
    }
}

const getDiagramas = async(req, res)=>{
    try{

        const diagramas = await Diagrama.findAll();
        return res.status(200).json({diagramas});
    }catch(error){
        console.log(error);
        return res.status(500).json({message:' Error creando proyecto'});
    }
}
module.exports = {crearDiagrama, getDiagramas};