const express = require('express');
const router = express.Router();
const fileController = require('../controllers/filecontroller');

router.post('/:user_id/files', fileController.uploadFile);
router.delete('/:user_id/files/:file_id', fileController.deleteFile);
router.get('/:user_id/storage-summary', fileController.StorageSummary);
router.get('/:user_id/files', fileController.getUserFiles);

module.exports = router;