var express = require('express');
const { request } = require('../app');
var router = express.Router();
//const versionService = require('../services/versionService');
const { crearProyecto, getProyectos, updatedProyecto } = require('../controllers/proyectos');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//Proyectos
router.post('/crearproyecto', crearProyecto);
router.get('/proyectos', getProyectos);
router.put('/proyecto/:id_proyecto', updatedProyecto);
module.exports = router;
