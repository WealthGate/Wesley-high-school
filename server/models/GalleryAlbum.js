const mongoose = require('mongoose');

const GalleryAlbumSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    images: [{
        type: String
    }],
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('GalleryAlbum', GalleryAlbumSchema);
