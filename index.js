const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const app = express();
const port = 3000;
const blacklist = [];

// Middleware para analisar o corpo da solicitação JSON
app.use(express.json());

// Realiza login no app
app.post('/login', (req, res) => {
  JWT_SECRET = process.env.JWT_SECRET;
  if (req.body.user === 'rodrigo' && req.body.password === '123'){
    const token = jwt.sign({ UserID: 1}, JWT_SECRET, {expiresIn: 1600});
    return res.json({ auth: true, token });
  }else{
    res.status(401).end(); 
  }
});

// Realiza logout da API
app.post('/logout', function (req, res) {
  const token = req.header('Authorization');
  if (token) {
    blacklist.push(token);
    res.json({ message: 'Logout bem-sucedido' });
  } else {
    res.status(401).json({ error: 'Token de autorização ausente' });
  }
});

// Middleware para autenticação
function authenticateToken(req, res, next) {
  const token = req.header('Authorization');

  if (!token) return res.sendStatus(401);
  // Verifica se o index não está na "blacklist" em caso de logout
  const index = blacklist.findIndex(item => item === token);
  if (index !== -1) return res.status (401).end();
  // Autentica o token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Configuração da conexão com o banco de dados usando variáveis de ambiente
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false // Necessário para evitar erros de certificado SSL
  }
});

// Rota para obter todos os registros da tabela 'aluno' ou filtrar por UserID
app.get('/getAlunos', authenticateToken, async (req, res) => {
  try {
    const { UserID } = req.query;

    let query = 'SELECT * FROM aluno';

    // Se UserID foi fornecido, filtre os dados pelo UserID
    if (UserID) {
      query += ' WHERE idAluno = $1';
    }
    console.log(query);
    const client = await pool.connect();
    const result = await client.query(query, [UserID].filter(Boolean)); // Filtra valores undefined ou null
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar dados:', err);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Rota para criar um novo aluno
app.post('/postAlunos', authenticateToken, async (req, res) => {
  try {
    const { primeiroNome, ultimoNome, cpf, matricula, dataNascimento } = req.body;
    const query = 'INSERT INTO aluno (primeiroNome, ultimoNome, cpf, matricula, dataNascimento) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [primeiroNome, ultimoNome, cpf, matricula, dataNascimento];
    const client = await pool.connect();
    const result = await client.query(query, values);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao criar aluno:', err);
    res.status(500).json({ error: 'Erro ao criar aluno' });
  }
});

// Rota para atualizar um aluno pelo ID
app.put('/putAlunos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { primeiroNome, ultimoNome, cpf, matricula, dataNascimento } = req.body;
    const query = 'UPDATE aluno SET primeiroNome = $1, ultimoNome = $2, cpf = $3, matricula = $4, dataNascimento = $5 WHERE idAluno = $6 RETURNING *';
    const values = [primeiroNome, ultimoNome, cpf, matricula, dataNascimento, id];
    const client = await pool.connect();
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Aluno não encontrado' });
    } else {
      res.json(result.rows[0]);
    }
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar aluno:', err);
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
});

// Rota para deletar um aluno pelo ID
app.delete('/deleteAlunos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'DELETE FROM aluno WHERE idAluno = $1 RETURNING *';
    const client = await pool.connect();
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Aluno não encontrado' });
    } else {
      res.json({ message: 'Aluno deletado com sucesso' });
    }
    client.release();
  } catch (err) {
    console.error('Erro ao deletar aluno:', err);
    res.status(500).json({ error: 'Erro ao deletar aluno' });
  }
});


// Inicie o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});


