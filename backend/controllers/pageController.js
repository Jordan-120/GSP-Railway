const mongoose = require('mongoose');

const Page = require('../models/pageModel');
const Action = require('../models/actionModel'); 

//Controller function to create a new page
const createPage = async (req, res) => {
    try {
        const newPage = new Page(req.body);
        await newPage.save();
        //Logging the action
        await Action.create({
            userId: req.user ? req.user._id : null,
            pageId: newPage._id,
            action: "create_page",
            payload: { page_name: newPage.page_name }
        });

        res.status(201).json(newPage);
    } catch (error) {
        //console.error("Error creating page:", error); // testing
        res.status(400).json({ message: "Error creating page", error });
    }   
};

//Controller function to get all pages
const getAllPages = async (req, res) => {
    try {
        const pages = await Page.find();
        res.status(200).json(pages);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving page", error });
    }
};

//Controller function to get a specific page by ID
const getPageById = async (req, res) => {
    try {
        const {id} = req.params; //for testing
        if (!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({message: "Invalid page ID format"})
        }
        const page = await Page.findById(req.params.id);  //Find page by Id
        if (!page) return res.status(404).json({ message: "Page not found" });
        res.status(200).json(page); //send the updated student as the response
    } catch (error) {
        console.error("Error retrieving page:", error.message);
        res.status(500).json({ message: "Error retrieving page", error: error.message });
    }
};

//Controller function to update a page by ID
const updatePage = async (req, res) => {
    try {
        const page = await Page.findByIdAndUpdate(req.params.id, req.body, { new: true });  //update page by Id
        if (!page) return res.status(404).json({ message: "Page not found" });
        //Logging the action
        await Action.create({
            userId: req.user ? req.user._id : null,
            pageId: page._id,
            action: "update_page",
            payload: { updateFields: req.body }
        });

        res.status(200).json(page); //send the updated page as the response
    } catch (error) {
        res.status(400).json({ message: "Error updating page", error });
    }
};

//Controller function to delete a page
const deletePage = async (req, res) => {
    try {
        const page = await Page.findByIdAndDelete(req.params.id);  //delete page by Id
        if (!page) return res.status(404).json({ message: "Page not found" });
        //Logging the action
        await Action.create({
            userId: req.user ? req.user._id : null,
            pageId: page._id,
            action: "delete_page",
            payload: { deletedPageName: page.page_name }
        });

        res.status(200).json({ message: "Page deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting page", error });
    }
};


// Controller function to Add a new section to a page
const createSectionToPage = async (req, res) => {
  try {
    const { pageId } = req.params;
    const { section_title, data_entries, functions } = req.body;

    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const newSection = {
      section_title,
      section_number: page.sections.length + 1, // auto-generate
      data_entries: data_entries || [],
      functions: functions || []
    };

    page.sections.push(newSection);
    await page.save();
    const addedSection = page.sections[page.sections.length - 1];
    //Logging the action
    await Action.create({
        userId: req.user ? req.user._id : null,
        pageId: page._id,
        sectionId: addedSection._id,
        action: "create_section",
        payload: { section_title: addedSection.section_title }
    });

    res.status(201).json(addedSection);
  } catch (error) {
    res.status(400).json({ message: "Error adding section", error: error.message });
  }
};

// Controller function to Update a section in a page
const updateSectionInPage = async (req, res) => {
  try {
    const { pageId, sectionId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    Object.assign(section, req.body);
    await page.save();
    //Logging the action
    await Action.create({
        userId: req.user ? req.user._id : null,
        pageId: page._id,
        sectionId: section._id,
        action: "update_section",
        payload: { updateFields: req.body }
    });

    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ message: "Error updating section", error: error.message });
  }
};

// Controller function to get all sections in a page
const getAllSectionsInPage = async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.status(200).json(page.sections);
  } catch (error) {
    res.status(400).json({ message: "Error retrieving sections", error: error.message });
  }
};

// Controller function to get a section by ID in a page
const getSectionInPageById = async (req, res) => {
  try {
    const { pageId, sectionId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ message: "Error retrieving section", error: error.message });
  }
};

