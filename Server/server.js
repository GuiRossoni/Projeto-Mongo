// Importa as dependências necessárias
const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const morgan = require('morgan');
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');

// Configurações iniciais
const app = express();
const uploadMiddleware = multer({ dest: 'uploads/' }); // Define o destino dos uploads
const salt = bcrypt.genSaltSync(10); // Gera um salt para criptografia
const secret = 'asdfe45we45w345wegw345werjktjwertkj'; // Chave secreta para o JWT

// Permite o CORS para o frontend
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json()); // Permite que o Express manipule JSON
app.use(cookieParser()); // Permite que o Express manipule cookies
app.use('/uploads', express.static(__dirname + '/uploads')); // Torna a pasta uploads acessível

// Middleware para log das requisições
app.use(morgan('dev'));

// Configurações do Mongoose
mongoose.set('strictQuery', false);

// Conexão com o MongoDB local
mongoose.connect('mongodb://localhost:27017/Blog-Notinhas', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Conectado ao MongoDB local"))
    .catch(err => console.error("Erro ao conectar ao MongoDB:", err));

// Endpoint para registrar um novo usuário
app.post('/register', async (req, res) => {
    console.log("Requisição para registrar um novo usuário");
    const { username, password } = req.body;
    try {
        // Cria um novo documento de usuário com a senha criptografada
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

// Endpoint para login do usuário
app.post('/login', async (req, res) => {
    console.log("Requisição para login");
    const { username, password } = req.body;
    const userDoc = await User.findOne({ username });
    // Verifica se o usuário existe e se a senha está correta
    const passOk = userDoc && bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
        // Gera um token JWT
        jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
            if (err) throw err;
            console.log("Usuário logado:", username);
            // Envia o token como um cookie
            res.cookie('token', token).json({
                id: userDoc._id,
                username,
            });
        });
    } else {
        console.warn("Tentativa de login com senha inválida para usuário:", username);
        res.status(400).json('Senha inválida');
    }
});

// Endpoint para obter o perfil do usuário autenticado
app.get('/profile', (req, res) => {
    const { token } = req.cookies;

    if (!token) {
        return res.status(401).json({ error: "Token não fornecido" });
    }

    // Verifica o token JWT
    jwt.verify(token, secret, {}, (err, info) => {
        if (err) {
            console.error("Erro ao verificar token:", err);
            return res.status(401).json({ error: "Token inválido" });
        }
        res.json(info);
    });
});

// Endpoint para logout do usuário
app.post('/logout', (req, res) => {
    console.log("Requisição para logout");
    // Limpa o cookie do token
    res.cookie('token', '').json('ok');
});

// Endpoint para criar um novo post
app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    console.log("Requisição para criar um novo post");
    // Gerencia o upload da imagem de capa
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath);

    // Verifica o token JWT para autenticação
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;
        const { title, summary, content } = req.body;
        // Cria um novo documento de post no banco de dados
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

// Endpoint para atualizar um post existente
app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
    console.log("Requisição para atualizar um post");

    const { id, title, summary, content } = req.body;
    if (!id) {
        return res.status(400).json({ error: "ID do post não fornecido" });
    }

    let newPath = null;
    if (req.file) {
        // Atualiza a imagem de capa se um novo arquivo for enviado
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
    }

    // Verifica o token JWT para autenticação
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) throw err;

        try {
            // Busca o post a ser atualizado
            const postDoc = await Post.findById(id);
            if (!postDoc) {
                return res.status(404).json({ error: "Post não encontrado" });
            }

            // Verifica se o usuário autenticado é o autor do post
            if (String(postDoc.author) !== String(info.id)) {
                console.warn("Tentativa de atualização de post por usuário não autorizado");
                return res.status(403).json('Permissão negada');
            }

            // Atualiza os campos do post
            await postDoc.updateOne({
                title,
                summary,
                content,
                cover: newPath ? newPath : postDoc.cover,
            });

            console.log("Post atualizado:", postDoc);
            res.json(postDoc);
        } catch (error) {
            console.error("Erro ao atualizar post:", error);
            res.status(500).json({ error: "Erro ao atualizar post" });
        }
    });
});

