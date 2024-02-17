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

//------------------------------------//

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

//------------------------------------//

// Create
app.post('/postCategorias', authenticateToken, async (req, res) => {
  try {
    const { nomeCategoria } = req.body;
    const client = await pool.connect();
    const result = await client.query('INSERT INTO CategoriaMateria (nomeCategoria) VALUES ($1) RETURNING *', [nomeCategoria]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao inserir categoria:', err);
    res.status(500).json({ error: 'Erro ao inserir categoria' });
  }
});

// Rota para obter todos os registros da tabela 'CategoriaMateria' ou filtrar por idCategoriaMateria ou nomeCategoria
app.get('/getCategorias', authenticateToken, async (req, res) => {
  try {
    const { idCategoriaMateria, nomeCategoria } = req.query;

    let query = 'SELECT * FROM CategoriaMateria';

    // Se idCategoriaMateria foi fornecido, filtre os dados pelo idCategoriaMateria
    if (idCategoriaMateria) {
      query += ' WHERE idCategoriaMateria = $1';
    } else if (nomeCategoria) {
      // Se nomeCategoria foi fornecido, filtre os dados pelo nome da categoria
      query += ' WHERE nomeCategoria ILIKE $1';
    }

    console.log(query);

    const client = await pool.connect();
    const result = await client.query(query, [idCategoriaMateria || nomeCategoria].filter(Boolean)); // Filtra valores undefined ou null
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Update
app.put('/putCategorias/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { nomeCategoria } = req.body;
    
    // Conecta ao banco de dados
    const client = await pool.connect();
    
    // Atualiza a categoria com o ID especificado
    const result = await client.query('UPDATE CategoriaMateria SET nomeCategoria = $1 WHERE idCategoriaMateria = $2 RETURNING *', [nomeCategoria, id]);
    
    // Retorna os dados atualizados da categoria
    res.json(result.rows[0]);
    
    // Libera o cliente do pool
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar categoria:', err);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});


// Delete
app.delete('/deleteCategorias/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const client = await pool.connect();
    await client.query('DELETE FROM CategoriaMateria WHERE idCategoriaMateria = $1', [id]);
    res.json({ message: 'Categoria excluída com sucesso' });
    client.release();
  } catch (err) {
    console.error('Erro ao excluir categoria:', err);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

//------------------------------------//

// Create 
app.post('/postMaterias', authenticateToken, async (req, res) => {
  try {
    const { nomeMateria, idCategoriaMateria } = req.body;
    const client = await pool.connect();
    const result = await client.query('INSERT INTO Materia (nomeMateria, idCategoriaMateria) VALUES ($1, $2) RETURNING *', [nomeMateria, idCategoriaMateria]);
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao inserir matéria:', err);
    res.status(500).json({ error: 'Erro ao inserir matéria' });
  }
});

// Read
app.get('/getMaterias', authenticateToken, async (req, res) => {
  try {
    const { idMateria, nomeMateria, idCategoriaMateria } = req.query;

    let query = 'SELECT * FROM Materia';

    if (idMateria) {
      query += ' WHERE idMateria = $1';
    } else if (nomeMateria) {
      query += ' WHERE nomeMateria ILIKE $1';
    } else if (idCategoriaMateria) {
      query += ' WHERE idCategoriaMateria = $1';
    }

    const client = await pool.connect();
    const result = await client.query(query, [idMateria || nomeMateria || idCategoriaMateria].filter(Boolean));
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Erro ao buscar matérias:', err);
    res.status(500).json({ error: 'Erro ao buscar matérias' });
  }
});

// Update
app.put('/putMaterias/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { nomeMateria, idCategoriaMateria } = req.body;
    
    const client = await pool.connect();
    const result = await client.query('UPDATE Materia SET nomeMateria = $1, idCategoriaMateria = $2 WHERE idMateria = $3 RETURNING *', [nomeMateria, idCategoriaMateria, id]);
    
    res.json(result.rows[0]);
    client.release();
  } catch (err) {
    console.error('Erro ao atualizar matéria:', err);
    res.status(500).json({ error: 'Erro ao atualizar matéria' });
  }
});

// Delete
app.delete('/deleteMaterias/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const client = await pool.connect();
    await client.query('DELETE FROM Materia WHERE idMateria = $1', [id]);
    res.json({ message: 'Matéria excluída com sucesso' });
    client.release();
  } catch (err) {
    console.error('Erro ao excluir matéria:', err);
    res.status(500).json({ error: 'Erro ao excluir matéria' });
  }
});


//------------------------------------//

// Inicie o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});


