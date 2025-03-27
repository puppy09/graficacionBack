var express = require('express');
var router = express.Router();
const versionService = require('../services/versionService');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
