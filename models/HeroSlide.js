const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema({
    slideId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    sub: { type: String, required: true },
    image: { type: String, required: true },
    btnText: { type: String, required: true }
});

module.exports = mongoose.model('HeroSlide', heroSlideSchema);
