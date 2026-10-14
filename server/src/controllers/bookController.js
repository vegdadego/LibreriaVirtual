import Book from '../models/Book.js';

// GET /api/v1/books (Listar con filtros)
export const getAllBooks = async (req, res) => {
  try {
    const { categoria, saga, busqueda } = req.query;
    const filter = {};

    if (categoria) {
      filter.categorias = { $in: [categoria] };
    }
    if (saga) {
      filter['saga.nombre_saga'] = new RegExp(saga, 'i');
    }
    if (busqueda) {
      filter.$or = [
        { titulo: new RegExp(busqueda, 'i') },
        { sinopsis: new RegExp(busqueda, 'i') },
        { 'autores.nombre': new RegExp(busqueda, 'i') },
      ];
    }

    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      total: books.length,
      data: books,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/books/:id (Obtener libro por ID)
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Libro no encontrado' });
    }
    res.json({ success: true, data: book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/books (Crear / Subir libro)
export const createBook = async (req, res) => {
  try {
    const newBook = new Book(req.body);
    const savedBook = await newBook.save();
    res.status(201).json({
      success: true,
      message: 'Libro registrado exitosamente',
      data: savedBook,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/books/:id (Editar libro)
export const updateBook = async (req, res) => {
  try {
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedBook) {
      return res.status(404).json({ success: false, message: 'Libro no encontrado' });
    }
    res.json({
      success: true,
      message: 'Libro actualizado exitosamente',
      data: updatedBook,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/books/:id (Eliminar libro)
export const deleteBook = async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    if (!deletedBook) {
      return res.status(404).json({ success: false, message: 'Libro no encontrado' });
    }
    res.json({
      success: true,
      message: 'Libro eliminado exitosamente',
      data: deletedBook,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
