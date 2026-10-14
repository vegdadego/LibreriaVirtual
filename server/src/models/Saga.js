import mongoose from 'mongoose';

const sagaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la saga es obligatorio'],
      trim: true,
      unique: true,
    },
    descripcion: {
      type: String,
      default: '',
      trim: true,
    },
    estado: {
      type: String,
      enum: ['Finalizada', 'En emisión', 'Pausada', 'Cancelada'],
      default: 'En emisión',
    },
    libros_totales: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'sagas',
  }
);

export const Saga = mongoose.model('Saga', sagaSchema);
export default Saga;
