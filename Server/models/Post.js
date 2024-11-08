const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const CommentSchema = new Schema({
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

const PostSchema = new Schema({
    title: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    cover: String,
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comments: [CommentSchema],  // Adiciona um array de comentários
}, 
{
    timestamps: true,
});

const PostModel = model('Post', PostSchema);

module.exports = PostModel;
