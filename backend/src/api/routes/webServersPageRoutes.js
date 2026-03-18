const express = require('express');
const router = express.Router();
const c = require('../controllers/webServersPageController');

router.get('/os', c.getOsList);
router.post('/os', c.createOs);

router.get('/providers', c.getProvidersList);
router.post('/providers', c.createProvider);

router.get('/teams', c.getTeamsList);
router.post('/teams', c.createTeam);

router.get('/servers', c.getServers);
router.post('/servers', c.createServer);

// Дії з конкретним сервером
router.get('/servers/:id', c.getServerDetails); // НОВИЙ
router.put('/servers/:id', c.updateServer);
router.patch('/servers/:id/archive', c.archiveServer);
router.delete('/servers/:id', c.deleteServer);

module.exports = router;