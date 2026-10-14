import User from '../models/User.js';

// GET /api/v1/users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password_hash').sort({ fecha_registro: -1 });
    res.json({ success: true, total: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/users/:id
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/users
export const createUser = async (req, res) => {
  try {
    const { nombre_usuario, correo, password_hash, password, tipo_usuario } = req.body;
    const finalPasswordHash = password_hash || password || 'default_hashed_pass';

    const newUser = new User({
      nombre_usuario,
      correo,
      password_hash: finalPasswordHash,
      tipo_usuario: tipo_usuario || 'lector',
    });

    const savedUser = await newUser.save();
    const userObj = savedUser.toObject();
    delete userObj.password_hash;

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: userObj,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/users/:id
export const updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };
    // Evitar sobreescribir password_hash accidentalmente a menos que se envíe explícitamente
    if (updates.password && !updates.password_hash) {
      updates.password_hash = updates.password;
      delete updates.password;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password_hash');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/users/:id
export const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      data: { id: deletedUser._id, nombre_usuario: deletedUser.nombre_usuario },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
