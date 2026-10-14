import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    nombre_usuario: {
      type: String,
      required: [true, 'El nombre de usuario es obligatorio'],
      unique: true,
      trim: true,
    },
    correo: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un correo válido'],
    },
    password_hash: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
    },
    tipo_usuario: {
      type: String,
      enum: ['uploader', 'lector', 'admin'],
      default: 'lector',
    },
    fecha_registro: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

export const User = mongoose.model('User', userSchema);
export default User;
