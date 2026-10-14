import Saga from '../models/Saga.js';

// GET /api/v1/sagas
export const getAllSagas = async (req, res) => {
  try {
    const sagas = await Saga.find().sort({ nombre: 1 });
    res.json({ success: true, total: sagas.length, data: sagas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/sagas/:id
export const getSagaById = async (req, res) => {
  try {
    const saga = await Saga.findById(req.params.id);
    if (!saga) {
      return res.status(404).json({ success: false, message: 'Saga no encontrada' });
    }
    res.json({ success: true, data: saga });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/sagas
export const createSaga = async (req, res) => {
  try {
    const newSaga = new Saga(req.body);
    const savedSaga = await newSaga.save();
    res.status(201).json({
      success: true,
      message: 'Saga creada exitosamente',
      data: savedSaga,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/sagas/:id
export const updateSaga = async (req, res) => {
  try {
    const updatedSaga = await Saga.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedSaga) {
      return res.status(404).json({ success: false, message: 'Saga no encontrada' });
    }
    res.json({
      success: true,
      message: 'Saga actualizada exitosamente',
      data: updatedSaga,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/sagas/:id
export const deleteSaga = async (req, res) => {
  try {
    const deletedSaga = await Saga.findByIdAndDelete(req.params.id);
    if (!deletedSaga) {
      return res.status(404).json({ success: false, message: 'Saga no encontrada' });
    }
    res.json({
      success: true,
      message: 'Saga eliminada exitosamente',
      data: deletedSaga,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