// Controller function to delete a section from a page
const deleteSectionFromPage = async (req, res) => {
  try {
    const { pageId, sectionId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    page.sections.pull(sectionId);
    await page.save();
    //Logging the action
    await Action.create({
        userId: req.user ? req.user._id : null,
        pageId: page._id,
        sectionId: section._id,
        action: "delete_section",
        payload: { deletedSectionTitle: section.section_title }
    });

    res.status(200).json({ message:"Section deleted successfully"});
  } catch (error) {
    res.status(400).json({ message: "Error deleting section", error: error.message });
  }
};

// Controller function to add a function to a section
const createFunctionToSection = async (req, res) => {
  try {
    const { pageId, sectionId } = req.params;
    const { function_name } = req.body;

    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    section.functions.push({ function_name });
    await page.save();
    const addedFunction = section.functions[section.functions.length - 1];
    //Logging the action
    await Action.create({
      userId: req.user ? req.user._id : null,
      pageId: page._id,
      sectionId: section._id,
      action: "create_function",
      payload: { function_name: addedFunction.function_name }
    });

    res.status(201).json(addedFunction);
  } catch (error) {
    res.status(400).json({ message: "Error adding function", error: error.message });
  }
};

// controller function to Update a function in a section
const updateFunctionInSection = async (req, res) => {
  try {
    const { pageId, sectionId, functionId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const func = section.functions.id(functionId);
    if (!func) return res.status(404).json({ message: "Function not found" });

    Object.assign(func, req.body);
    await page.save();
    //Logging the action
    await Action.create({
      userId: req.user ? req.user._id : null,
      pageId: page._id,
      sectionId: section._id,
      action: "update_function",
      payload: { updatedFields: req.body }
    });

    res.status(200).json(func);
  } catch (error) {
    res.status(400).json({ message: "Error updating function", error: error.message });
  }
};

// Controller to get all functions in a section
const getAllFunctionsInSection = async (req, res) => {
  try {
    const { pageId, sectionId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    res.status(200).json(section.functions);
  } catch (error) {
    res.status(400).json({ message: "Error retrieving functions", error: error.message });
  }
};

// Controller function to get a function by ID in a section
const getFunctionInSectionById = async (req, res) => {
  try {
    const { pageId, sectionId, functionId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const func = section.functions.id(functionId);
    if (!func) return res.status(404).json({ message: "Function not found" });

    res.status(200).json(func);
  } catch (error) {
    res.status(400).json({ message: "Error retrieving function", error: error.message });
  }
};

// Controller function to delete a function in a section
const deleteFunctionInSection = async (req, res) => {
  try {
    const { pageId, sectionId, functionId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const gspFunction = section.functions.id(functionId);
    if (!gspFunction) return res.status(404).json({ message: "Function not found" });

    section.functions.pull(functionId);
    await page.save();
    //Logging the action
    await Action.create({
      userId: req.user ? req.user._id : null,
      pageId: page._id,
      sectionId: section._id,
      action: "delete_function",
      payload: { deletedFunctionName: gspFunction.function_name }
    });

    res.status(200).json({ message: "Function deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting function", error: error.message });
  }
};

// Controller function to add data entry to a section
const createDataEntryToSection = async (req, res) => {
  try {
    const { pageId, sectionId } = req.params;
    const { entry_title, content_text } = req.body;

    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    section.data_entries.push({ entry_title, content_text });
    await page.save();
    const addedData = section.data_entries[section.data_entries.length - 1]
    //Logging the action
    await Action.create({
      userId: req.user ? req.user._id : null,
      pageId: page._id,
      sectionId: section._id,
      entryId: addedData._id,
      action: "create_entry",
      payload: { entry_title: addedData.entry_title }
    });

    res.status(201).json(addedData);
  } catch (error) {
    res.status(400).json({ message: "Error adding data entry", error: error.message });
  }
};

// Controller function to update a data entry in a section
const updateDataEntryInSection = async (req, res) => {
  try {
    const { pageId, sectionId, entryId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const entry = section.data_entries.id(entryId);
    if (!entry) return res.status(404).json({ message: "Data entry not found" });

    Object.assign(entry, req.body);
    await page.save();
    //Logging the action
    await Action.create({
      userId: req.user ? req.user._id : null,
      pageId: page._id,
      sectionId: section._id,
      entryId: entry._id,
      action: "update_entry",
      payload: { updatedFields: req.body }
    });

    res.status(200).json(entry);
  } catch (error) {
    res.status(400).json({ message: "Error updating data entry", error: error.message });
  }
};


// Controller function to get all data entries in a section
const getAllDataEntriesInSection = async (req, res) => {
  try {
    const { pageId, sectionId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    res.status(200).json(section.data_entries);
  } catch (error) {
    res.status(400).json({ message: "Error retrieving data entries", error: error.message });
  }
};

// Controller function to get data entry in a section by id
const getDataEntryInSectionById = async (req, res) => {
  try {
    const { pageId, sectionId, entryId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const entry = section.data_entries.id(entryId);
    if (!entry) return res.status(404).json({ message: "Data entry not found" });

    res.status(200).json(entry);
  } catch (error) {
    res.status(400).json({ message: "Error retrieving data entry", error: error.message });
  }
};

// Delete a data entry in a section
const deleteDataEntryInSection = async (req, res) => {
  try {
    const { pageId, sectionId, entryId } = req.params;
    const page = await Page.findById(pageId);
    if (!page) return res.status(404).json({ message: "Page not found" });

    const section = page.sections.id(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const dataentry = section.data_entries.id(entryId);
    if (!dataentry) return res.status(404).json({ message: "Data entry not found" });

    section.data_entries.pull(entryId);
    await page.save();
    //Logging the action
    await Action.create({
      userId: req.user ? req.user._id : null,
      pageId: page._id,
      sectionId: section._id,
      entryId: dataentry._id,
      action: "delete_entry",
      payload: { deletedEntryTitle: dataentry.entry_title }
    });

    res.status(200).json({ message: "Data entry deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting data entry", error: error.message });
  }
};

//Exporting all controller functions
module.exports = {
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
    deleteDataEntryInSection
};

