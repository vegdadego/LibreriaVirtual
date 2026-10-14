import Author from '../models/Author.js';

// GET /api/v1/authors
export const getAllAuthors = async (req, res) => {
  try {
    const authors = await Author.find().sort({ nombre: 1 });
    res.json({ success: true, total: authors.length, data: authors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/authors/:id
export const getAuthorById = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ success: false, message: 'Autor no encontrado' });
    }
    res.json({ success: true, data: author });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/authors
export const createAuthor = async (req, res) => {
  try {
    const newAuthor = new Author(req.body);
    const savedAuthor = await newAuthor.save();
    res.status(201).json({
      success: true,
      message: 'Autor registrado exitosamente',
      data: savedAuthor,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/authors/:id
export const updateAuthor = async (req, res) => {
  try {
    const updatedAuthor = await Author.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedAuthor) {
      return res.status(404).json({ success: false, message: 'Autor no encontrado' });
    }
    res.json({
      success: true,
      message: 'Autor actualizado exitosamente',
      data: updatedAuthor,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/authors/:id
export const deleteAuthor = async (req, res) => {
  try {
    const deletedAuthor = await Author.findByIdAndDelete(req.params.id);
    if (!deletedAuthor) {
      return res.status(404).json({ success: false, message: 'Autor no encontrado' });
    }
    res.json({
      success: true,
      message: 'Autor eliminado exitosamente',
      data: deletedAuthor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
