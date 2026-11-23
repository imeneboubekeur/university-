
import multer from 'multer'

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const isPdf =
      file.mimetype === 'application/pdf' &&
      file.originalname.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      return callback(new Error('Only PDF files are allowed.'))
    }

    callback(null, true)
  },
})

export default upload
