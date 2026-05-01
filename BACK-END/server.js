require("dotenv").config()
const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const app = express()
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

app.use(cors({ origin: '*', }))     // Em desenvolvimento aceita qualquer origem 
app.use(express.json())

app.use(morgan("dev"))

const PORT = process.env.PORT || 3000

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
})

const prisma = new PrismaClient({ adapter })

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Token não fornecido" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Token inválido" });
        }
        req.user = user;
        next();
    });
};

//Rota para cadastro do usuário
app.post("/auth/signup", async (req, res, next) => {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Os campos name, email e password são obrigários" })
    }
    const UserExist = await prisma.User.findUnique({
        where: { email }
    })
    if (UserExist) {
        return res.status(409).json({ message: "O usuário já existe! Por favor altere o email caso quiser prosseguir com a cadastração" })
    }
    const HashPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.User.create({
        data: {
            name,
            email,
            password: HashPassword
        }
    })
    res.status(201).json({
        name: newUser.name,
        email: newUser.email
    })
})

//Rota para login
app.post("/auth/signin", async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({ message: "Os campos name, email e password são obrigários" })
    }
    const User = await prisma.User.findUnique({
        where: { email }
    })

    if (!User) {
        return res.status(401).json({ message: "As credencias são inválidas!" })
    }

    const VerificarPassword = await bcrypt.compare(password, User.password)

    if (!VerificarPassword) {
        return res.status(401).json({ message: "As credencias são inválidas!" })
    }

    const token = jwt.sign(
        { id: User.id, email: User.email, role: User.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    )
    res.status(201).json({ token })
})

app.get("/auth/profile", authenticateToken, async (req, res) => {
    try {
        // O id vem do token decodificado no middleware
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar perfil" });
    }
});

function authorizeRole(roleRequired) {
    return (req, res, next) => {
        // Verifica se o usuário existe e se tem o cargo necessário
        if (!req.user || req.user.role !== roleRequired) {
            return res.status(403).json({
                message: "Acesso negado: você não tem permissão de " + roleRequired
            });
        }
        next(); // Se estiver tudo certo, vai para a rota
    };
}

// Primeiro autentica o token, depois verifica se é ADMIN
app.get("/admin/all-tasks", authenticateToken, authorizeRole("ADMIN"), async (req, res) => {
    const allTasks = await prisma.task.findMany({
        include: { author: { select: { name: true } } }
    });
    res.json(allTasks);
});


app.get("/tasks", authenticateToken, async (req, res, next) => {
    try {
        console.log(req.user)
        const task = await prisma.Task.findMany({
            where: { userId: req.user.id }
        })
        res.status(200).json(task)
    }
    catch (error) {
        next(error)
    }

})

app.get("/tasks/:id", authenticateToken, async (req, res, next) => {
    try {
        console.log(req.user)
        const id = req.params.id
        const task = await prisma.Task.findFirst({
            where: {
                userId: req.user.id,
                id: id }
        })
        if (!task) {
            return res.status(404).json({ message: "A tarefa não existe, verifique o id" })
        }
        res.status(200).json(task)
    }
    catch (error) {
        next(error)
    }
})

app.post("/tasks", authenticateToken, async (req, res, next) => {
    try {
        console.log(req.user)
        const { title, priority, completed, description } = req.body
        if (!title || !priority || !completed) {
            return res.status(400).json({ message: "Os campos title, priority e completed são obrigatórios" })
        }
        const task = await prisma.Task.create({
            data: {
                title,
                priority,
                completed,
                description,
                author: {
                    connect: { id: req.user.id }
                }
            }
        })
        res.status(201).json(task)
    }
    catch (error) {
        next(error)
    }
})

app.put("/tasks/:id", authenticateToken, async (req, res, next) => {
    try {
        console.log(req.user)
        const { title, priority, completed, description } = req.body
        const id = req.params.id
        if (!title || !priority || completed === undefined) {
            return res.status(400).json({ message: "Os campos title, priority e completed são obrigatórios" })
        }
        const task = await prisma.Task.update({
            where: {
                id: id,
                userId: req.user.id },
            data: {
                title,
                priority,
                completed,
                description
            }
        })
        res.status(200).json(task)
    }
    catch (error) {
        if (error.code == "P2025") {
            res.status(404).json({ message: "A tarefa não existe, por favor verique o id" })
        }
        next(error)
    }
})

app.delete("/tasks/:id", authenticateToken, async (req, res, next) => {
    try {
        console.log(req.user)
        const id = req.params.id
        const task = await prisma.Task.delete({
            where: { 
                id: id,
                userId: req.user.id }
        })
        res.status(200).json({ message: "A tarefa foi deletado com sucesso" })
    }
    catch (error) {
        if (error.code == "P2025") {
            res.status(404).json({ message: "A tarefa não existe, por favor verique o id" })
        }
        next(error)
    }
})

//Middlewares de erros
app.use((req, res) => {
    res.status(404).json({ message: "Rota não encontrada" })
})

app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ message: "Erro no interior do servidor" })
})

app.listen(PORT, () => {
    console.log(`✅ Servidor a correr em http://localhost:${PORT}`)
})
