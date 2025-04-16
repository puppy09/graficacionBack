var express = require('express');
const { request } = require('../app');
var router = express.Router();
//const versionService = require('../services/versionService');
const { crearProyecto, getProyectos, updatedProyecto } = require('../controllers/proyectos');
const { crearDiagrama, getDiagramas, updateDiagrama } = require('../controllers/diagrama');
const { crearVersion, getVersion, updatedVersion, getSingleVersion } = require('../controllers/versiones');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//Proyectos
router.post('/crearproyecto', crearProyecto);
router.get('/proyectos', getProyectos);
router.put('/proyecto/:id_proyecto', updatedProyecto);

//Diagramas
router.post('/creardiagrama', crearDiagrama);
router.get('/diagramas', getDiagramas);
router.put('/diagrama/:diagrama', updateDiagrama);

//Versiones
router.post('/crearversion', crearVersion);
router.get('/version/:version', getSingleVersion);
router.get('/versiones/:proyecto/:diagrama', getVersion);
router.put('/version/:version', updatedVersion);
module.exports = router;
