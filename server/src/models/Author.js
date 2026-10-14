import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del autor es obligatorio'],
      trim: true,
      unique: true,
    },
    biografia: {
      type: String,
      default: '',
      trim: true,
    },
    nacionalidad: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'authors',
  }
);

export const Author = mongoose.model('Author', authorSchema);
export default Author;
