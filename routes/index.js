var express = require('express');
var router = express.Router();
const versionService = require('../services/versionService');
const { crearProyecto, getProyectos, updaProyecto } = require('../controllers/proyectos');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//Proyectos
router.post('/crearproyecto', crearProyecto);
router.get('/proyectos', getProyectos);
router.put('/proyecto/:id_proyecto', updaProyecto);
module.exports = router;
