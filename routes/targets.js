var express = require('express');
var router = express.Router();
var pinger = require('../pinger');

/* GET users listing. */
router.get('/', function(req, res) {
  res.render('target', { title: 'FirePing' });
});

router.post('/add', function(req,res){
  console.log(req.body);
  pinger.addTarget(req.body['target'], req.body['hostname']);
  res.render('target', { title: 'FirePing' });
});

module.exports = router;
