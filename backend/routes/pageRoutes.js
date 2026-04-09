const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createPage,
  getAllPages,
  getPageById,
  updatePage,
  deletePage,
  createSectionToPage,
  updateSectionInPage,
  getAllSectionsInPage,
  getSectionInPageById,
  deleteSectionFromPage,
  createFunctionToSection,
  updateFunctionInSection,
  getAllFunctionsInSection,
  getFunctionInSectionById,
  deleteFunctionInSection,
  createDataEntryToSection,
  updateDataEntryInSection,
  getAllDataEntriesInSection,
  getDataEntryInSectionById,
  deleteDataEntryInSection,
} = require('../controllers/pageController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createPage);
router.get('/', getAllPages);
router.get('/:id', getPageById);
router.put('/:id', updatePage);
router.delete('/:id', deletePage);
router.post('/:pageId/sections', createSectionToPage);
router.put('/:pageId/sections/:sectionId', updateSectionInPage);
router.get('/:pageId/sections', getAllSectionsInPage);
router.get('/:pageId/sections/:sectionId', getSectionInPageById);
router.delete('/:pageId/sections/:sectionId', deleteSectionFromPage);
router.post('/:pageId/sections/:sectionId/functions', createFunctionToSection);
router.put('/:pageId/sections/:sectionId/functions/:functionId', updateFunctionInSection);
router.get('/:pageId/sections/:sectionId/functions', getAllFunctionsInSection);
router.get('/:pageId/sections/:sectionId/functions/:functionId', getFunctionInSectionById);
router.delete('/:pageId/sections/:sectionId/functions/:functionId', deleteFunctionInSection);
router.post('/:pageId/sections/:sectionId/data_entries', createDataEntryToSection);
router.put('/:pageId/sections/:sectionId/data_entries/:entryId', updateDataEntryInSection);
router.get('/:pageId/sections/:sectionId/data_entries', getAllDataEntriesInSection);
router.get('/:pageId/sections/:sectionId/data_entries/:entryId', getDataEntryInSectionById);
router.delete('/:pageId/sections/:sectionId/data_entries/:entryId', deleteDataEntryInSection);

module.exports = router;
