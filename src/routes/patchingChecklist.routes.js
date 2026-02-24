const { Router } = require('express');
const patchingChecklistController = require('../controllers/patchingChecklist.controller');
const validateRequest = require('../middlewares/validateRequest');
const createFileUploadMiddleware = require('../middlewares/fileUpload');
const { createPatchingChecklistSchema } = require('../validations/patchingChecklist.validation');
const { requireAuth } = require('../middlewares/auth');

const router = Router();

const handlePatchingChecklistPicture = createFileUploadMiddleware({
    fieldName: 'picture',
    subDirectory: 'patching-checklist-pictures'
});

router
    .route('/patching-checklist')
    .post(requireAuth, handlePatchingChecklistPicture, validateRequest(createPatchingChecklistSchema), patchingChecklistController.createEntry)
    .get(requireAuth, patchingChecklistController.listEntries);

router.get('/patching-checklist/:unique_code', requireAuth, patchingChecklistController.getEntryByUniqueCode);

module.exports = router;

