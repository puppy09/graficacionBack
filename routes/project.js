var express = require('express');
var router = express.Router();
var projectService = require('../services/projectService');

router.post('/crear', async (req, res) => {
    const {nombreProyecto} = req.body;
    if (!nombreProyecto) {
        res.status(400).json({error: 'El nombre del proyecto es requerido'});
    }
    try{
        await projectService.createProject(nombreProyecto);
        res.json({message: 'Proyecto creado correctamente'});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
    });
module.exports = router;