const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const morgan = require('morgan');
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');

const salt = bcrypt.genSaltSync(10);
const secret = 'asdfe45we45w345wegw345werjktjwertkj';

// Permitir o CORS para o frontend
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

// Middleware para log das requisições
app.use(morgan('dev'));

mongoose.set('strictQuery', false);

// Conexão com o MongoDB local
mongoose.connect('mongodb://localhost:27017/Blog-Notinhas', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Conectado ao MongoDB local"))
    .catch(err => console.error("Erro ao conectar ao MongoDB:", err));

// Endpoints da API
app.post('/register', async (req, res) => {
    console.log("Requisição para registrar um novo usuário");
    const { username, password } = req.body;
    try {
        const userDoc = await User.create({
            username,
            password: bcrypt.hashSync(password, salt),
        });
        console.log("Usuário registrado:", userDoc);
        res.json(userDoc);
    } catch (e) {
        console.error("Erro ao registrar usuário:", e);
        res.status(400).json(e);
    }
});

app.post('/login', async (req, res) => {
    console.log("Requisição para login");
    const { username, password } = req.body;
    const userDoc = await User.findOne({ username });
    const passOk = userDoc && bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
        jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
            if (err) throw err;
            console.log("Usuário logado:", username);
            res.cookie('token', token).json({
                id: userDoc._id,
                username,
            });
        });
    } else {
        console.warn("Tentativa de login com senha inválida para usuário:", username);
        res.status(400).json('Senha Inválida');
    }
});

app.get('/profile', (req, res) => {
    const { token } = req.cookies;

    if (!token) {
        // Se o token não está presente, retorne uma resposta de erro
        return res.status(401).json({ error: "Token não fornecido" });
    }

    jwt.verify(token, secret, {}, (err, info) => {
        if (err) {
            console.error("Erro ao verificar token:", err);
            return res.status(401).json({ error: "Token inválido" });
        }
        res.json(info);
    });
});

app.post('/logout', (req, res) => {
    console.log("Requisição para logout");
    res.cookie('token', '').json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    console.log("Requisição para criar um novo post");
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath);

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
        const { title, summary, content } = req.body;
        const postDoc = await Post.create({
            title,
            summary,
            content,
            cover: newPath,
            author: info.id,
        });
        console.log("Novo post criado:", postDoc);
        res.json(postDoc);
    });
});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
    console.log("Requisição para atualizar um post");
    let newPath = null;
    if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
    }

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
        const { id, title, summary, content } = req.body;
        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        if (!isAuthor) {
            console.warn("Tentativa de atualização de post por usuário não autorizado");
            return res.status(400).json('Esse post não pertence a você!');
        }
        await postDoc.updateOne({
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover,
        });

        console.log("Post atualizado:", postDoc);
        res.json(postDoc);
    });
});

app.delete('/post/:id', async (req, res) => {
    const { token } = req.cookies;

    // Verifica a existência e validade do token
    if (!token) {
        console.warn("Tentativa de exclusão de post sem token de autenticação");
        return res.status(401).json("Token não fornecido");
    }

    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) {
            console.error("Falha na verificação do token ao tentar excluir post:", err);
            return res.status(401).json("Token inválido");
        }

        const { id } = req.params;
        const postDoc = await Post.findById(id);

        // Verifica se o post existe e se o usuário é o autor
        if (!postDoc) {
            console.warn(`Post com ID ${id} não encontrado para exclusão`);
            return res.status(404).json("Post não encontrado");
        }

        if (String(postDoc.author) !== String(info.id)) {
            console.warn(`Usuário ${info.username} tentou excluir um post sem permissão`);
            return res.status(403).json("Permissão negada");
        }

        try {
            // Exclui o post
            await postDoc.deleteOne();
            console.log(`Post com ID ${id} excluído com sucesso por usuário ${info.username}`);
            res.json({ success: true, message: "Post excluído com sucesso" });
        } catch (error) {
            console.error("Erro ao excluir o post:", error);
            res.status(500).json("Erro ao excluir o post");
        }
    });
});


app.get('/post', async (req, res) => {
    console.log("Requisição para obter todos os posts");
    res.json(
        await Post.find()
          .populate('author', ['username'])
          .sort({ createdAt: -1 })
          .limit(20)
    );
});

app.get('/post/:id', async (req, res) => {
    console.log(`Requisição para obter o post com id: ${req.params.id}`);
    const postDoc = await Post.findById(req.params.id).populate('author', ['username']);
    res.json(postDoc);
});

app.listen(4000, () => {
    console.log("Servidor rodando na porta 4000");
});