// Endpoint para excluir um post específico
app.delete('/post/:id', async (req, res) => {
    const { token } = req.cookies;

    if (!token) {
        console.warn("Tentativa de exclusão de post sem token de autenticação");
        return res.status(401).json("Token não fornecido");
    }

    // Verifica o token JWT
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) {
            console.error("Falha na verificação do token ao tentar excluir post:", err);
            return res.status(401).json("Token inválido");
        }

        const { id } = req.params;
        // Busca o post a ser excluído
        const postDoc = await Post.findById(id);

        if (!postDoc) {
            console.warn(`Post com ID ${id} não encontrado para exclusão`);
            return res.status(404).json("Post não encontrado");
        }

        // Verifica se o usuário autenticado é o autor do post
        if (String(postDoc.author) !== String(info.id)) {
            console.warn(`Usuário ${info.username} tentou excluir um post sem permissão`);
            return res.status(403).json("Permissão negada");
        }

        try {
            // Exclui o post do banco de dados
            await postDoc.deleteOne();
            console.log(`Post com ID ${id} excluído com sucesso por usuário ${info.username}`);
            res.json({ success: true, message: "Post excluído com sucesso" });
        } catch (error) {
            console.error("Erro ao excluir o post:", error);
            res.status(500).json("Erro ao excluir o post");
        }
    });
});

// Endpoint para obter todos os posts
app.get('/post', async (req, res) => {
    console.log("Requisição para obter todos os posts");
    // Retorna os últimos 20 posts ordenados por data de criação
    res.json(
        await Post.find()
            .populate('author', ['username'])
            .sort({ createdAt: -1 })
            .limit(20)
    );
});

// Endpoint para obter um post específico
app.get('/post/:id', async (req, res) => {
    console.log(`Requisição para obter o post com id: ${req.params.id}`);
    // Busca o post pelo ID e popula o campo autor
    const postDoc = await Post.findById(req.params.id).populate('author', ['username']);
    res.json(postDoc);
});

// Endpoint para adicionar um comentário a um post
app.post('/post/:postId/comment', async (req, res) => {
    const { token } = req.cookies;
    const { postId } = req.params;
    const { content } = req.body;

    if (!token) {
        return res.status(401).json("Token não fornecido");
    }

    // Verifica o token JWT
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) {
            return res.status(401).json("Token inválido");
        }

        try {
            // Busca o post para adicionar o comentário
            const post = await Post.findById(postId);
            if (!post) {
                return res.status(404).json("Post não encontrado");
            }

            // Cria um novo comentário
            const newComment = {
                content: content,
                author: info.id,
                createdAt: new Date(),
            };

            // Adiciona o comentário ao array de comentários do post
            post.comments.push(newComment);
            await post.save();

            res.json({ success: true, message: "Comentário adicionado com sucesso", comment: newComment });
        } catch (error) {
            console.error("Erro ao adicionar comentário:", error);
            res.status(500).json("Erro ao adicionar comentário");
        }
    });
});

// Endpoint para obter os comentários de um post
app.get('/post/:postId/comment', async (req, res) => {
    const { postId } = req.params;
    try {
        // Busca o post e popula os autores dos comentários
        const post = await Post.findById(postId).populate('comments.author', ['username']);
        if (!post) {
            return res.status(404).json("Post não encontrado");
        }
        res.json(post.comments);
    } catch (error) {
        console.error("Erro ao obter comentários:", error);
        res.status(500).json("Erro ao obter comentários");
    }
});

// Endpoint para excluir um comentário de um post
app.delete('/post/:postId/comment/:commentId', async (req, res) => {
    const { token } = req.cookies;
    const { postId, commentId } = req.params;

    if (!token) {
        return res.status(401).json("Token não fornecido");
    }

    // Verifica o token JWT
    jwt.verify(token, secret, {}, async (err, info) => {
        if (err) {
            return res.status(401).json("Token inválido");
        }

        try {
            // Busca o post
            const post = await Post.findById(postId);
            if (!post) {
                return res.status(404).json("Post não encontrado");
            }

            // Busca o comentário a ser excluído
            const comment = post.comments.id(commentId);

            if (!comment) {
                return res.status(404).json("Comentário não encontrado");
            }

            // Verifica se o usuário é o autor do comentário ou do post
            if (String(comment.author) === info.id || String(post.author) === info.id) {
                // Remove o comentário
                comment.remove();
                await post.save();
                res.json({ success: true, message: "Comentário excluído com sucesso" });
            } else {
                res.status(403).json("Permissão negada para excluir o comentário");
            }
        } catch (error) {
            console.error("Erro ao excluir comentário:", error);
            res.status(500).json("Erro ao excluir comentário");
        }
    });
});

// Inicia o servidor na porta 4000
app.listen(4000, () => {
    console.log("Servidor rodando na porta 4000");
});
