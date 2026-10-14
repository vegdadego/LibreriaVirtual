import mongoose from 'mongoose';

const autorEmbebidoSchema = new mongoose.Schema(
  {
    id_autor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const sagaEmbebidaSchema = new mongoose.Schema(
  {
    id_saga: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Saga',
    },
    nombre_saga: {
      type: String,
      trim: true,
    },
    numero_en_saga: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const contenidoEscaneadoSchema = new mongoose.Schema(
  {
    pagina: {
      type: Number,
      required: true,
    },
    texto: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const bookSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, 'El título del libro es obligatorio'],
      trim: true,
    },
    fecha_publicacion: {
      type: Date,
    },
    empresa_edicion: {
      type: String,
      trim: true,
    },
    numero_edicion: {
      type: Number,
      default: 1,
    },
    sinopsis: {
      type: String,
      default: '',
      trim: true,
    },
    idioma: {
      type: String,
      default: 'es',
      trim: true,
    },
    categorias: {
      type: [String],
      default: [],
    },
    autores: {
      type: [autorEmbebidoSchema],
      default: [],
    },
    saga: {
      type: sagaEmbebidaSchema,
      default: null,
    },
    contenido_escaneado: {
      type: [contenidoEscaneadoSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'books',
  }
);

export const Book = mongoose.model('Book', bookSchema);
export default Book;
