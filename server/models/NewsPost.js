const mongoose = require('mongoose');

const NewsPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        default: 'Admin'
    },
    date: {
        type: Date,
        default: Date.now
    },
    featuredImage: {
        type: String,
        required: false
    }
});

module.exports = mongoose.model('NewsPost', NewsPostSchema);
